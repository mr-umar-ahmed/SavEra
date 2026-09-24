/**
 * Emission factors for the Carbon Footprint Analyzer (MASTER_PROMPT §8.14) and the
 * industrial GHG accounting module (§8.15). Every value is a demo constant with its
 * source noted beside it; the UI surfaces them in "How this is calculated".
 *
 * Sources (rounded, indicative — configurable data file, see MASTER_PROMPT §15):
 *  - Grid electricity 0.716 kgCO₂/kWh — CEA "CO₂ Baseline Database for the Indian Power
 *    Sector", weighted average emission factor (v19/v20 range 0.71–0.72).
 *  - LPG 2.98 kgCO₂/kg — IPCC 2006 default for LPG (63.1 tCO₂/TJ × 47.3 MJ/kg).
 *  - Water supply 0.0003 kgCO₂/L (≈0.3 kg per m³) — typical treatment + pumping energy for
 *    Indian municipal supply, converted at the grid factor above.
 *  - Commute factors per passenger-km — India GHG Program / WRI India transport factors,
 *    rounded to demo precision.
 *  - Diet, flights, shopping — lifestyle footprint literature (annual tCO₂e per person or
 *    per item), rounded to demo precision.
 *  - National average ≈ 1.9 tCO₂e per person — Global Carbon Project territorial per-capita
 *    figure for India; city/area averages are demo values around it.
 */

import type {
  CarbonBreakdownKey,
  CarbonStrategy,
  CommuteMode,
  DietType,
  ShoppingIntensity,
} from "@/types/carbon";
import type { GhgFactors } from "@/types/industrial";

/**
 * Household emission factors. Not part of the type contract, so defined here
 * (reported as a local type in the builder report).
 */
export interface EmissionFactors {
  /** kgCO₂ per kWh of grid electricity. */
  gridKgPerKwh: number;
  /** kgCO₂ per kg of LPG burnt. */
  lpgKgPerKg: number;
  /** kgCO₂ per litre of municipal water supplied. */
  waterKgPerLitre: number;
  /** kgCO₂e per passenger-km by commute mode. */
  commuteKgPerKm: Record<CommuteMode, number>;
  /** tCO₂e per person per year by diet category. */
  dietTco2ePerYear: Record<DietType, number>;
  /** tCO₂e per domestic return flight. */
  flightDomesticTco2e: number;
  /** tCO₂e per year by shopping intensity (goods & services). */
  shoppingTco2ePerYear: Record<ShoppingIntensity, number>;
  /** Comparison averages, tCO₂e per person per year. */
  averages: { india: number; city: number; area: number };
  /** Weeks per year used to annualise weekly commute km. */
  weeksPerYear: number;
  /** One-line source notes shown in the "How this is calculated" panel. */
  sources: { label: string; value: string }[];
}

export const EMISSION_FACTORS: EmissionFactors = {
  gridKgPerKwh: 0.716, // CEA baseline database, weighted average
  lpgKgPerKg: 2.98, // IPCC 2006 default for LPG
  waterKgPerLitre: 0.0003, // ≈0.3 kgCO₂ per m³ supplied
  commuteKgPerKm: {
    walk_cycle: 0,
    bus: 0.05,
    two_wheeler: 0.06,
    auto: 0.08,
    car_petrol: 0.17,
    car_diesel: 0.16,
    car_ev: 0.05, // grid-charged, ~0.07 kWh/km × 0.716
    train: 0.02,
  },
  dietTco2ePerYear: {
    vegan: 0.9,
    vegetarian: 1.1,
    eggetarian: 1.3,
    non_veg_occasional: 1.7,
    non_veg_daily: 2.4,
  },
  flightDomesticTco2e: 0.15, // per domestic return flight (~1,000 km each way)
  shoppingTco2ePerYear: {
    low: 0.3,
    medium: 0.7,
    high: 1.4,
  },
  averages: {
    india: 1.9, // Global Carbon Project per-capita, India
    city: 1.6, // demo value for Raichur
    area: 1.7, // demo value for the household's area
  },
  weeksPerYear: 52,
  sources: [
    { label: "Grid electricity", value: "0.716 kgCO₂/kWh — CEA baseline database" },
    { label: "LPG", value: "2.98 kgCO₂/kg — IPCC 2006 default" },
    { label: "Water supply", value: "0.3 kgCO₂ per 1,000 L — treatment and pumping energy" },
    { label: "Commute", value: "0.02–0.17 kgCO₂e per passenger-km by mode" },
    { label: "Diet", value: "0.9–2.4 tCO₂e per person per year by category" },
    { label: "Flights", value: "0.15 tCO₂e per domestic return flight" },
    { label: "Shopping", value: "0.3–1.4 tCO₂e per year by intensity" },
    { label: "Averages", value: "India 1.9 · city 1.6 · area 1.7 tCO₂e per person" },
  ],
};

/** Labels for the carbon breakdown keys, shared by donut and strategy cards. */
export const CARBON_BREAKDOWN_LABEL: Record<CarbonBreakdownKey, string> = {
  electricity: "Electricity",
  lpg: "LPG",
  water: "Water",
  commute: "Commute",
  diet: "Diet",
  flights: "Flights",
  shopping: "Shopping",
};

/**
 * Industrial GHG factors (§8.15). Scope 1: diesel, natural gas, process; Scope 2: electricity.
 *  - Diesel 2.68 kgCO₂/L — IPCC 2006 / DEFRA stationary combustion.
 *  - Electricity 0.716 kgCO₂/kWh — CEA baseline (same as household).
 *  - Natural gas 2.0 kgCO₂/scm — IPCC default (56.1 tCO₂/TJ × ~0.036 GJ/scm).
 *  - Process 0.85 tCO₂/t product — demo value in the range of clinker / steel process emissions.
 */
export const GHG_FACTORS: GhgFactors = {
  diesel: 2.68,
  electricity: 0.716,
  naturalGas: 2.0,
  process: 0.85,
  note:
    "Demo factors — diesel 2.68 kgCO₂/L and natural gas 2.0 kgCO₂/scm (IPCC 2006 defaults), " +
    "grid electricity 0.716 kgCO₂/kWh (CEA baseline), process 0.85 tCO₂ per tonne of product " +
    "(illustrative). Configurable; not a certified inventory.",
};

/**
 * "ESG optimisation strategies" catalogue. Ten strategies keyed by breakdown component with
 * estimated annual reductions (tCO₂e, low–high). The engine ranks them by the household's own
 * breakdown and always words the outcome as "may reduce".
 */
export const CARBON_STRATEGIES: CarbonStrategy[] = [
  {
    id: "cs-ac-setpoint",
    category: "electricity",
    title: "Raise the AC setpoint to 26 °C",
    description:
      "Each degree higher may reduce cooling electricity by 3–5 %. Pair with a ceiling fan to keep comfort.",
    reductionTco2eLow: 0.1,
    reductionTco2eHigh: 0.25,
  },
  {
    id: "cs-led-bldc",
    category: "electricity",
    title: "Switch remaining lights and fans to LED / BLDC",
    description:
      "BLDC fans draw about 30 W instead of 75 W and LED tubes halve lighting load — may reduce 10–15 kWh a month.",
    reductionTco2eLow: 0.08,
    reductionTco2eHigh: 0.15,
  },
  {
    id: "cs-rooftop-solar",
    category: "electricity",
    title: "Explore rooftop solar (1–2 kW)",
    description:
      "A 1 kW system in Raichur may generate 120–140 kWh a month, offsetting a large share of grid electricity.",
    reductionTco2eLow: 0.9,
    reductionTco2eHigh: 1.8,
  },
  {
    id: "cs-lpg-pressure-cooker",
    category: "lpg",
    title: "Use pressure cookers and lids; soak pulses ahead",
    description:
      "Shorter burner time may reduce LPG use by 10–20 % — roughly one cylinder a year for a family of four.",
    reductionTco2eLow: 0.04,
    reductionTco2eHigh: 0.1,
  },
  {
    id: "cs-lpg-induction",
    category: "lpg",
    title: "Move quick cooking to an induction cooktop",
    description:
      "Boiling and reheating on induction shifts load from LPG to grid; net benefit grows if rooftop solar is present.",
    reductionTco2eLow: 0.02,
    reductionTco2eHigh: 0.08,
  },
  {
    id: "cs-water-fixtures",
    category: "water",
    title: "Fit aerators and fix dripping taps",
    description:
      "Low-flow aerators and prompt repairs may reduce household water use by 15–25 % and the pumping energy behind it.",
    reductionTco2eLow: 0.01,
    reductionTco2eHigh: 0.03,
  },
  {
    id: "cs-commute-bus",
    category: "commute",
    title: "Shift two commute days a week to bus or shared transport",
    description:
      "Replacing petrol-car kilometres with bus travel may reduce per-km emissions by roughly 70 %.",
    reductionTco2eLow: 0.15,
    reductionTco2eHigh: 0.45,
  },
  {
    id: "cs-commute-cycle",
    category: "commute",
    title: "Walk or cycle trips under 3 km",
    description:
      "Short two-wheeler trips are the least efficient; walking or cycling them may remove 100–200 kg CO₂e a year.",
    reductionTco2eLow: 0.1,
    reductionTco2eHigh: 0.2,
  },
  {
    id: "cs-diet-plant-days",
    category: "diet",
    title: "Add two plant-based days a week",
    description:
      "Moving from daily to occasional non-vegetarian meals may reduce diet emissions by 0.3–0.7 tCO₂e per person.",
    reductionTco2eLow: 0.3,
    reductionTco2eHigh: 0.7,
  },
  {
    id: "cs-flights-train",
    category: "flights",
    title: "Take the train for one domestic trip a year",
    description:
      "A domestic return flight is roughly 0.15 tCO₂e; replacing it with train travel may reduce emissions by over 0.1 tCO₂e.",
    reductionTco2eLow: 0.1,
    reductionTco2eHigh: 0.15,
  },
  {
    id: "cs-shopping-repair",
    category: "shopping",
    title: "Repair, reuse and buy durable goods",
    description:
      "Extending product life and avoiding impulse purchases may reduce goods-related emissions by 20–40 %.",
    reductionTco2eLow: 0.1,
    reductionTco2eHigh: 0.4,
  },
];
