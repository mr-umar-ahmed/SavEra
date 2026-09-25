/**
 * LPG demand forecasting and refill windows (MASTER_PROMPT §8.11, §8.13).
 *
 * Pure: no clock, no randomness. Aggregate forecasts use the engine's linear trend of the last
 * 3–4 months (`forecastDemand`) × the LPG seasonal factor of the forecast month, and convert kg
 * to 14.2 kg cylinders with the 5 % safety buffer (`cylinderRequirement`). Every output here is an
 * estimate and is rendered with an `Estimated` chip.
 */

import type { ConfidenceLevel, IsoDate, MonthKey } from "@/types";
import { LPG_SEASON_NOTE, LPG_SEASONAL_FACTORS } from "@/data/catalogue/lpgSeasonality";
import { addDays, parseMonthKey } from "@/lib/dates";
import { cylinderRequirement, forecastDemand } from "./aggregate";

/** Forecast band half-width by confidence (same convention as the electricity forecast). */
export const LPG_FORECAST_BAND: Readonly<Record<ConfidenceLevel, number>> = {
  High: 0.04,
  Medium: 0.07,
  Low: 0.1,
};

/** Refill-date uncertainty in days by confidence. */
export const LPG_REFILL_WINDOW_DAYS: Readonly<Record<ConfidenceLevel, number>> = {
  High: 1,
  Medium: 2,
  Low: 4,
};

export function lpgSeasonalFactor(month: MonthKey): number {
  return LPG_SEASONAL_FACTORS[parseMonthKey(month).month] ?? 1;
}

export function lpgSeasonNote(month: MonthKey): string {
  return LPG_SEASON_NOTE[parseMonthKey(month).month] ?? "seasonal pattern";
}

export interface LpgDemandForecast {
  month: MonthKey;
  /** Point forecast in kg. */
  kg: number;
  low: number;
  high: number;
  cylinders: number;
  cylindersLow: number;
  cylindersHigh: number;
  seasonal: number;
  seasonNote: string;
  /** Point forecast vs the latest month, percent (1 decimal). */
  changePct: number;
  /** Number of months the trend was fitted on. */
  basisMonths: number;
  confidence: ConfidenceLevel;
}

/**
 * Forecast next month's LPG demand from a monthly kg series (oldest → newest; the last value is
 * the current month).
 */
export function forecastLpgDemand(
  series: number[],
  nextMonth: MonthKey,
  confidence: ConfidenceLevel = "Medium",
): LpgDemandForecast {
  const seasonal = lpgSeasonalFactor(nextMonth);
  const kg = forecastDemand(series, seasonal);
  const band = LPG_FORECAST_BAND[confidence];
  const low = Math.round(kg * (1 - band));
  const high = Math.round(kg * (1 + band));
  const latest = series.at(-1) ?? 0;
  const changePct = latest > 0 ? Math.round(((kg - latest) / latest) * 1000) / 10 : 0;
  return {
    month: nextMonth,
    kg,
    low,
    high,
    cylinders: cylinderRequirement(kg),
    cylindersLow: cylinderRequirement(low),
    cylindersHigh: cylinderRequirement(high),
    seasonal,
    seasonNote: lpgSeasonNote(nextMonth),
    changePct,
    basisMonths: Math.min(4, series.filter((v) => Number.isFinite(v)).length),
    confidence,
  };
}

/** Earliest / latest expected refill date around the engine's point estimate. */
export function refillWindow(
  date: IsoDate,
  confidence: ConfidenceLevel,
): { earliest: IsoDate; latest: IsoDate; days: number } {
  const days = LPG_REFILL_WINDOW_DAYS[confidence];
  return { earliest: addDays(date, -days), latest: addDays(date, days), days };
}

/** Share of the cylinder used so far (0–100), from the engine's remaining-kg estimate. */
export function cylinderUsedPct(sizeKg: number, remainingKg: number): number {
  if (!(sizeKg > 0)) return 0;
  const used = Math.min(sizeKg, Math.max(0, sizeKg - remainingKg));
  return Math.round((used / sizeKg) * 100);
}
