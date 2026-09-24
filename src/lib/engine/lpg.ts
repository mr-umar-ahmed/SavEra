/**
 * LPG consumption analysis (MASTER_PROMPT §8.11).
 *
 * Pure: no clock, no randomness, no store access — `now` is passed in (`demoNow`).
 * Cylinder dates are measured values; every rate, remaining-day count and refill date derived
 * here is an estimate and is labelled as such by the UI.
 *
 * Rules:
 *  - `kgPerDay = sizeKg / days` per finished cylinder; typical = median over finished cycles.
 *  - The current rate blends the most recent finished cycle with the typical rate (50/50 when
 *    ≥ 2 cycles exist, otherwise the typical rate) — only dates are known for the cylinder in
 *    use, so its own consumption cannot be measured.
 *  - Status is `higher` when the current rate exceeds typical × 1.2 (and `lower` below
 *    typical × 0.8) once the cylinder in use has ≥ 5 elapsed days; before that it is `normal`.
 *  - Refill date = start + round(size ÷ current rate); remaining days = that minus days used.
 *  - Possible reasons are possibilities, never causes: "Possible leakage — check for safety",
 *    never "leak detected".
 */

import type {
  ConfidenceLevel,
  EstimateInput,
  IsoDate,
  LpgAnalysis,
  LpgCycle,
  LpgCylinder,
  LpgStatus,
  Range,
} from "@/types";
import { LPG } from "@/data/catalogue/thresholds";
import { addDays, daysBetween } from "@/lib/dates";

/** Current rate below typical × 0.8 reads as "lower than typical". */
export const LPG_LOWER_FACTOR = 0.8;

/** Typical band: −4 % … +4 % around the median rate (upper bound rounded up). */
export const LPG_TYPICAL_BAND = { low: 0.96, high: 1.04 } as const;

/** Weight of the most recent finished cycle in the blended current rate. */
export const LPG_RECENT_WEIGHT = 0.5;

/** Assumed cylinder life used only when no cylinder has been finished yet. */
export const LPG_ASSUMED_CYCLE_DAYS = 30;

export const LPG_POSSIBLE_REASONS_HIGHER: readonly string[] = [
  "Increased cooking or more people at home",
  "Change in cooking pattern or appliance",
  "Burner efficiency or regulator issue — further inspection may be required",
  "Possible leakage — check for safety",
];

export const LPG_POSSIBLE_REASONS_LOWER: readonly string[] = [
  "Less cooking or fewer people at home",
  "Use of an alternative cooking appliance (induction, microwave)",
];

/** Conservation & safety guidance — safety first. */
export const LPG_GUIDANCE: readonly string[] = [
  "Check for gas smell; if detected, close the regulator, open windows, do not switch electrical appliances, contact your distributor",
  "Inspect the rubber tube and regulator",
  "Use a lid while cooking",
  "Soak grains/pulses before cooking",
  "Use a pressure cooker",
  "Keep burners clean",
  "Match flame to vessel size",
  "Turn off the regulator when not in use",
  "Avoid reheating repeatedly",
  "Get burners serviced yearly",
];

const round = (n: number, decimals = 0): number => {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
};

const ceil2 = (n: number): number => Math.ceil(n * 100 - 1e-9) / 100;

const fmt2 = (n: number): string => round(n, 2).toFixed(2);

/** Median of a numeric list (0 for an empty list). */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Turn a finished cylinder into a cycle (days ≥ 1). */
export function cycleOf(c: LpgCylinder & { finishDate: IsoDate }): LpgCycle {
  const days = Math.max(1, daysBetween(c.startDate, c.finishDate));
  return {
    cylinderId: c.id,
    startDate: c.startDate,
    finishDate: c.finishDate,
    days,
    kgPerDay: round(c.sizeKg / days, 3),
  };
}

/** Typical band around the median rate: lower bound rounded, upper bound rounded up. */
export function typicalRangeOf(typical: number): Range {
  return {
    low: round(typical * LPG_TYPICAL_BAND.low, 2),
    high: ceil2(typical * LPG_TYPICAL_BAND.high),
  };
}

function confidenceOf(cycleCount: number): ConfidenceLevel {
  if (cycleCount >= 3) return "High";
  if (cycleCount >= 1) return "Medium";
  return "Low";
}

function isFinished(c: LpgCylinder): c is LpgCylinder & { finishDate: IsoDate } {
  return typeof c.finishDate === "string" && c.finishDate.length > 0;
}

/**
 * Analyse a household's cylinders as of `now` (`YYYY-MM-DD`). The list may contain finished
 * cylinders and at most one cylinder in use (the latest-started open one is analysed).
 */
export function analyzeLpg(cylinders: LpgCylinder[], now: IsoDate): LpgAnalysis {
  const householdId = cylinders[0]?.householdId ?? "";
  const sorted = [...cylinders].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const finished = sorted.filter(isFinished);
  const cycles = finished
    .map(cycleOf)
    .sort((a, b) => a.finishDate.localeCompare(b.finishDate) || a.startDate.localeCompare(b.startDate));
  const open = sorted.filter((c) => !isFinished(c)).at(-1);

  // Unrounded rates keyed by cylinder id; `cycles` is finish-sorted so the last one is the most recent.
  const rateById = new Map(
    finished.map((c) => [c.id, c.sizeKg / Math.max(1, daysBetween(c.startDate, c.finishDate))]),
  );
  const rates = [...rateById.values()];
  const lastCycle = cycles.at(-1);
  const lastRateExact = lastCycle ? rateById.get(lastCycle.cylinderId) : undefined;

  const typical = rates.length > 0 ? median(rates) : undefined;
  const blended =
    typical === undefined
      ? undefined
      : cycles.length >= 2 && lastRateExact !== undefined
        ? LPG_RECENT_WEIGHT * lastRateExact + (1 - LPG_RECENT_WEIGHT) * typical
        : typical;

  const daysUsed = open ? Math.max(0, daysBetween(open.startDate, now)) : undefined;

  let status: LpgStatus;
  if (typical === undefined || blended === undefined) status = "insufficient_data";
  else if (open && daysUsed !== undefined && daysUsed < LPG.minElapsedDays) status = "normal";
  else if (blended > typical * LPG.abnormalFactor) status = "higher";
  else if (blended < typical * LPG_LOWER_FACTOR) status = "lower";
  else status = "normal";

  const deltaPct =
    typical !== undefined && blended !== undefined && typical > 0
      ? round(((blended - typical) / typical) * 100, 1)
      : undefined;

  const inputs: EstimateInput[] = [{ label: "Finished cylinders", value: String(cycles.length) }];
  if (typical !== undefined) {
    inputs.push({ label: "Typical rate (median)", value: `${fmt2(typical)} kg/day` });
  }
  if (lastCycle && lastRateExact !== undefined) {
    inputs.push({
      label: "Most recent finished cycle",
      value: `${lastCycle.days} days · ${fmt2(lastRateExact)} kg/day`,
    });
  }
  inputs.push({
    label: "Abnormal rule",
    value: `current rate > typical × ${LPG.abnormalFactor} after ≥ ${LPG.minElapsedDays} elapsed days`,
  });

  let current: LpgAnalysis["current"];
  let refill: LpgAnalysis["refill"];
  if (open && daysUsed !== undefined) {
    const rate = blended ?? open.sizeKg / LPG_ASSUMED_CYCLE_DAYS;
    const cycleDays = Math.max(1, Math.round(open.sizeKg / rate));
    const remainingDays = Math.max(0, cycleDays - daysUsed);
    const remainingKg = Math.max(0, open.sizeKg - daysUsed * rate);
    current = {
      cylinderId: open.id,
      sizeKg: open.sizeKg,
      startDate: open.startDate,
      daysUsed,
      projectedKgPerDay: round(rate, 2),
      estimatedRemainingDays: remainingDays,
      estimatedRemainingKg: round(remainingKg, 1),
    };
    inputs.push({
      label: "Current cylinder",
      value: `${open.sizeKg} kg · started ${open.startDate} · ${daysUsed} days used`,
    });

    const n = cycles.length;
    const cylinderWord = n === 1 ? "cylinder" : "cylinders";
    let basis: string;
    if (typical === undefined || blended === undefined) {
      basis = `Based on an assumed ${LPG_ASSUMED_CYCLE_DAYS}-day cylinder (${fmt2(rate)} kg/day) — mark cylinders as finished to personalise this estimate`;
    } else if (fmt2(blended) === fmt2(typical) || lastRateExact === undefined) {
      basis = `Based on your typical usage of ${fmt2(typical)} kg/day over the last ${n} ${cylinderWord}`;
    } else {
      basis = `Based on a blended rate of ${fmt2(blended)} kg/day — recent cylinder ${fmt2(lastRateExact)} kg/day, typical ${fmt2(typical)} kg/day over the last ${n} ${cylinderWord}`;
    }
    refill = {
      date: addDays(open.startDate, Math.max(cycleDays, daysUsed)),
      basis,
      daysFromNow: remainingDays,
    };
  }

  const possibleReasons =
    status === "higher"
      ? [...LPG_POSSIBLE_REASONS_HIGHER]
      : status === "lower"
        ? [...LPG_POSSIBLE_REASONS_LOWER]
        : [];

  return {
    householdId,
    current,
    typicalKgPerDay: typical === undefined ? undefined : round(typical, 2),
    typicalRange: typical === undefined ? undefined : typicalRangeOf(typical),
    typicalDaysPerCylinder:
      cycles.length > 0 ? Math.round(median(cycles.map((c) => c.days))) : undefined,
    currentKgPerDay: blended === undefined ? undefined : round(blended, 2),
    status,
    deltaPct,
    refill,
    cycles,
    possibleReasons,
    guidance: [...LPG_GUIDANCE],
    confidence: confidenceOf(cycles.length),
    inputs,
  };
}
