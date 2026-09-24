/**
 * Baselines (MASTER_PROMPT §8.2).
 *
 *  Default       blend of appliance estimate (30 %), area average (20 %) and the available
 *                bill (50 %; missing terms redistribute their weight) → ±12 %.
 *  Personalised  ≥ 3 bills: mean ± 1 SD of the last 6 non-anomalous months.
 *  Seasonal      ≥ 6 bills: separate bands for Summer (Mar–Jun), Normal (Jul–Oct) and
 *                Winter (Nov–Feb). Seasonal increases are compared with the seasonal band,
 *                never flagged blindly.
 *
 * Band rules shared by the personalised and seasonal bands:
 *  - The month being evaluated is left out of a seasonal band (a month must not define the
 *    band it is judged against); ids in `excludeIds` (months already flagged anomalous)
 *    are left out of every band.
 *  - High-outlier trimming: with ≥ 3 bills in a season, the highest bill is left out when
 *    it exceeds the median of the season's other bills by more than 10 % — a possible
 *    above-normal month must not inflate the band it is later compared against.
 *  - Minimum half-width 3 % of the mean (identical bills would otherwise give a zero band).
 *  - Presentation tightening: a band wider than ±8 % of its mid is tightened to ±5 %
 *    around the mean so the ×1.15 / ×1.35 anomaly multipliers keep their meaning.
 *
 * H-1024 (demoNow 2026-09-25): Normal band for Sep from Aug 2026 (350) and Oct 2025 (322)
 * after Jul 2026 (372) is trimmed → 322–350 kWh, mid 336.
 */

import { DEFAULT_BASELINE_SPREAD } from "@/data/catalogue/thresholds";
import { SEASON_LABEL, monthLabel, seasonOf } from "@/lib/dates";
import type { Baseline, ConfidenceLevel, ElectricityBill, EstimateInput, MonthKey, Season, SeasonalBaseline } from "@/types";

export const PERSONALIZED_MIN_BILLS = 3;
export const PERSONALIZED_WINDOW = 6;
export const SEASONAL_MIN_BILLS = 6;
export const SEASONAL_MIN_PER_SEASON = 2;
/** Highest bill of a season is trimmed when > median(others) × this. */
export const SEASONAL_HIGH_OUTLIER_RATIO = 1.1;
/** Minimum band half-width as a share of the mean. */
export const MIN_BAND_HALF_WIDTH = 0.03;
/** Bands wider than this (share of mid) are tightened … */
export const PRESENTATION_TIGHTEN_ABOVE = 0.08;
/** … to this half-width. */
export const PRESENTATION_TIGHTENED_HALF_WIDTH = 0.05;

export const SEASON_MONTHS_LABEL: Record<Season, string> = {
  summer: "Mar–Jun",
  normal: "Jul–Oct",
  winter: "Nov–Feb",
};

const SEASONS: Season[] = ["summer", "normal", "winter"];

// ---------------------------------------------------------------------------
// Small stats helpers (not exported to keep the barrel free of generic names)
// ---------------------------------------------------------------------------

function meanOf(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}

function popSd(values: number[]): number {
  if (values.length === 0) return 0;
  const m = meanOf(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** One bill per month (latest record wins), sorted oldest → newest. */
export function uniqueBillsByMonth(bills: ElectricityBill[]): ElectricityBill[] {
  const byMonth = new Map<MonthKey, ElectricityBill>();
  const sorted = [...bills].sort(
    (a, b) => a.month.localeCompare(b.month) || a.billDate.localeCompare(b.billDate),
  );
  for (const b of sorted) byMonth.set(b.month, b);
  return [...byMonth.values()];
}

interface Band {
  low: number;
  high: number;
  mid: number;
  mean: number;
  sd: number;
  tightened: boolean;
}

/** mean ± 1 SD with the minimum-width and presentation-tightening rules. */
function bandFromValues(values: number[]): Band {
  const mean = meanOf(values);
  const sd = popSd(values);
  let half = Math.max(sd, mean * MIN_BAND_HALF_WIDTH);
  let tightened = false;
  if (mean > 0 && half / mean > PRESENTATION_TIGHTEN_ABOVE) {
    half = mean * PRESENTATION_TIGHTENED_HALF_WIDTH;
    tightened = true;
  }
  const low = Math.round(mean - half);
  const high = Math.round(mean + half);
  return { low, high, mid: (low + high) / 2, mean, sd, tightened };
}

function bandConfidence(n: number): ConfidenceLevel {
  return n >= 4 ? "High" : n >= 2 ? "Medium" : "Low";
}

function monthsSpan(bills: ElectricityBill[]): string {
  if (bills.length === 0) return "";
  const first = bills[0].month;
  const last = bills[bills.length - 1].month;
  return first === last ? monthLabel(first) : `${monthLabel(first)} – ${monthLabel(last)}`;
}

// ---------------------------------------------------------------------------
// Default
// ---------------------------------------------------------------------------

export interface DefaultBaselineInput {
  applianceKwh: number;
  areaAvgKwh?: number;
  billKwh?: number;
}

/** Default baseline: 30 % appliance estimate · 20 % area average · 50 % bill → ±12 %. */
export function buildDefaultBaseline(i: DefaultBaselineInput): Baseline {
  const terms: { weight: number; value: number; label: string }[] = [];
  const inputs: EstimateInput[] = [];
  if (Number.isFinite(i.applianceKwh) && i.applianceKwh > 0) {
    terms.push({ weight: 0.3, value: i.applianceKwh, label: "appliance estimate" });
    inputs.push({ label: "Appliance estimate", value: `${Math.round(i.applianceKwh)} kWh (30 %)` });
  }
  if (i.areaAvgKwh !== undefined && Number.isFinite(i.areaAvgKwh) && i.areaAvgKwh > 0) {
    terms.push({ weight: 0.2, value: i.areaAvgKwh, label: "area average" });
    inputs.push({ label: "Area average", value: `${Math.round(i.areaAvgKwh)} kWh (20 %)` });
  }
  if (i.billKwh !== undefined && Number.isFinite(i.billKwh) && i.billKwh > 0) {
    terms.push({ weight: 0.5, value: i.billKwh, label: "bill" });
    inputs.push({ label: "Bill", value: `${Math.round(i.billKwh)} kWh (50 %)` });
  }
  const totalWeight = terms.reduce((s, t) => s + t.weight, 0);
  const mid = totalWeight > 0 ? terms.reduce((s, t) => s + t.weight * t.value, 0) / totalWeight : 0;
  const low = Math.round(mid * (1 - DEFAULT_BASELINE_SPREAD));
  const high = Math.round(mid * (1 + DEFAULT_BASELINE_SPREAD));
  inputs.push({ label: "Range", value: `±${Math.round(DEFAULT_BASELINE_SPREAD * 100)} %` });
  const hasBill = i.billKwh !== undefined && i.billKwh > 0;
  return {
    kind: "default",
    low,
    high,
    mid: (low + high) / 2,
    confidence: hasBill && terms.length === 3 ? "Medium" : "Low",
    inputs,
    billCount: hasBill ? 1 : 0,
    note:
      terms.length === 0
        ? "No data yet — add a bill or appliances to build a baseline"
        : `Default baseline from ${terms.map((t) => t.label).join(", ")} — add ${
            PERSONALIZED_MIN_BILLS
          }+ bills to personalise it`,
  };
}

// ---------------------------------------------------------------------------
// Personalised
// ---------------------------------------------------------------------------

/** Personalised band: mean ± 1 SD of the last 6 non-anomalous months (≥ 3 bills). */
export function buildPersonalizedBaseline(
  bills: ElectricityBill[],
  excludeIds: string[] = [],
): Baseline | null {
  const excluded = new Set(excludeIds);
  const usable = uniqueBillsByMonth(bills.filter((b) => !excluded.has(b.id)));
  const window = usable.slice(-PERSONALIZED_WINDOW);
  if (window.length < PERSONALIZED_MIN_BILLS) return null;
  const band = bandFromValues(window.map((b) => b.kwh));
  const inputs: EstimateInput[] = [
    { label: "Bills used", value: `${window.length} (${monthsSpan(window)})` },
    { label: "Method", value: "mean ± 1 SD" },
  ];
  if (excludeIds.length > 0) {
    inputs.push({ label: "Left out", value: `${excludeIds.length} anomalous month(s)` });
  }
  if (band.tightened) inputs.push({ label: "Range", value: "±5 % (tightened)" });
  return {
    kind: "personalized",
    low: band.low,
    high: band.high,
    mid: band.mid,
    confidence: bandConfidence(window.length),
    inputs,
    billCount: window.length,
    note: `Personalised baseline from your last ${window.length} bills${
      band.tightened ? " (band tightened to ±5 %)" : ""
    }`,
  };
}

// ---------------------------------------------------------------------------
// Seasonal
// ---------------------------------------------------------------------------

export interface SeasonalOptions {
  /** Month being evaluated — left out of its own season's band. */
  excludeMonth?: MonthKey;
  /** Bills already flagged anomalous — left out of every band. */
  excludeIds?: string[];
}

/** Seasonal bands (Summer / Normal / Winter) once ≥ 6 bills exist; null otherwise. */
export function buildSeasonalBaselines(
  bills: ElectricityBill[],
  opts: SeasonalOptions = {},
): SeasonalBaseline[] | null {
  const all = uniqueBillsByMonth(bills);
  if (all.length < SEASONAL_MIN_BILLS) return null;
  const excluded = new Set(opts.excludeIds ?? []);
  const usable = all.filter((b) => !excluded.has(b.id) && b.month !== opts.excludeMonth);

  const bands: SeasonalBaseline[] = [];
  for (const season of SEASONS) {
    let seasonBills = usable.filter((b) => seasonOf(b.month) === season);
    if (seasonBills.length < SEASONAL_MIN_PER_SEASON) continue;

    let trimmed: ElectricityBill | undefined;
    if (seasonBills.length >= 3) {
      const highest = seasonBills.reduce((h, b) => (b.kwh > h.kwh ? b : h), seasonBills[0]);
      const others = seasonBills.filter((b) => b.id !== highest.id).map((b) => b.kwh);
      if (highest.kwh > medianOf(others) * SEASONAL_HIGH_OUTLIER_RATIO) {
        trimmed = highest;
        seasonBills = seasonBills.filter((b) => b.id !== highest.id);
      }
    }

    const band = bandFromValues(seasonBills.map((b) => b.kwh));
    const months = seasonBills.map((b) => b.month);
    const inputs: EstimateInput[] = [
      { label: "Season", value: `${SEASON_LABEL[season]} (${SEASON_MONTHS_LABEL[season]})` },
      {
        label: "Bills in band",
        value: `${seasonBills.length} (${months.map((m) => monthLabel(m)).join(", ")})`,
      },
      { label: "Method", value: "mean ± 1 SD" },
    ];
    if (trimmed) {
      inputs.push({ label: "Left out", value: `${monthLabel(trimmed.month)} (possible above-normal month)` });
    }
    if (band.tightened) inputs.push({ label: "Range", value: "±5 % (tightened)" });

    const noteParts = [`${SEASON_LABEL[season]}-season band from ${seasonBills.length} bills`];
    if (trimmed) noteParts.push(`${monthLabel(trimmed.month)} left out as a possible above-normal month`);
    if (band.tightened) noteParts.push("band tightened to ±5 %");

    bands.push({
      kind: "seasonal",
      season,
      low: band.low,
      high: band.high,
      mid: band.mid,
      confidence: bandConfidence(seasonBills.length),
      inputs,
      billCount: seasonBills.length,
      months,
      note: noteParts.join("; "),
    });
  }
  return bands.length > 0 ? bands : null;
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface SelectBaselineInput {
  bills: ElectricityBill[];
  applianceKwh: number;
  areaAvgKwh?: number;
  /** Month being evaluated. */
  month: MonthKey;
  /** Bills flagged anomalous in a first pass. */
  excludeIds?: string[];
}

/**
 * Seasonal band for the month's season when available (≥ 6 bills), else personalised
 * (≥ 3 bills), else default.
 */
export function selectBaseline(i: SelectBaselineInput): Baseline {
  const season = seasonOf(i.month);
  const seasonal = buildSeasonalBaselines(i.bills, {
    excludeMonth: i.month,
    excludeIds: i.excludeIds,
  });
  const band = seasonal?.find((b) => b.season === season);
  if (band) return band;

  const personalised = buildPersonalizedBaseline(i.bills, i.excludeIds);
  if (personalised) return personalised;

  const unique = uniqueBillsByMonth(i.bills);
  const billForMonth = unique.find((b) => b.month === i.month) ?? unique[unique.length - 1];
  return buildDefaultBaseline({
    applianceKwh: i.applianceKwh,
    areaAvgKwh: i.areaAvgKwh,
    billKwh: billForMonth?.kwh,
  });
}

/** Human label for a baseline kind, e.g. "Personalised baseline (12 bills)". */
export function baselineKindLabel(b: Baseline): string {
  switch (b.kind) {
    case "seasonal":
      return `${SEASON_LABEL[b.season ?? "normal"]}-season baseline (${b.billCount} bills)`;
    case "personalized":
      return `Personalised baseline (${b.billCount} bills)`;
    default:
      return "Default baseline";
  }
}
