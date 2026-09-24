/**
 * Aggregation, status vs baseline, demand forecast and cylinder planning
 * (MASTER_PROMPT §8.13). Pure and anonymised: only aggregate records enter and leave this
 * module — no household id exists on any input or output type.
 *
 *  - Status vs historical baseline: ≤ +5 % normal · +5–15 % higher · > +15 % significantly
 *    higher (LPG wording "Normal / Increasing / High increase" comes from `aggStatusLabel`).
 *  - Demand forecast = linear trend of the last 3–4 points × seasonal factor (default 1).
 *  - Cylinder requirement = ceil(kg ÷ 14.2 × 1.05).
 */

import type {
  AggregateBase,
  AggStatus,
  AreaAggregate,
  CityAggregate,
  Stream,
  Ward,
  WardAggregate,
  Zone,
  ZoneAggregate,
} from "@/types";
import { AGG_STATUS_THRESHOLDS } from "@/data/catalogue/thresholds";

export const CYLINDER_KG = 14.2;
export const CYLINDER_SAFETY_FACTOR = 1.05;
/** Points of history used by the linear trend (last 3–4 months). */
export const FORECAST_POINTS = 4;
/** `areaTrend` is clamped to ±50 % per period so one outlier cannot dominate a forecast. */
export const TREND_CLAMP = 0.5;

const round = (n: number, decimals = 0): number => {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
};

const sum = (xs: number[]): number => xs.reduce((acc, x) => acc + x, 0);

/**
 * 🟢 / 🟡 / 🔴 status of a current value against its historical baseline. The stream does not
 * change the thresholds (only the label wording, see `aggStatusLabel`), so it is accepted for
 * signature parity and ignored.
 */
export function statusVsBaseline(current: number, baseline: number, _stream: Stream): AggStatus {
  if (!(baseline > 0) || !Number.isFinite(current)) return "normal";
  const ratio = round(current / baseline - 1, 6);
  if (ratio > AGG_STATUS_THRESHOLDS.significantlyHigher) return "significantly_higher";
  if (ratio > AGG_STATUS_THRESHOLDS.higher) return "higher";
  return "normal";
}

/** Percent change of `current` vs `baseline` (1 dp); 0 when the baseline is missing. */
export function pctVsBaseline(current: number, baseline: number): number {
  if (!(baseline > 0)) return 0;
  return round(((current - baseline) / baseline) * 100, 1);
}

/** Sum totals and weight averages of several aggregates into one (same stream and month). */
export function combineAggregates(
  items: AggregateBase[],
  template: Pick<AggregateBase, "stream" | "month" | "unit">,
): AggregateBase {
  const totalConsumption = round(sum(items.map((a) => a.totalConsumption)), 2);
  const activeHouseholds = sum(items.map((a) => a.activeHouseholds));
  const totalHouseholds = sum(items.map((a) => a.totalHouseholds));
  const baseline = round(sum(items.map((a) => a.baseline)), 2);
  const demand = round(sum(items.map((a) => a.demand)), 2);
  const forecast = round(sum(items.map((a) => a.forecast)), 2);
  const aboveBaselineHouseholds = sum(items.map((a) => a.aboveBaselineHouseholds));
  const weightBase = sum(items.map((a) => Math.max(0, a.totalConsumption)));
  const trendPct =
    items.length === 0
      ? 0
      : weightBase > 0
        ? sum(items.map((a) => a.trendPct * Math.max(0, a.totalConsumption))) / weightBase
        : sum(items.map((a) => a.trendPct)) / items.length;
  return {
    stream: template.stream,
    month: template.month,
    unit: template.unit,
    totalConsumption,
    activeHouseholds,
    totalHouseholds,
    avgPerHousehold: activeHouseholds > 0 ? round(totalConsumption / activeHouseholds, 1) : 0,
    baseline,
    status: statusVsBaseline(totalConsumption, baseline, template.stream),
    demand,
    forecast,
    aboveBaselineHouseholds,
    trendPct: round(trendPct, 1),
  };
}

/**
 * Roll area aggregates up to wards, zones and the city. Pass the aggregates of ONE stream and
 * month (callers filter); the first record's stream/month/unit label the roll-up. Wards and
 * zones follow the order of `geo`; a ward or zone without any area aggregate is omitted.
 */
export function rollup(
  aggs: AreaAggregate[],
  geo: { wards: Ward[]; zones: Zone[] },
): { wards: WardAggregate[]; zones: ZoneAggregate[]; city: CityAggregate } {
  const template: Pick<AggregateBase, "stream" | "month" | "unit"> = {
    stream: aggs[0]?.stream ?? "water",
    month: aggs[0]?.month ?? "",
    unit: aggs[0]?.unit ?? "L",
  };

  const wardIndex = new Map(geo.wards.map((w, idx) => [w.id, idx]));
  const zoneIndex = new Map(geo.zones.map((z, idx) => [z.id, idx]));
  const orderBy =
    (index: Map<string, number>) =>
    (a: string, b: string): number =>
      (index.get(a) ?? Number.MAX_SAFE_INTEGER) - (index.get(b) ?? Number.MAX_SAFE_INTEGER) ||
      a.localeCompare(b);

  const byWard = new Map<string, AreaAggregate[]>();
  for (const a of aggs) byWard.set(a.wardId, [...(byWard.get(a.wardId) ?? []), a]);
  const wards: WardAggregate[] = [...byWard.keys()].sort(orderBy(wardIndex)).map((wardId) => {
    const areas = byWard.get(wardId) ?? [];
    const ward = geo.wards.find((w) => w.id === wardId);
    return {
      ...combineAggregates(areas, template),
      wardId,
      zoneId: ward?.zoneId ?? areas[0]?.zoneId ?? "",
      areas,
    };
  });

  const byZone = new Map<string, WardAggregate[]>();
  for (const w of wards) byZone.set(w.zoneId, [...(byZone.get(w.zoneId) ?? []), w]);
  const zones: ZoneAggregate[] = [...byZone.keys()].sort(orderBy(zoneIndex)).map((zoneId) => {
    const zoneWards = byZone.get(zoneId) ?? [];
    return { ...combineAggregates(zoneWards, template), zoneId, wards: zoneWards };
  });

  const city: CityAggregate = { ...combineAggregates(zones, template), zones };
  return { wards, zones, city };
}

/** Ordinary least squares over x = 0…n−1. */
export function linearFit(series: number[]): { slope: number; intercept: number } {
  const n = series.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: series[0] };
  const meanX = (n - 1) / 2;
  const meanY = sum(series) / n;
  let num = 0;
  let den = 0;
  series.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: meanY - slope * meanX };
}

/**
 * Next-period demand: linear trend of the last 3–4 points (fewer if that is all there is)
 * × seasonal factor. Never negative; rounded to a whole unit.
 */
export function forecastDemand(series: number[], seasonal = 1): number {
  const pts = series.filter((v) => Number.isFinite(v)).slice(-FORECAST_POINTS);
  if (pts.length === 0) return 0;
  const { slope, intercept } = linearFit(pts);
  const next = intercept + slope * pts.length;
  return Math.round(Math.max(0, next) * seasonal);
}

/** Cylinders needed for `kg` of LPG: ceil(kg ÷ 14.2 × 1.05). */
export function cylinderRequirement(kg: number): number {
  if (!(kg > 0)) return 0;
  return Math.ceil((kg / CYLINDER_KG) * CYLINDER_SAFETY_FACTOR);
}

/**
 * Fractional per-period trend of a series (slope of the last 3–4 points ÷ their mean),
 * clamped to ±50 %. Feeds `forecastKwh`'s `areaTrend` term. 0 with fewer than two points.
 */
export function areaTrend(series: number[]): number {
  const pts = series.filter((v) => Number.isFinite(v)).slice(-FORECAST_POINTS);
  if (pts.length < 2) return 0;
  const mean = sum(pts) / pts.length;
  if (!(mean > 0)) return 0;
  const { slope } = linearFit(pts);
  return round(Math.max(-TREND_CLAMP, Math.min(TREND_CLAMP, slope / mean)), 4);
}
