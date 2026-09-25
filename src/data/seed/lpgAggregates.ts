/**
 * LPG aggregates for every area, plus 12 months of history (docs/CONTINUATION_PLAN.md Phase 4).
 *
 * Anchors (spec 03 §10–§11, MASTER_PROMPT §6.14–§6.15), made mutually consistent:
 *  - Ward 24 areas: XYZ 4,300 / 4,250 kg · ABC 4,900 / 4,100 (+19.5 %) · DEF 3,950 / 3,900 ·
 *    GHI 4,050 / 3,300 (+22.7 %) → 17,200 kg, 1,240 LPG households, 1,085 active, 63 abnormal.
 *  - City: 56,000 kg this month, 4,120 participating (active) households.
 *  - Ward statuses: 24 Increasing · 18 Normal · 11 Normal · 07 Increasing (§6.15 ward table).
 *  - Zone statuses: Zone 1 Normal · Zone 2 Increasing · Zone 3 High increase (> +15 %).
 *  - Monthly series end at the current month; the engine's trend × seasonal forecast gives
 *    ≈ 60,000 kg / ≈ 4,440 cylinders for the city and ≈ 1,360 cylinders for Ward 24 when the
 *    forecast month is October (festival-season factor 1.035).
 *
 * Only counts and totals — never household ids (MASTER_PROMPT §2.4).
 */

import type { AreaAggregate, Area, MonthKey } from "@/types";
import { addMonths, currentMonth } from "@/lib/dates";
import { statusVsBaseline } from "@/lib/engine/aggregate";
import { forecastLpgDemand } from "@/lib/engine/lpgDemand";
import { AREAS } from "../geo/raichur";

export const LPG_HISTORY_MONTHS = 12;

interface AreaPlan {
  current: number;
  previous: number;
  baseline: number;
  registered: number;
  active: number;
  abnormal: number;
}

interface WardPlan {
  current: number;
  baseline: number;
  registered: number;
  active: number;
  abnormal: number;
}

/** Ward 24 areas — explicit spec anchors. */
const WARD_24_AREAS: Record<string, AreaPlan> = {
  "area-xyz": { current: 4300, previous: 4220, baseline: 4250, registered: 340, active: 300, abnormal: 9 },
  "area-abc": { current: 4900, previous: 4200, baseline: 4100, registered: 310, active: 278, abnormal: 27 },
  "area-def": { current: 3950, previous: 3880, baseline: 3900, registered: 290, active: 250, abnormal: 6 },
  "area-ghi": { current: 4050, previous: 3700, baseline: 3300, registered: 300, active: 257, abnormal: 21 },
};

/** Other wards — totals chosen so zone / city anchors hold. */
const WARD_PLANS: Record<string, WardPlan> = {
  "ward-03": { current: 5500, baseline: 5480, registered: 470, active: 410, abnormal: 12 },
  "ward-07": { current: 5700, baseline: 5250, registered: 480, active: 420, abnormal: 21 },
  "ward-09": { current: 5800, baseline: 5800, registered: 490, active: 430, abnormal: 13 },
  "ward-11": { current: 5000, baseline: 4900, registered: 455, active: 400, abnormal: 14 },
  "ward-15": { current: 5300, baseline: 4500, registered: 470, active: 410, abnormal: 26 },
  "ward-18": { current: 5600, baseline: 5340, registered: 590, active: 520, abnormal: 17 },
  "ward-21": { current: 5900, baseline: 4000, registered: 505, active: 445, abnormal: 38 },
};

/** City monthly series (oldest → current), kg. Last four: 50k · 53k · 54k · 56k. */
const CITY_SERIES = [
  47000, 46200, 45500, 46800, 47900, 48600, 49200, 49600, 50000, 53000, 54000, 56000,
];

/**
 * Ward 24 monthly series (oldest → current), kg. Last four: 14.9k · 15.7k · 16.0k · 17.2k — a dip
 * before them makes the current rise three months long (spec: "trend Increasing (3 months)").
 */
const WARD_24_SERIES = [
  13900, 13700, 13500, 13800, 14100, 14300, 14600, 15000, 14900, 15700, 16000, 17200,
];

const round10 = (n: number): number => Math.round(n / 10) * 10;

/** Split `total` across weights, rounding with `rounder`; the last item absorbs the remainder. */
function splitByWeights(total: number, weights: number[], rounder: (n: number) => number): number[] {
  const sum = weights.reduce((s, w) => s + w, 0) || 1;
  const parts = weights.map((w) => rounder((total * w) / sum));
  const drift = total - parts.reduce((s, p) => s + p, 0);
  parts[parts.length - 1] += drift;
  return parts;
}

/** Small deterministic spread so areas in one ward are not identical (−3 %, 0, +3 %). */
const spread = (i: number): number => 1 + ((i % 3) - 1) * 0.03;

export interface LpgAreaSeriesPoint {
  month: MonthKey;
  kg: number;
}

interface AreaRecord extends AreaPlan {
  area: Area;
  series: number[];
}

function buildAreaRecords(): AreaRecord[] {
  const records: AreaRecord[] = [];
  const otherSeries = CITY_SERIES.map((v, i) => v - WARD_24_SERIES[i]);
  const otherCurrent = otherSeries.at(-1) ?? 1;

  // Ward 24: explicit anchors; months before last month scale by the ward series.
  const w24Areas = AREAS.filter((a) => a.wardId === "ward-24");
  const w24Prev = w24Areas.reduce((s, a) => s + WARD_24_AREAS[a.id].previous, 0);
  const w24Shares = w24Areas.map((a) => WARD_24_AREAS[a.id].previous / w24Prev);
  const w24Older = WARD_24_SERIES.slice(0, -2).map((wardKg) =>
    splitByWeights(wardKg, w24Shares, round10),
  );
  w24Areas.forEach((area, idx) => {
    const plan = WARD_24_AREAS[area.id];
    records.push({
      ...plan,
      area,
      series: [...w24Older.map((split) => split[idx]), plan.previous, plan.current],
    });
  });

  // Other wards: distribute ward totals across areas by household count (with a small spread).
  for (const [wardId, plan] of Object.entries(WARD_PLANS)) {
    const areas = AREAS.filter((a) => a.wardId === wardId);
    const weights = areas.map((a) => a.householdCount);
    const spreadWeights = weights.map((w, i) => w * spread(i));
    const current = splitByWeights(plan.current, spreadWeights, round10);
    const baseline = splitByWeights(plan.baseline, weights, round10);
    const registered = splitByWeights(plan.registered, weights, Math.round);
    const active = splitByWeights(plan.active, weights, Math.round);
    const abnormal = splitByWeights(plan.abnormal, spreadWeights, Math.round);
    const wardSeries = otherSeries.map((v) => (v * plan.current) / otherCurrent);

    areas.forEach((area, idx) => {
      const share = current[idx] / plan.current;
      const series = wardSeries.map((v, m) =>
        m === wardSeries.length - 1 ? current[idx] : round10(v * share),
      );
      records.push({
        area,
        current: current[idx],
        previous: series.at(-2) ?? current[idx],
        baseline: baseline[idx],
        registered: registered[idx],
        active: active[idx],
        abnormal: abnormal[idx],
        series,
      });
    });
  }
  return records;
}

const AREA_RECORDS = buildAreaRecords();

/** Monthly kg series per area for the 12 months ending at `now`'s month. */
export function lpgAreaHistory(now: string): Record<string, LpgAreaSeriesPoint[]> {
  const month = currentMonth(now);
  const out: Record<string, LpgAreaSeriesPoint[]> = {};
  for (const r of AREA_RECORDS) {
    out[r.area.id] = r.series.map((kg, i) => ({
      month: addMonths(month, i - (r.series.length - 1)),
      kg,
    }));
  }
  return out;
}

/** City monthly kg series for the 12 months ending at `now`'s month. */
export function lpgCityHistory(now: string): LpgAreaSeriesPoint[] {
  const month = currentMonth(now);
  return CITY_SERIES.map((kg, i) => ({ month: addMonths(month, i - (CITY_SERIES.length - 1)), kg }));
}

/** LPG `AreaAggregate` rows (unit kg) for every area, for `now`'s month. */
export function seedLpgAreaAggregates(now: string): AreaAggregate[] {
  const month = currentMonth(now);
  const nextMonth = addMonths(month, 1);
  return AREA_RECORDS.map((r) => {
    const forecast = forecastLpgDemand(r.series, nextMonth);
    return {
      areaId: r.area.id,
      wardId: r.area.wardId,
      zoneId: r.area.zoneId,
      stream: "lpg",
      month,
      unit: "kg",
      totalConsumption: r.current,
      baseline: r.baseline,
      activeHouseholds: r.active,
      totalHouseholds: r.registered,
      avgPerHousehold: Math.round((r.current / Math.max(1, r.active)) * 10) / 10,
      status: statusVsBaseline(r.current, r.baseline, "lpg"),
      demand: r.current,
      forecast: forecast.kg,
      aboveBaselineHouseholds: r.abnormal,
      trendPct: Math.round((r.current / Math.max(1, r.previous) - 1) * 1000) / 10,
    };
  });
}
