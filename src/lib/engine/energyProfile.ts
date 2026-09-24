/**
 * Electricity orchestrator used by `useEnergyAnalysis` (ARCHITECTURE §6).
 *
 * For every billed month (plus the current month when it has no bill yet):
 *   estimates (cooling hours seasonally adjusted vs the current month) → reconciliation →
 *   baseline (two passes: months flagged anomalous in pass 1 are left out of the bands in
 *   pass 2) → status (§8.6, thresholds exactly as written) → contributors.
 * Then month-on-month (current vs previous), the next-month forecast (kWh + ₹ under the demo
 * tariff), recommendations and the completeness score.
 *
 * H-1024 at demoNow 2026-09-25: current 390 · previous 350 · +40 (+11.4 %) · AC ≈155 ·
 * Σ estimates ≈368 · unallocated ≈22 · baseline 322–350 (Normal season) · status "normal"
 * (390 < 350 × 1.15 = 402.5, so §8.6 as written does not flag it) · forecast 405–430 kWh ·
 * ₹3,255–3,455 · Medium confidence · completeness 78 %.
 */

import { DEMO_TARIFF, TARIFF_DISCLAIMER } from "@/data/catalogue/tariff";
import { addMonths, currentMonth, monthKey } from "@/lib/dates";
import type {
  Appliance,
  ApplianceType,
  Baseline,
  ConfidenceLevel,
  ElectricityBill,
  EnergyAnalysis,
  Forecast,
  Household,
  MonthKey,
  MonthlyEnergyProfile,
  Tariff,
} from "@/types";
import { classifyConsumption, isAnomalous } from "./anomaly";
import { applianceDetailScore, estimateAppliances, minConfidence, sumEstimates } from "./appliances";
import { buildSeasonalBaselines, selectBaseline, uniqueBillsByMonth } from "./baseline";
import { computeCompleteness } from "./completeness";
import { computeConfidence } from "./confidence";
import { DEFAULT_AREA_TREND, forecastKwh } from "./forecast";
import { compareMonths } from "./mom";
import { recommend } from "./recommend";
import { reconcile } from "./reconcile";
import { computeBill } from "./tariff";

export interface EnergyAnalysisInput {
  household: Household;
  appliances: Appliance[];
  bills: ElectricityBill[];
  /** Area average kWh for the household-size band (default-baseline term). */
  areaAvgKwh?: number;
  /** `demoNow`, YYYY-MM-DD. */
  now: string;
  /** Fractional area trend from aggregates; defaults to `DEFAULT_AREA_TREND`. */
  areaTrend?: number;
  tariff?: Tariff;
}

/** Appliances that existed in `month`: lines added in the current month are excluded from earlier months. */
function appliancesForMonth(appliances: Appliance[], month: MonthKey, current: MonthKey): Appliance[] {
  if (month >= current) return appliances;
  return appliances.filter((a) => !(a.addedAt && monthKey(a.addedAt) === current));
}

function newApplianceTypes(appliances: Appliance[], current: MonthKey): ApplianceType[] {
  return [...new Set(appliances.filter((a) => a.addedAt && monthKey(a.addedAt) === current).map((a) => a.type))];
}

interface MonthDraft {
  month: MonthKey;
  bill?: ElectricityBill;
  actualKwh: number;
  reconciliation: ReturnType<typeof reconcile>;
  rawEstimateKwh: number;
}

export function buildEnergyAnalysis(i: EnergyAnalysisInput): EnergyAnalysis {
  const tariff = i.tariff ?? DEMO_TARIFF;
  const current = currentMonth(i.now);
  const previous = addMonths(current, -1);
  const bills = uniqueBillsByMonth(i.bills);
  const billCount = bills.length;
  const detailScore = applianceDetailScore(i.appliances);
  const confidence = computeConfidence({ billCount, detailScore });
  const areaTrend = i.areaTrend ?? DEFAULT_AREA_TREND;

  // Months to profile: every billed month plus the current month.
  const months = [...new Set([...bills.map((b) => b.month), current])].sort();
  const billByMonth = new Map(bills.map((b) => [b.month, b]));

  const drafts: MonthDraft[] = months.map((month) => {
    const estimates = estimateAppliances(appliancesForMonth(i.appliances, month, current), {
      month,
      referenceMonth: current,
    });
    const rawEstimateKwh = sumEstimates(estimates);
    const bill = billByMonth.get(month);
    const actualKwh = bill ? bill.kwh : rawEstimateKwh;
    return { month, bill, actualKwh, reconciliation: reconcile(actualKwh, estimates), rawEstimateKwh };
  });

  // Pass 1: baselines without exclusions → months flagged anomalous.
  const baselineFor = (d: MonthDraft, excludeIds: string[]): Baseline =>
    selectBaseline({
      bills,
      applianceKwh: d.rawEstimateKwh,
      areaAvgKwh: i.areaAvgKwh,
      month: d.month,
      excludeIds,
    });
  const anomalousIds = drafts
    .filter((d) => d.bill && isAnomalous(classifyConsumption(d.actualKwh, baselineFor(d, [])).status))
    .map((d) => d.bill?.id ?? "");

  // Pass 2: final baselines with anomalous months left out.
  const profiles: MonthlyEnergyProfile[] = drafts.map((d) => {
    const baseline = baselineFor(d, anomalousIds);
    const cappedBaseline: Baseline = {
      ...baseline,
      confidence: minConfidence(baseline.confidence, confidence),
    };
    const { status, contributors } = classifyConsumption(d.actualKwh, baseline);
    return {
      householdId: i.household.id,
      month: d.month,
      actualKwh: d.actualKwh,
      isCurrent: d.month === current,
      estimates: d.reconciliation.estimates,
      reconciliation: d.reconciliation,
      baseline: cappedBaseline,
      status,
      contributors,
      confidence: d.bill ? confidence : minConfidence(confidence, "Medium"),
      bill: d.bill?.amount,
    };
  });

  const currentProfile = profiles.find((p) => p.month === current) as MonthlyEnergyProfile;
  const previousProfile = profiles.find((p) => p.month === previous);

  const mom = previousProfile
    ? compareMonths(
        { month: previous, kwh: previousProfile.actualKwh, estimates: previousProfile.estimates },
        { month: current, kwh: currentProfile.actualKwh, estimates: currentProfile.estimates },
        { newApplianceTypes: newApplianceTypes(i.appliances, current) },
      )
    : undefined;

  // Forecast
  const nextMonth = addMonths(current, 1);
  const last3 = [1, 2, 3]
    .map((n) => billByMonth.get(addMonths(current, -n))?.kwh)
    .filter((v): v is number => v !== undefined);
  const sameMonthLastYear = billByMonth.get(addMonths(nextMonth, -12))?.kwh;
  const kwh = forecastKwh({
    current: currentProfile.actualKwh,
    last3,
    sameMonthLastYear,
    baselineMid: currentProfile.baseline.mid,
    nextMonth,
    areaTrend,
    confidence,
    billCount,
  });
  const forecast: Forecast = {
    ...kwh,
    billLow: computeBill(kwh.low, tariff).total,
    billPoint: computeBill(kwh.point, tariff).total,
    billHigh: computeBill(kwh.high, tariff).total,
    disclaimer: TARIFF_DISCLAIMER,
  };

  const recommendations = recommend(currentProfile.reconciliation.estimates, i.appliances, tariff);

  const completeness = computeCompleteness({
    household: i.household,
    appliances: i.appliances,
    bills,
    hasWaterSetup: i.household.sections.water === "complete" || i.household.water !== undefined,
    hasLpgSetup: i.household.sections.gas === "complete" || i.household.gas !== undefined,
    hasCarbon: i.household.sections.carbon === "complete",
  });

  const seasonal = buildSeasonalBaselines(bills, { excludeMonth: current, excludeIds: anomalousIds });
  const seasonalCapped = seasonal
    ? seasonal.map((b) => ({ ...b, confidence: minConfidence(b.confidence, confidence) as ConfidenceLevel }))
    : null;

  return {
    householdId: i.household.id,
    months: profiles,
    current: currentProfile,
    previous: previousProfile,
    mom,
    forecast,
    recommendations,
    baseline: currentProfile.baseline,
    seasonal: seasonalCapped,
    confidence,
    completeness,
    billCount,
    detailScore,
  };
}
