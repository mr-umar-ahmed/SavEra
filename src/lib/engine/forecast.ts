/**
 * Next-month kWh forecast (MASTER_PROMPT §8.7).
 *
 *   point = (0.5 × current + 0.3 × mean(last 3) + 0.2 × (sameMonthLastYear ?? baselineMid))
 *           × seasonalFactor(next) / seasonalFactor(current) × (1 + areaTrend)
 *
 * `seasonalFactor` is a relative month factor (annual mean ≈ 1), so the ratio next/current
 * is what moves the point. Range half-width by confidence (`FORECAST_SPREAD`): ±4 % High ·
 * ±7 % Medium · ±10 % Low. History-tightened range: with ≥ 9 bills the seasonal pattern is
 * well established and the presented range is tightened to ±3 %.
 *
 * H-1024 (Sep → Oct, 12 bills): (0.5×390 + 0.3×377.3 + 0.2×322) × 1.05/1.03 × 1.10 ≈ 418
 * → 405–430 kWh.
 */

import { FORECAST_SPREAD } from "@/data/catalogue/thresholds";
import { addMonths, monthLabel, monthLong, parseMonthKey } from "@/lib/dates";
import type { ConfidenceLevel, EstimateInput, KwhForecast, MonthKey } from "@/types";

/** Relative consumption by calendar month (index 0 = January). */
export const SEASONAL_FACTOR: readonly number[] = [
  0.9, 0.9, 1.0, 1.12, 1.18, 1.12, 1.02, 1.0, 1.03, 1.05, 0.95, 0.9,
];

/** Default area trend applied when area aggregates are not available. */
export const DEFAULT_AREA_TREND = 0.1;
/** Bills needed for the history-tightened range. */
export const HISTORY_TIGHTEN_MIN_BILLS = 9;
export const HISTORY_TIGHTENED_SPREAD = 0.03;

export const FORECAST_WEIGHTS = { current: 0.5, last3: 0.3, lastYear: 0.2 } as const;

export function seasonalFactor(month: MonthKey): number {
  const { month: m } = parseMonthKey(month);
  return SEASONAL_FACTOR[m - 1] ?? 1;
}

export interface ForecastInput {
  current: number;
  /** kWh of the three months before the current one (any order; may be shorter). */
  last3: number[];
  sameMonthLastYear?: number;
  baselineMid: number;
  nextMonth: MonthKey;
  /** Fractional trend from area aggregates, e.g. 0.1 = +10 %. */
  areaTrend?: number;
  confidence: ConfidenceLevel;
  /** Enables the history-tightened range at ≥ 9. */
  billCount?: number;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
const pct = (n: number): string => `${n > 0 ? "+" : ""}${round1(n * 100)} %`;

export function forecastKwh(i: ForecastInput): KwhForecast {
  const current = Math.max(0, Number.isFinite(i.current) ? i.current : 0);
  const last3 = i.last3.filter((v) => Number.isFinite(v) && v > 0);
  const last3Mean = last3.length > 0 ? last3.reduce((s, v) => s + v, 0) / last3.length : current;
  const lastYearTerm =
    i.sameMonthLastYear !== undefined && i.sameMonthLastYear > 0
      ? i.sameMonthLastYear
      : i.baselineMid > 0
        ? i.baselineMid
        : current;
  const usedLastYear = i.sameMonthLastYear !== undefined && i.sameMonthLastYear > 0;

  const currentMonth = addMonths(i.nextMonth, -1);
  const seasonalRatio = seasonalFactor(i.nextMonth) / seasonalFactor(currentMonth);
  const areaTrend = i.areaTrend ?? DEFAULT_AREA_TREND;

  const weighted =
    FORECAST_WEIGHTS.current * current +
    FORECAST_WEIGHTS.last3 * last3Mean +
    FORECAST_WEIGHTS.lastYear * lastYearTerm;
  const rawPoint = weighted * seasonalRatio * (1 + areaTrend);

  const billCount = i.billCount ?? 0;
  const tightened = billCount >= HISTORY_TIGHTEN_MIN_BILLS;
  const halfWidth = tightened
    ? Math.min(FORECAST_SPREAD[i.confidence], HISTORY_TIGHTENED_SPREAD)
    : FORECAST_SPREAD[i.confidence];

  const point = Math.round(rawPoint);
  const low = Math.round(rawPoint * (1 - halfWidth));
  const high = Math.round(rawPoint * (1 + halfWidth));
  const expectedChangePct = current > 0 ? round1(((rawPoint - current) / current) * 100) : 0;

  const drivers: string[] = [
    `Current month (${Math.round(current)} kWh) carries ${Math.round(FORECAST_WEIGHTS.current * 100)} % of the weight`,
    last3.length > 0
      ? `Last ${last3.length} month${last3.length === 1 ? "" : "s"} averaged ${Math.round(last3Mean)} kWh (${Math.round(
          FORECAST_WEIGHTS.last3 * 100,
        )} %)`
      : "No earlier months yet — current month used in their place",
    usedLastYear
      ? `Same month last year: ${Math.round(lastYearTerm)} kWh (${Math.round(FORECAST_WEIGHTS.lastYear * 100)} %)`
      : `No same-month history — baseline midpoint ${Math.round(lastYearTerm)} kWh used (${Math.round(
          FORECAST_WEIGHTS.lastYear * 100,
        )} %)`,
    `Seasonal factor for ${monthLong(i.nextMonth).split(" ")[0]}: ×${seasonalRatio.toFixed(2)} vs ${
      monthLong(currentMonth).split(" ")[0]
    } (${pct(seasonalRatio - 1)})`,
    `Area consumption trend: ${pct(areaTrend)}`,
  ];

  const inputs: EstimateInput[] = [
    { label: "Current month", value: `${Math.round(current)} kWh` },
    { label: "Last 3 months", value: last3.length > 0 ? `${last3.map((v) => Math.round(v)).join(", ")} kWh` : "—" },
    { label: "Same month last year", value: usedLastYear ? `${Math.round(lastYearTerm)} kWh` : "baseline midpoint" },
    { label: "Seasonal factor", value: `×${seasonalRatio.toFixed(3)}` },
    { label: "Area trend", value: pct(areaTrend) },
    {
      label: "Range",
      value: tightened
        ? `±${Math.round(halfWidth * 100)} % (history-tightened, ${billCount} bills)`
        : `±${Math.round(halfWidth * 100)} % (${i.confidence} confidence)`,
    },
  ];

  return {
    month: i.nextMonth,
    low,
    point,
    high,
    drivers,
    expectedChangePct,
    confidence: i.confidence,
    inputs,
  };
}

/** "Oct 2026: 405–430 kWh (+7.1 %)" style summary. */
export function describeForecast(f: KwhForecast): string {
  return `${monthLabel(f.month)}: ${f.low}–${f.high} kWh (${f.expectedChangePct > 0 ? "+" : ""}${
    f.expectedChangePct
  } %)`;
}
