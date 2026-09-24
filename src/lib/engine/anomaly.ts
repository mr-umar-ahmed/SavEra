/**
 * Consumption status vs baseline (MASTER_PROMPT §8.6), thresholds from `ANOMALY`:
 *   current > baseline.high × 1.15 → above ("⚠️ Above normal")
 *   current > baseline.high × 1.35 → significantly_above
 *   current < baseline.low × 0.85  → below
 *
 * Contributors are always possibilities. Above-normal statuses always include
 * "Possible electrical issue — further inspection may be required".
 */

import { ANOMALY } from "@/data/catalogue/thresholds";
import type { Baseline, ConsumptionStatus } from "@/types";

export type AnomalyThresholds = { above: number; significantlyAbove: number; below: number };

export const ELECTRICAL_ISSUE_CONTRIBUTOR =
  "Possible electrical issue — further inspection may be required";
export const LOWER_USAGE_CONTRIBUTOR =
  "Lower usage — possibly reduced occupancy or seasonal change";

export const ABOVE_CONTRIBUTORS: readonly string[] = [
  "Higher cooling or heating demand in this period",
  "Longer appliance operating hours",
  "A new or additional appliance in use",
  "Change in occupancy or routine",
  ELECTRICAL_ISSUE_CONTRIBUTOR,
];

export const BELOW_CONTRIBUTORS: readonly string[] = [
  LOWER_USAGE_CONTRIBUTOR,
  "Fewer operating hours for cooling or heating appliances",
  "Days away from home during the billing period",
];

export interface ConsumptionClassification {
  status: ConsumptionStatus;
  contributors: string[];
}

/** Status for `kwh` against a baseline band. Contributors are empty when normal. */
export function classifyConsumption(
  kwh: number,
  baseline: Pick<Baseline, "low" | "high">,
  thresholds: AnomalyThresholds = ANOMALY,
): ConsumptionClassification {
  const value = Number.isFinite(kwh) ? kwh : 0;
  if (baseline.high > 0 && value > baseline.high * thresholds.significantlyAbove) {
    return { status: "significantly_above", contributors: [...ABOVE_CONTRIBUTORS] };
  }
  if (baseline.high > 0 && value > baseline.high * thresholds.above) {
    return { status: "above", contributors: [...ABOVE_CONTRIBUTORS] };
  }
  if (baseline.low > 0 && value < baseline.low * thresholds.below) {
    return { status: "below", contributors: [...BELOW_CONTRIBUTORS] };
  }
  return { status: "normal", contributors: [] };
}

/** kWh at which each status starts, for "above normal when > 403 kWh" style copy. */
export function statusThresholds(
  baseline: Pick<Baseline, "low" | "high">,
  thresholds: AnomalyThresholds = ANOMALY,
): { above: number; significantlyAbove: number; below: number } {
  return {
    above: Math.round(baseline.high * thresholds.above),
    significantlyAbove: Math.round(baseline.high * thresholds.significantlyAbove),
    below: Math.round(baseline.low * thresholds.below),
  };
}

/** True for any status that is not normal. */
export function isAnomalous(status: ConsumptionStatus): boolean {
  return status !== "normal";
}
