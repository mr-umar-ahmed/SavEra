/**
 * Industrial GHG accounting and emission-map classification (MASTER_PROMPT §8.15). Pure.
 * An accounting prototype over simulated feeds — labelled as such in the UI; never a
 * certified inventory.
 *
 *  - Scope 1 = diesel + natural gas + process emissions (direct).
 *  - Scope 2 = purchased electricity.
 *  - Scope 3 = an illustrative value-chain share (20 % of process emissions) so the scope split
 *    is complete; it is labelled "illustrative" in the breakdown.
 *  - Emission-map status: a reading below the elevated threshold is "within applicable limit",
 *    from elevated up to the exceedance threshold is "elevated", at or above it "exceedance";
 *    a unit takes the worst status across PM, SO₂ and NOx.
 */

import type {
  EmissionReadings,
  EmissionStatus,
  EmissionThreshold,
  EmissionThresholds,
  GhgActivity,
  GhgFactors,
  GhgInventory,
  GhgOpportunity,
  GhgScope,
  MonthKey,
} from "@/types";
import { GHG_FACTORS } from "@/data/catalogue/emissionFactors";
import { EMISSION_THRESHOLDS_DEFAULT } from "@/data/catalogue/thresholds";

/** Illustrative Scope 3 share of process emissions (value-chain estimate). */
export const SCOPE3_ILLUSTRATIVE_SHARE = 0.2;

export type GhgBreakdownKey = "diesel" | "naturalGas" | "process" | "electricity" | "valueChain";

export const GHG_BREAKDOWN_LABEL: Record<GhgBreakdownKey, string> = {
  diesel: "Diesel (stationary combustion)",
  naturalGas: "Natural gas",
  process: "Process emissions",
  electricity: "Purchased electricity",
  valueChain: "Value chain (illustrative)",
};

export const GHG_BREAKDOWN_SCOPE: Record<GhgBreakdownKey, GhgScope> = {
  diesel: 1,
  naturalGas: 1,
  process: 1,
  electricity: 2,
  valueChain: 3,
};

const round = (n: number, decimals = 0): number => {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
};

const nonNeg = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

const isBreakdownKey = (key: string): key is GhgBreakdownKey => key in GHG_BREAKDOWN_LABEL;

/** Activity data × factors → tCO₂e by component for one row. */
export function ghgComponents(
  a: GhgActivity,
  factors: GhgFactors = GHG_FACTORS,
): Record<GhgBreakdownKey, number> {
  const process = nonNeg(a.processTonnes) * factors.process;
  return {
    diesel: (nonNeg(a.dieselLitres) * factors.diesel) / 1000,
    naturalGas: (nonNeg(a.naturalGasScm) * factors.naturalGas) / 1000,
    process,
    electricity: (nonNeg(a.electricityKwh) * factors.electricity) / 1000,
    valueChain: process * SCOPE3_ILLUSTRATIVE_SHARE,
  };
}

/** One CO₂e inventory per activity row (unit × month), sorted by unit then month. */
export function computeGhg(activity: GhgActivity[], factors: GhgFactors = GHG_FACTORS): GhgInventory[] {
  return activity
    .map((a): GhgInventory => {
      const c = ghgComponents(a, factors);
      const scope1 = c.diesel + c.naturalGas + c.process;
      const scope2 = c.electricity;
      const scope3 = c.valueChain;
      const keys: GhgBreakdownKey[] = ["diesel", "naturalGas", "process", "electricity", "valueChain"];
      return {
        unitId: a.unitId,
        month: a.month,
        scope1: round(scope1, 2),
        scope2: round(scope2, 2),
        scope3: round(scope3, 2),
        total: round(scope1 + scope2 + scope3, 2),
        breakdown: keys.map((key) => ({
          key,
          label: GHG_BREAKDOWN_LABEL[key],
          co2e: round(c[key], 2),
          scope: GHG_BREAKDOWN_SCOPE[key],
        })),
      };
    })
    .sort((x, y) => x.unitId.localeCompare(y.unitId) || x.month.localeCompare(y.month));
}

/** Status of one pollutant reading against its threshold pair. */
export function classifyPollutant(value: number, t: EmissionThreshold): EmissionStatus {
  if (!Number.isFinite(value)) return "within";
  if (value >= t.exceedance) return "exceedance";
  if (value >= t.elevated) return "elevated";
  return "within";
}

const STATUS_RANK: Record<EmissionStatus, number> = { within: 0, elevated: 1, exceedance: 2 };

/** Worst status across PM, SO₂ and NOx. */
export function classifyEmissions(
  readings: EmissionReadings,
  thresholds: EmissionThresholds = EMISSION_THRESHOLDS_DEFAULT,
): EmissionStatus {
  const statuses: EmissionStatus[] = [
    classifyPollutant(readings.pm, thresholds.pm),
    classifyPollutant(readings.so2, thresholds.so2),
    classifyPollutant(readings.nox, thresholds.nox),
  ];
  return statuses.reduce((worst, s) => (STATUS_RANK[s] > STATUS_RANK[worst] ? s : worst), "within");
}

export interface GhgMonthlyTotal {
  month: MonthKey;
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  /** Number of units contributing to the month. */
  units: number;
}

/** Monthly trend across units (oldest → newest). */
export function ghgMonthlyTotals(inventories: GhgInventory[]): GhgMonthlyTotal[] {
  const byMonth = new Map<MonthKey, GhgMonthlyTotal>();
  for (const inv of inventories) {
    const row = byMonth.get(inv.month) ?? {
      month: inv.month,
      scope1: 0,
      scope2: 0,
      scope3: 0,
      total: 0,
      units: 0,
    };
    row.scope1 += inv.scope1;
    row.scope2 += inv.scope2;
    row.scope3 += inv.scope3;
    row.total += inv.total;
    row.units += 1;
    byMonth.set(inv.month, row);
  }
  return [...byMonth.values()]
    .map((r) => ({
      ...r,
      scope1: round(r.scope1, 2),
      scope2: round(r.scope2, 2),
      scope3: round(r.scope3, 2),
      total: round(r.total, 2),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

interface OpportunityDef {
  id: string;
  title: string;
  description: string;
  /** Which components the reduction share applies to. */
  keys: GhgBreakdownKey[];
  lowShare: number;
  highShare: number;
}

/** Generic reduction levers; shares apply to the annualised emissions of the listed components. */
export const GHG_OPPORTUNITY_DEFS: readonly OpportunityDef[] = [
  {
    id: "ghg-diesel-hybrid",
    title: "Diesel genset → grid/solar hybrid",
    description:
      "Replacing diesel generator hours with grid supply and on-site solar may reduce Scope 1 diesel emissions by 40–60 %.",
    keys: ["diesel"],
    lowShare: 0.4,
    highShare: 0.6,
  },
  {
    id: "ghg-waste-heat",
    title: "Waste heat recovery",
    description:
      "Recovering heat from kilns, furnaces or exhaust streams may reduce process and fuel emissions by 8–15 %.",
    keys: ["process", "naturalGas"],
    lowShare: 0.08,
    highShare: 0.15,
  },
  {
    id: "ghg-boiler-tuneup",
    title: "Boiler tune-up",
    description:
      "Combustion tuning, insulation and steam-trap maintenance may reduce fuel emissions by 3–6 %.",
    keys: ["naturalGas", "diesel"],
    lowShare: 0.03,
    highShare: 0.06,
  },
  {
    id: "ghg-offpeak-shift",
    title: "Shift 20 % of process load to off-peak grid",
    description:
      "Moving flexible process load to off-peak hours, when grid emission intensity is lower, may reduce Scope 2 emissions by 2–4 %.",
    keys: ["electricity"],
    lowShare: 0.02,
    highShare: 0.04,
  },
];

export const GHG_OPPORTUNITY_TOP_N = 4;

/**
 * Top reduction opportunities (tCO₂e per year, estimated) from the latest month of the given
 * inventories — annualised (× 12). With `unitId`, only that unit's rows are used and the
 * opportunities are tagged with it. Levers whose components emit nothing are omitted.
 */
export function ghgOpportunities(inventories: GhgInventory[], unitId?: string): GhgOpportunity[] {
  const rows = unitId ? inventories.filter((inv) => inv.unitId === unitId) : inventories;
  if (rows.length === 0) return [];
  const latest = rows.map((r) => r.month).sort().at(-1);
  const annual: Record<GhgBreakdownKey, number> = {
    diesel: 0,
    naturalGas: 0,
    process: 0,
    electricity: 0,
    valueChain: 0,
  };
  for (const inv of rows.filter((r) => r.month === latest)) {
    for (const b of inv.breakdown) {
      if (isBreakdownKey(b.key)) annual[b.key] += b.co2e * 12;
    }
  }
  return GHG_OPPORTUNITY_DEFS.map((def): GhgOpportunity => {
    const base = def.keys.reduce((acc, k) => acc + annual[k], 0);
    return {
      id: def.id,
      unitId,
      title: def.title,
      description: def.description,
      reductionTco2eLow: round(base * def.lowShare, 1),
      reductionTco2eHigh: round(base * def.highShare, 1),
    };
  })
    .filter((o) => o.reductionTco2eHigh > 0)
    .sort(
      (a, b) =>
        (b.reductionTco2eLow + b.reductionTco2eHigh) / 2 -
          (a.reductionTco2eLow + a.reductionTco2eHigh) / 2 || a.title.localeCompare(b.title),
    )
    .slice(0, GHG_OPPORTUNITY_TOP_N);
}
