/**
 * Illustrative impact arithmetic (landing page hero/impact section, onboarding summary).
 *
 * Pure and deterministic. Every figure produced here is an ESTIMATE and must be rendered
 * with an `Estimated · illustrative` label. Anchors come from MASTER_PROMPT §6.1 and
 * docs/spec/01 §3 ("up to 8–12 % household electricity reduction (estimated)",
 * "~5,000 participating households (seeded demo)"), the Ward 24 peer average (340 kWh,
 * spec 02) and the configurable demo tariff (`computeBill`). ₹ savings are slab-aware:
 * bill(kWh) − bill(kWh × (1 − pct)).
 */

import { computeBill } from "./tariff";
import { EMISSION_FACTORS } from "@/data/catalogue/emissionFactors";

export const IMPACT_ANCHORS = {
  /** Estimated household electricity reduction band (%). */
  reductionPctLow: 8,
  reductionPctHigh: 12,
  /** Seeded demo households participating in the Raichur pilot. */
  demoHouseholds: 5000,
  /** Ward 24 peer average monthly consumption (kWh). */
  avgMonthlyKwh: 340,
  /** Grid emission factor (kg CO₂ per kWh), CEA weighted average. */
  gridKgPerKwh: EMISSION_FACTORS.gridKgPerKwh,
} as const;

export interface HouseholdSavings {
  /** Monthly consumption the estimate was built from. */
  monthlyKwh: number;
  /** Estimated monthly bill at that consumption (₹, demo tariff). */
  monthlyBill: number;
  reductionPctLow: number;
  reductionPctHigh: number;
  kwhLow: number;
  kwhHigh: number;
  rupeeLow: number;
  rupeeHigh: number;
  yearlyRupeeLow: number;
  yearlyRupeeHigh: number;
  yearlyKwhLow: number;
  yearlyKwhHigh: number;
  /** Yearly CO₂ avoided (kg). */
  co2KgLow: number;
  co2KgHigh: number;
}

export interface CommunityImpact {
  households: number;
  monthlyKwhPerHousehold: number;
  yearlyKwhLow: number;
  yearlyKwhHigh: number;
  yearlyRupeeLow: number;
  yearlyRupeeHigh: number;
  /** Yearly CO₂ avoided (tonnes). */
  co2TonnesLow: number;
  co2TonnesHigh: number;
}

const clampPositive = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);
const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Estimated savings for one household consuming `monthlyKwh` per month if it reduces
 * consumption by the anchor band (8–12 % by default). Slab-aware ₹ via the demo tariff.
 */
export function householdSavings(
  monthlyKwh: number,
  pctLow: number = IMPACT_ANCHORS.reductionPctLow,
  pctHigh: number = IMPACT_ANCHORS.reductionPctHigh,
): HouseholdSavings {
  const kwh = clampPositive(monthlyKwh);
  const low = Math.min(clampPositive(pctLow), 100);
  const high = Math.max(low, Math.min(clampPositive(pctHigh), 100));
  const bill = computeBill(kwh).total;
  const kwhLow = round1((kwh * low) / 100);
  const kwhHigh = round1((kwh * high) / 100);
  const rupeeLow = Math.max(0, bill - computeBill(kwh - kwhLow).total);
  const rupeeHigh = Math.max(rupeeLow, bill - computeBill(kwh - kwhHigh).total);
  return {
    monthlyKwh: kwh,
    monthlyBill: bill,
    reductionPctLow: low,
    reductionPctHigh: high,
    kwhLow,
    kwhHigh,
    rupeeLow,
    rupeeHigh,
    yearlyRupeeLow: rupeeLow * 12,
    yearlyRupeeHigh: rupeeHigh * 12,
    yearlyKwhLow: Math.round(kwhLow * 12),
    yearlyKwhHigh: Math.round(kwhHigh * 12),
    co2KgLow: Math.round(kwhLow * 12 * IMPACT_ANCHORS.gridKgPerKwh),
    co2KgHigh: Math.round(kwhHigh * 12 * IMPACT_ANCHORS.gridKgPerKwh),
  };
}

/**
 * Inverts the demo tariff: the monthly kWh whose bill is closest to `monthlyBillInr`.
 * `computeBill` is monotonic, so a bounded bisection converges; result is rounded to 1 kWh.
 */
export function kwhFromBill(monthlyBillInr: number): number {
  const target = clampPositive(monthlyBillInr);
  if (target <= computeBill(0).total) return 0;
  let lo = 0;
  let hi = 20_000;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    if (computeBill(mid).total < target) lo = mid;
    else hi = mid;
  }
  return Math.round(hi);
}

/** Savings estimate from a monthly bill amount (₹) instead of kWh. */
export function savingsFromBill(monthlyBillInr: number): HouseholdSavings {
  return householdSavings(kwhFromBill(monthlyBillInr));
}

/**
 * Community-scale estimate: `households` homes at `monthlyKwhPerHousehold` each, all
 * achieving the anchor reduction band. Totals are 12 × the per-household estimate.
 */
export function communityImpact(
  households: number = IMPACT_ANCHORS.demoHouseholds,
  monthlyKwhPerHousehold: number = IMPACT_ANCHORS.avgMonthlyKwh,
): CommunityImpact {
  const n = Math.round(clampPositive(households));
  const per = householdSavings(monthlyKwhPerHousehold);
  const yearlyKwhLow = Math.round(per.yearlyKwhLow * n);
  const yearlyKwhHigh = Math.round(per.yearlyKwhHigh * n);
  return {
    households: n,
    monthlyKwhPerHousehold: per.monthlyKwh,
    yearlyKwhLow,
    yearlyKwhHigh,
    yearlyRupeeLow: per.yearlyRupeeLow * n,
    yearlyRupeeHigh: per.yearlyRupeeHigh * n,
    co2TonnesLow: round1((yearlyKwhLow * IMPACT_ANCHORS.gridKgPerKwh) / 1000),
    co2TonnesHigh: round1((yearlyKwhHigh * IMPACT_ANCHORS.gridKgPerKwh) / 1000),
  };
}

/** Headline figures for the landing hero, computed once from the anchors. */
export const HERO_IMPACT = {
  household: householdSavings(IMPACT_ANCHORS.avgMonthlyKwh),
  community: communityImpact(),
  inputs: [
    { label: "Reduction band", value: `${IMPACT_ANCHORS.reductionPctLow}–${IMPACT_ANCHORS.reductionPctHigh} % (estimated)` },
    { label: "Peer average", value: `${IMPACT_ANCHORS.avgMonthlyKwh} kWh / month` },
    { label: "Households", value: `${IMPACT_ANCHORS.demoHouseholds.toLocaleString("en-IN")} (seeded demo)` },
    { label: "Tariff", value: "Demo tariff — configurable" },
    { label: "Emission factor", value: `${IMPACT_ANCHORS.gridKgPerKwh} kg CO₂ / kWh` },
  ],
} as const;

/**
 * Indian short-scale ₹ label for large sums: `₹1.3 Cr`, `₹12.8 L`, `₹3,120`.
 * Presentation helper for impact figures only (keeps lakh/crore reading natural).
 */
export function formatInrCompact(n: number, decimals = 1): string {
  const v = clampPositive(n);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(decimals)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(decimals)} L`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}
