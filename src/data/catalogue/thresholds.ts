/**
 * Demo thresholds used by the engine and the aggregate/industrial screens.
 * All values are configurable demo constants (MASTER_PROMPT §15) and are labelled as such in the UI.
 */

import type { EmissionThresholds } from "@/types/industrial";

/**
 * Area / ward / zone / city aggregate status vs historical baseline (§8.13).
 * ratio = current ÷ baseline − 1:  ≤ 5 % → normal · 5–15 % → higher · > 15 % → significantly_higher.
 */
export const AGG_STATUS_THRESHOLDS = {
  higher: 0.05,
  significantlyHigher: 0.15,
} as const;

/**
 * Household consumption anomaly bands (§8.6), multiplied against the baseline band:
 *  current > baseline.high × 1.15 → above · > × 1.35 → significantly_above · < baseline.low × 0.85 → below.
 */
export const ANOMALY = {
  above: 1.15,
  significantlyAbove: 1.35,
  below: 0.85,
} as const;

/**
 * LPG abnormal-consumption rule (§8.11): the current cylinder's projected rate is abnormal
 * when it exceeds typical × 1.2 after at least 5 elapsed days.
 */
export const LPG = {
  abnormalFactor: 1.2,
  minElapsedDays: 5,
} as const;

/**
 * Water case grouping and severity (§8.12).
 *  - A case forms when ≥ minReports reports OR ≥ minSharePct % of the area's households report in the same window.
 *  - Severity: > highSharePct % of respondents insufficient/no water → high; moderateSharePct–highSharePct → moderate; else normal.
 */
export const WATER_CASE = {
  minReports: 10,
  minSharePct: 5,
  highSharePct: 30,
  moderateSharePct: 10,
} as const;

/**
 * Default industrial emission thresholds (§8.15), µg/m³ — demo values, labelled "Demo" in the UI.
 * Within applicable limit < elevated ≤ Elevated < exceedance ≤ Exceedance.
 */
export const EMISSION_THRESHOLDS_DEFAULT: EmissionThresholds = {
  pm: { elevated: 100, exceedance: 150 },
  so2: { elevated: 80, exceedance: 120 },
  nox: { elevated: 80, exceedance: 120 },
};

/** Unit label for the emission readings above. */
export const EMISSION_UNIT = "µg/m³";

/**
 * Confidence rule (§8.3):
 *  High   = ≥ highBills bills AND detail ≥ highDetail
 *  Medium = mediumBillsMin–(highBills − 1) bills OR detail ≥ mediumDetail
 *  Low    = otherwise (≤ 1 bill or detail < mediumDetail)
 */
export const CONFIDENCE = {
  highBills: 6,
  highDetail: 0.8,
  mediumBillsMin: 2,
  mediumDetail: 0.5,
} as const;

/** Default baseline band half-width (§8.2 "range ±12 %"). */
export const DEFAULT_BASELINE_SPREAD = 0.12;

/** Forecast range half-width by confidence (§8.7). */
export const FORECAST_SPREAD = {
  High: 0.04,
  Medium: 0.07,
  Low: 0.1,
} as const;
