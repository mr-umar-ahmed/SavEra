/**
 * Carbon Footprint Analyzer (MASTER_PROMPT §8.14). Pure.
 *
 * Household utilities (electricity, LPG, water) plus lifestyle inputs (commute, diet, flights,
 * shopping) × the emission factors in `data/catalogue/emissionFactors.ts` → annual tCO₂e,
 * a breakdown, per-person comparison with area / city / India averages and "ESG optimisation
 * strategies" ranked by estimated reduction. Every output is an estimate and every strategy is
 * worded "may reduce".
 *
 * Model: diet is a per-person factor and is multiplied by the household size; commute km,
 * flights and shopping are treated as household totals; utilities are the household's own.
 * `perPersonTco2e = tco2e ÷ people`.
 */

import type {
  CarbonBreakdownItem,
  CarbonBreakdownKey,
  CarbonInputs,
  CarbonResult,
  CarbonStrategy,
  ConfidenceLevel,
  EstimateInput,
} from "@/types";
import { COMMUTE_MODE_LABEL, DIET_TYPE_LABEL, SHOPPING_INTENSITY_LABEL } from "@/types";
import {
  CARBON_BREAKDOWN_LABEL,
  CARBON_STRATEGIES,
  EMISSION_FACTORS,
  type EmissionFactors,
} from "@/data/catalogue/emissionFactors";

/** Utility consumption auto-pulled from the other streams (monthly / daily figures). */
export interface CarbonUtilityInputs {
  kwhPerMonth: number;
  lpgKgPerMonth: number;
  litresPerDay: number;
  /** Household size for the diet factor and per-person figure (default 1). */
  people?: number;
}

export type CarbonComputeInput = CarbonInputs & CarbonUtilityInputs;

export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_YEAR = 365;

const BREAKDOWN_ORDER: readonly CarbonBreakdownKey[] = [
  "electricity",
  "lpg",
  "water",
  "commute",
  "diet",
  "flights",
  "shopping",
];

const round = (n: number, decimals = 0): number => {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
};

const nonNeg = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

function confidenceOf(i: CarbonUtilityInputs): ConfidenceLevel {
  const tracked = [i.kwhPerMonth, i.lpgKgPerMonth, i.litresPerDay].filter((v) => nonNeg(v) > 0).length;
  if (tracked === 3) return "High";
  if (tracked >= 1) return "Medium";
  return "Low";
}

/**
 * Rank the strategy catalogue for a household: only categories with emissions are relevant,
 * a strategy cannot remove more than its category emits, and the list is ordered by the
 * midpoint of the estimated reduction (largest first).
 */
export function rankStrategies(
  byKey: Record<CarbonBreakdownKey, number>,
  strategies: CarbonStrategy[] = CARBON_STRATEGIES,
): CarbonStrategy[] {
  return strategies
    .filter((s) => byKey[s.category] > 0.005)
    .map((s) => {
      const cap = byKey[s.category];
      const high = round(Math.min(s.reductionTco2eHigh, cap), 2);
      const low = round(Math.min(s.reductionTco2eLow, high), 2);
      return { ...s, reductionTco2eLow: low, reductionTco2eHigh: high };
    })
    .sort(
      (a, b) =>
        (b.reductionTco2eLow + b.reductionTco2eHigh) / 2 -
          (a.reductionTco2eLow + a.reductionTco2eHigh) / 2 || a.title.localeCompare(b.title),
    );
}

export function computeCarbon(
  i: CarbonComputeInput,
  factors: EmissionFactors = EMISSION_FACTORS,
  strategies: CarbonStrategy[] = CARBON_STRATEGIES,
): CarbonResult {
  const people = Math.max(1, Math.round(i.people ?? 1));
  const kwh = nonNeg(i.kwhPerMonth);
  const lpgKg = nonNeg(i.lpgKgPerMonth);
  const litres = nonNeg(i.litresPerDay);
  const km = nonNeg(i.kmPerWeek);
  const flights = nonNeg(i.flightsPerYear);

  const commuteFactor = factors.commuteKgPerKm[i.commuteMode];
  const dietFactor = factors.dietTco2ePerYear[i.diet];
  const shoppingFactor = factors.shoppingTco2ePerYear[i.shopping];

  const byKey: Record<CarbonBreakdownKey, number> = {
    electricity: (kwh * MONTHS_PER_YEAR * factors.gridKgPerKwh) / 1000,
    lpg: (lpgKg * MONTHS_PER_YEAR * factors.lpgKgPerKg) / 1000,
    water: (litres * DAYS_PER_YEAR * factors.waterKgPerLitre) / 1000,
    commute: (km * factors.weeksPerYear * commuteFactor) / 1000,
    diet: dietFactor * people,
    flights: flights * factors.flightDomesticTco2e,
    shopping: shoppingFactor,
  };

  const total = BREAKDOWN_ORDER.reduce((acc, k) => acc + byKey[k], 0);
  const breakdown: CarbonBreakdownItem[] = BREAKDOWN_ORDER.map((key) => ({
    key,
    label: CARBON_BREAKDOWN_LABEL[key],
    tco2e: round(byKey[key], 2),
    share: total > 0 ? round(byKey[key] / total, 3) : 0,
  }));

  const factorsUsed: EstimateInput[] = [
    { label: "Electricity", value: `${kwh} kWh/month × 12 × ${factors.gridKgPerKwh} kgCO₂/kWh` },
    { label: "LPG", value: `${round(lpgKg, 1)} kg/month × 12 × ${factors.lpgKgPerKg} kgCO₂/kg` },
    {
      label: "Water",
      value: `${round(litres)} L/day × 365 × ${factors.waterKgPerLitre} kgCO₂/L`,
    },
    {
      label: `Commute — ${COMMUTE_MODE_LABEL[i.commuteMode]}`,
      value: `${km} km/week × ${factors.weeksPerYear} weeks × ${commuteFactor} kgCO₂e/km`,
    },
    {
      label: `Diet — ${DIET_TYPE_LABEL[i.diet]}`,
      value: `${dietFactor} tCO₂e per person per year × ${people} ${people === 1 ? "person" : "people"}`,
    },
    {
      label: "Flights",
      value: `${flights} domestic return ${flights === 1 ? "flight" : "flights"} × ${factors.flightDomesticTco2e} tCO₂e`,
    },
    {
      label: `Shopping — ${SHOPPING_INTENSITY_LABEL[i.shopping]}`,
      value: `${shoppingFactor} tCO₂e per year`,
    },
    ...factors.sources,
  ];

  return {
    householdId: i.householdId,
    tco2e: round(total, 2),
    perPersonTco2e: round(total / people, 2),
    breakdown,
    comparison: {
      cityAvgTco2e: factors.averages.city,
      areaAvgTco2e: factors.averages.area,
      indiaAvgTco2e: factors.averages.india,
    },
    strategies: rankStrategies(byKey, strategies),
    factorsUsed,
    confidence: confidenceOf(i),
  };
}
