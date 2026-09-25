/**
 * LPG seasonal demand factors by calendar month (1 = January … 12 = December).
 *
 * Demo values — configurable. Rationale: household cooking gas demand rises in the festival
 * season (Oct–Nov) and in winter (Dec–Feb), and dips in the hottest months (Apr–May) when
 * less hot food is cooked. Applied to the trend forecast in `engine/lpgDemand.ts`
 * (MASTER_PROMPT §8.13: "linear trend of last 3–4 months × seasonal factor").
 */
export const LPG_SEASONAL_FACTORS: Readonly<Record<number, number>> = {
  1: 1.03,
  2: 1.02,
  3: 0.99,
  4: 0.97,
  5: 0.96,
  6: 0.98,
  7: 1.0,
  8: 1.0,
  9: 1.01,
  10: 1.035,
  11: 1.04,
  12: 1.03,
};

/** Label shown next to the seasonal factor in forecast explanations. */
export const LPG_SEASON_NOTE: Readonly<Record<number, string>> = {
  1: "winter cooking demand",
  2: "late-winter cooking demand",
  3: "pre-summer",
  4: "summer dip",
  5: "summer dip",
  6: "monsoon onset",
  7: "monsoon",
  8: "monsoon",
  9: "post-monsoon",
  10: "festival season",
  11: "festival season",
  12: "winter cooking demand",
};
