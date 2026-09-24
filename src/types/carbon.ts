import type { ConfidenceLevel, EstimateInput, IsoDateTime } from "./common";

export type CommuteMode =
  "walk_cycle" | "bus" | "two_wheeler" | "car_petrol" | "car_diesel" | "car_ev" | "auto" | "train";

export type DietType =
  "vegan" | "vegetarian" | "eggetarian" | "non_veg_occasional" | "non_veg_daily";

export type ShoppingIntensity = "low" | "medium" | "high";

/** Lifestyle inputs entered on the Carbon Footprint Analyzer. */
export interface CarbonInputs {
  householdId: string;
  commuteMode: CommuteMode;
  kmPerWeek: number;
  diet: DietType;
  flightsPerYear: number;
  shopping: ShoppingIntensity;
  updatedAt: IsoDateTime;
}

export type CarbonBreakdownKey =
  "electricity" | "lpg" | "water" | "commute" | "diet" | "flights" | "shopping";

export interface CarbonBreakdownItem {
  key: CarbonBreakdownKey;
  label: string;
  /** Annual tCO₂e for this component (estimated). */
  tco2e: number;
  /** Share of the total, 0..1. */
  share: number;
}

/** "ESG optimisation strategy" ranked by estimated reduction. */
export interface CarbonStrategy {
  id: string;
  title: string;
  description: string;
  reductionTco2eLow: number;
  reductionTco2eHigh: number;
  category: CarbonBreakdownKey;
}

/** Output of `computeCarbon` (MASTER_PROMPT §8.14). All values estimated. */
export interface CarbonResult {
  householdId: string;
  /** Annual household tCO₂e. */
  tco2e: number;
  perPersonTco2e: number;
  breakdown: CarbonBreakdownItem[];
  comparison: { cityAvgTco2e: number; areaAvgTco2e: number; indiaAvgTco2e: number };
  strategies: CarbonStrategy[];
  /** Emission factors used, surfaced in "How this is calculated". */
  factorsUsed: EstimateInput[];
  confidence: ConfidenceLevel;
}

export const COMMUTE_MODE_LABEL: Record<CommuteMode, string> = {
  walk_cycle: "Walk / cycle",
  bus: "Bus",
  two_wheeler: "Two-wheeler",
  car_petrol: "Car (petrol)",
  car_diesel: "Car (diesel)",
  car_ev: "Car (electric)",
  auto: "Auto-rickshaw",
  train: "Train / metro",
};

export const DIET_TYPE_LABEL: Record<DietType, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  eggetarian: "Eggetarian",
  non_veg_occasional: "Non-vegetarian (occasional)",
  non_veg_daily: "Non-vegetarian (daily)",
};

export const SHOPPING_INTENSITY_LABEL: Record<ShoppingIntensity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
