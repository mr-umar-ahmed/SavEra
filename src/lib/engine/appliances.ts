/**
 * Appliance-level kWh estimation (MASTER_PROMPT §8.1).
 *
 * Catalogue-driven, never constant-wattage:
 *  - duty        kW × dutyFactor × hours/day × days/month × count
 *                AC: input kW by tonnage (AC_BASE_KW), duty by inverter flag (AC_DUTY),
 *                BEE star multiplier, +2 %/yr beyond 5 years.
 *  - continuous  kWh/month by capacity band (fridge) or catalogue default × star × age.
 *  - per-cycle   kWh/cycle × loads/week × 4.3 × count.
 *
 * Unknown fields fall back to catalogue defaults; every fallback is recorded as an
 * assumption and lowers the estimate's confidence. Every estimate lists the inputs it
 * used so the `EstimatedChip` tooltip can show them.
 *
 * Seasonal cooling demand: cooling appliances (AC, air cooler) scale their operating hours
 * by `coolingFactor(month) / coolingFactor(referenceMonth)`. The household answers "hours
 * per day" as of the reference month (the current month), so the current month reproduces
 * the answered hours exactly and earlier months are adjusted by relative cooling demand.
 *
 * Pure: no clock, no randomness, no store access.
 */

import {
  AC_BASE_KW,
  AC_DUTY,
  AGE_PENALTY_FREE_YEARS,
  AGE_PENALTY_PER_YEAR,
  STAR_MULTIPLIER,
  WEEKS_PER_MONTH,
  WM_KWH_PER_CYCLE,
  fridgeBaseKwh,
  getCatalogueEntry,
  tvWattsForInches,
} from "@/data/catalogue/appliances";
import { monthShort, parseMonthKey } from "@/lib/dates";
import type {
  AcTonnage,
  Appliance,
  ApplianceCatalogueEntry,
  ApplianceEstimate,
  ApplianceQuestionKey,
  ConfidenceLevel,
  EstimateInput,
  MonthKey,
  Season,
} from "@/types";

// ---------------------------------------------------------------------------
// Seasonal cooling demand
// ---------------------------------------------------------------------------

/**
 * Relative cooling demand by calendar month (index 0 = January) for a Deccan-plateau city
 * such as Raichur: a hot pre-monsoon peak (Apr–May), a humid but milder monsoon (Jul–Aug),
 * a second warm spell in Sep–Oct and a cool winter. Ratios between months drive the
 * seasonal adjustment of AC / air-cooler operating hours.
 */
export const COOLING_DEMAND_FACTOR: readonly number[] = [
  0.3, 0.45, 0.85, 1.25, 1.4, 1.15, 0.85, 0.8, 1.03, 1.0, 0.55, 0.35,
];

/** Coarse cooling scale by season, used when only a season (not a month) is known. */
export const SEASON_COOLING_SCALE: Record<Season, number> = {
  summer: 1.25,
  normal: 1,
  winter: 0.45,
};

/** Relative cooling demand for a `YYYY-MM` month (see `COOLING_DEMAND_FACTOR`). */
export function coolingFactor(month: MonthKey): number {
  const { month: m } = parseMonthKey(month);
  return COOLING_DEMAND_FACTOR[m - 1] ?? 1;
}

/** Options accepted by `estimateAppliance`. */
export interface EstimateOptions {
  /** Coarse seasonal adjustment when no month is known. */
  season?: Season;
  /** Month being estimated; with `referenceMonth` it scales cooling hours. */
  month?: MonthKey;
  /** Month the household's answers describe (normally the current month). */
  referenceMonth?: MonthKey;
}

/** Multiplier applied to cooling-appliance hours for the given options. */
export function coolingScale(opts: EstimateOptions): number {
  if (opts.month && opts.referenceMonth && opts.month !== opts.referenceMonth) {
    return coolingFactor(opts.month) / coolingFactor(opts.referenceMonth);
  }
  if (!opts.month && opts.season) return SEASON_COOLING_SCALE[opts.season];
  return 1;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** BLDC fans draw roughly 30 W instead of 75 W (catalogue helper text). */
export const BLDC_FAN_WATTS = 30;
/** 1 HP ≈ 750 W input (catalogue helper text). */
export const WATTS_PER_HP = 750;
/** Tonnage assumed when an AC's tonnage is unknown. */
export const DEFAULT_AC_TONNAGE: AcTonnage = 1.5;

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/** Age factor: +2 % per year beyond 5 years (AC and fridge). */
export function ageFactor(ageYears: number | undefined): number {
  if (ageYears === undefined || !Number.isFinite(ageYears)) return 1;
  return 1 + AGE_PENALTY_PER_YEAR * Math.max(0, ageYears - AGE_PENALTY_FREE_YEARS);
}

// ---------------------------------------------------------------------------
// Estimation
// ---------------------------------------------------------------------------

interface Ctx {
  a: Appliance;
  entry: ApplianceCatalogueEntry;
  inputs: EstimateInput[];
  assumptions: string[];
  /** Number of catalogue-default fallbacks used (lowers confidence). */
  fallbacks: number;
}

function assume(ctx: Ctx, text: string): void {
  ctx.assumptions.push(text);
  ctx.fallbacks += 1;
}

function input(ctx: Ctx, label: string, value: string): void {
  ctx.inputs.push({ label, value });
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(round1(n));
}

/** Hours/day and days/month with catalogue fallbacks. */
function schedule(ctx: Ctx): { hours: number; days: number } {
  const { a, entry } = ctx;
  let hours = a.hoursPerDay;
  if (hours === undefined || !Number.isFinite(hours)) {
    hours = entry.defaultHoursPerDay;
    assume(ctx, `Hours per day assumed ${fmt(hours)} (typical for a ${entry.label.toLowerCase()})`);
  }
  let days = a.daysPerMonth;
  if (days === undefined || !Number.isFinite(days)) {
    days = entry.defaultDaysPerMonth;
    assume(ctx, `Days per month assumed ${fmt(days)}`);
  }
  input(ctx, "Hours per day", fmt(hours));
  input(ctx, "Days per month", fmt(days));
  return { hours, days };
}

/** Rated/answered wattage with type-specific fallbacks. Returns watts. */
function wattsFor(ctx: Ctx): number {
  const { a, entry } = ctx;
  const answered = a.spec.watts ?? a.spec.ratedWatts;
  if (answered !== undefined && Number.isFinite(answered) && answered > 0) {
    input(ctx, "Wattage", `${fmt(answered)} W`);
    return answered;
  }
  if (a.type === "tv") {
    const w = tvWattsForInches(a.spec.screenInches);
    if (a.spec.screenInches !== undefined) {
      input(ctx, "Screen size", `${fmt(a.spec.screenInches)}″ → ${w} W`);
    } else {
      assume(ctx, `Wattage assumed ${w} W (screen size unknown)`);
    }
    return w;
  }
  if ((a.type === "ceiling_fan" || a.type === "table_fan") && a.spec.fanType === "bldc") {
    input(ctx, "Fan type", `BLDC → ${BLDC_FAN_WATTS} W`);
    return BLDC_FAN_WATTS;
  }
  if (a.type === "water_pump" && a.spec.pumpHp !== undefined && a.spec.pumpHp > 0) {
    const w = a.spec.pumpHp * WATTS_PER_HP;
    input(ctx, "Motor rating", `${fmt(a.spec.pumpHp)} HP → ${w} W`);
    return w;
  }
  assume(ctx, `Wattage assumed ${entry.defaultWatts} W (catalogue default)`);
  return entry.defaultWatts;
}

/** Star multiplier with an "unknown" fallback. */
function starMultiplier(ctx: Ctx): number {
  const star = ctx.a.spec.star;
  if (star === undefined) {
    assume(ctx, `Star rating unknown — ×${STAR_MULTIPLIER.unknown} applied`);
    return STAR_MULTIPLIER.unknown;
  }
  input(ctx, "Star rating", `${star}★ (×${STAR_MULTIPLIER[star]})`);
  return STAR_MULTIPLIER[star];
}

/** Age factor from the appliance record or its spec. */
function ageMultiplier(ctx: Ctx): number {
  const age = ctx.a.ageYears ?? ctx.a.spec.ageYears;
  const f = ageFactor(age);
  if (age === undefined) {
    ctx.assumptions.push("Age unknown — no age adjustment applied");
  } else {
    input(ctx, "Age", `${fmt(age)} yrs${f > 1 ? ` (×${f.toFixed(2)})` : ""}`);
  }
  return f;
}

/** AC: input kW (efficiency-adjusted) and compressor duty. */
function acPower(ctx: Ctx): { kw: number; duty: number } {
  const { a } = ctx;
  const answered = a.spec.ratedWatts ?? a.spec.watts;
  let baseKw: number;
  if (answered !== undefined && Number.isFinite(answered) && answered > 0) {
    baseKw = answered / 1000;
    input(ctx, "Input power", `${fmt(answered)} W (rated)`);
  } else {
    const tonnage = a.spec.tonnage ?? DEFAULT_AC_TONNAGE;
    if (a.spec.tonnage === undefined) {
      assume(ctx, `Tonnage assumed ${DEFAULT_AC_TONNAGE} T`);
    } else {
      input(ctx, "Tonnage", `${tonnage} T`);
    }
    baseKw = AC_BASE_KW[tonnage];
    input(ctx, "Input power", `${baseKw} kW`);
  }
  if (a.spec.acType) input(ctx, "Type", a.spec.acType === "split" ? "Split" : a.spec.acType);

  let duty: number;
  if (a.spec.inverter === undefined) {
    duty = AC_DUTY.nonInverter;
    assume(ctx, `Inverter unknown — non-inverter duty ${duty} assumed`);
  } else {
    duty = a.spec.inverter ? AC_DUTY.inverter : AC_DUTY.nonInverter;
    input(ctx, "Inverter", a.spec.inverter ? "Yes" : "No");
  }
  input(ctx, "Duty factor", String(duty));
  const star = starMultiplier(ctx);
  const age = ageMultiplier(ctx);
  return { kw: baseKw * star * age, duty };
}

function estimateDuty(ctx: Ctx, count: number, opts: EstimateOptions): { kwh: number; kwAvg: number } {
  const { a, entry } = ctx;
  let kw: number;
  let duty: number;
  if (a.type === "ac") {
    ({ kw, duty } = acPower(ctx));
  } else {
    kw = wattsFor(ctx) / 1000;
    duty = entry.defaultDutyFactor ?? 1;
    if (duty !== 1) input(ctx, "Duty factor", String(duty));
  }
  const { hours, days } = schedule(ctx);
  let effHours = hours;
  if (entry.category === "cooling") {
    const scale = coolingScale(opts);
    if (Math.abs(scale - 1) > 1e-9) {
      effHours = hours * scale;
      const when = opts.month ? ` for ${monthShort(opts.month)}` : opts.season ? ` for ${opts.season}` : "";
      ctx.assumptions.push(
        `Cooling hours scaled ×${scale.toFixed(2)}${when} (seasonal cooling demand)`,
      );
    }
  }
  const kwAvg = kw * duty * count;
  return { kwh: kw * duty * effHours * days * count, kwAvg };
}

function estimateContinuous(ctx: Ctx, count: number): { kwh: number; kwAvg: number } {
  const { a, entry } = ctx;
  let base: number;
  if (a.type === "fridge" || a.type === "freezer") {
    if (a.type === "fridge") {
      base = fridgeBaseKwh(a.spec.capacityLitres);
      if (a.spec.capacityLitres === undefined) {
        assume(ctx, `Capacity assumed 200–300 L (${base} kWh/month at 3★)`);
      } else {
        input(ctx, "Capacity", `${fmt(a.spec.capacityLitres)} L → ${base} kWh/month at 3★`);
      }
    } else {
      base = entry.defaultKwhPerMonth ?? (entry.defaultWatts / 1000) * 24 * 30;
      input(ctx, "Base consumption", `${fmt(base)} kWh/month`);
    }
    if (a.spec.fridgeType) input(ctx, "Type", a.spec.fridgeType.replace("_", " "));
    const star = starMultiplier(ctx);
    const age = ageMultiplier(ctx);
    const kwh = base * star * age * count;
    return { kwh, kwAvg: round3(kwh / (24 * 30)) };
  }
  base = entry.defaultKwhPerMonth ?? (entry.defaultWatts / 1000) * 24 * 30;
  input(ctx, "Base consumption", `${fmt(base)} kWh/month (always on)`);
  const hours = a.hoursPerDay ?? entry.defaultHoursPerDay;
  if (a.hoursPerDay !== undefined && a.hoursPerDay < 24) {
    input(ctx, "Hours per day", fmt(hours));
  }
  const kwh = base * Math.min(1, Math.max(0, hours) / 24) * count;
  return { kwh, kwAvg: round3(kwh / (Math.max(1, hours) * 30)) };
}

function estimatePerCycle(ctx: Ctx, count: number): { kwh: number; kwAvg: number } {
  const { a, entry } = ctx;
  let perCycle: number;
  if (a.type === "washing_machine") {
    const wmType = a.spec.wmType ?? "top_load";
    perCycle = WM_KWH_PER_CYCLE[wmType];
    if (a.spec.wmType === undefined) {
      assume(ctx, `Type assumed top load (${perCycle} kWh per cycle)`);
    } else {
      input(ctx, "Type", `${wmType.replace("_", " ")} → ${perCycle} kWh per cycle`);
    }
    if (a.spec.capacityKg !== undefined) input(ctx, "Capacity", `${fmt(a.spec.capacityKg)} kg`);
  } else {
    perCycle = entry.kwhPerCycle ?? 1;
    input(ctx, "Energy per cycle", `${perCycle} kWh`);
  }
  let loads = a.spec.loadsPerWeek;
  if (loads === undefined || !Number.isFinite(loads)) {
    loads = entry.defaultCyclesPerWeek ?? 3;
    assume(ctx, `Loads per week assumed ${loads}`);
  } else {
    input(ctx, "Loads per week", fmt(loads));
  }
  const kwh = perCycle * loads * WEEKS_PER_MONTH * count;
  return { kwh, kwAvg: round3((entry.defaultWatts / 1000) * count) };
}

/**
 * Estimate one appliance line's monthly kWh. Appliances marked "Set up later" / "Not added"
 * are returned with 0 kWh and Low confidence — they are never guessed.
 */
export function estimateAppliance(a: Appliance, opts: EstimateOptions = {}): ApplianceEstimate {
  const entry = getCatalogueEntry(a.type);
  const ctx: Ctx = { a, entry, inputs: [], assumptions: [], fallbacks: 0 };
  const base = {
    applianceId: a.id,
    type: a.type,
    label: a.label || entry.label,
    category: a.category ?? entry.category,
  };

  if (a.setupStatus === "later" || a.setupStatus === "none") {
    return {
      ...base,
      kwh: 0,
      confidence: "Low",
      inputs: [],
      assumptions: [
        a.setupStatus === "later"
          ? "Set up later — not estimated until details are added"
          : "Not added — no estimate",
      ],
    };
  }

  let count = a.count;
  if (!Number.isFinite(count) || count < 1) {
    count = 1;
    assume(ctx, "Count assumed 1");
  }
  input(ctx, "Count", String(count));

  let result: { kwh: number; kwAvg: number };
  switch (entry.model) {
    case "continuous":
      result = estimateContinuous(ctx, count);
      break;
    case "per-cycle":
      result = estimatePerCycle(ctx, count);
      break;
    default:
      result = estimateDuty(ctx, count, opts);
  }

  const confidence: ConfidenceLevel =
    ctx.fallbacks === 0 && a.setupStatus === "complete" ? "High" : "Medium";

  return {
    ...base,
    kwh: round1(result.kwh),
    kwAvg: round3(result.kwAvg),
    confidence,
    inputs: ctx.inputs,
    assumptions: ctx.assumptions,
  };
}

/** Estimate every appliance line. */
export function estimateAppliances(as: Appliance[], opts: EstimateOptions = {}): ApplianceEstimate[] {
  return as.map((a) => estimateAppliance(a, opts));
}

/** Σ estimated kWh for a set of appliances. */
export function estimateMonthlyKwh(as: Appliance[], opts: EstimateOptions = {}): number {
  return round1(estimateAppliances(as, opts).reduce((sum, e) => sum + e.kwh, 0));
}

/** Σ kWh of already-computed estimates. */
export function sumEstimates(estimates: ApplianceEstimate[]): number {
  return round1(estimates.reduce((sum, e) => sum + e.kwh, 0));
}

// ---------------------------------------------------------------------------
// Grouping (dashboard rows: AC · Fans · Fridge · Lighting · TV · Other)
// ---------------------------------------------------------------------------

export type EstimateGroupKey = "ac" | "fans" | "fridge" | "lighting" | "tv" | "other";

export const ESTIMATE_GROUP_ORDER: EstimateGroupKey[] = ["ac", "fans", "fridge", "lighting", "tv", "other"];

export const ESTIMATE_GROUP_LABEL: Record<EstimateGroupKey, string> = {
  ac: "Air conditioner",
  fans: "Fans",
  fridge: "Refrigerator",
  lighting: "Lighting",
  tv: "Television",
  other: "Other",
};

/** One dashboard bucket of appliance estimates. */
export interface EstimateGroup {
  key: EstimateGroupKey;
  label: string;
  kwh: number;
  estimates: ApplianceEstimate[];
  /** Lowest member confidence. */
  confidence: ConfidenceLevel;
}

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = { Low: 0, Medium: 1, High: 2 };

/** The lower of two confidence levels. */
export function minConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

/** Dashboard bucket for an estimate. */
export function estimateGroupKey(e: Pick<ApplianceEstimate, "type" | "category">): EstimateGroupKey {
  if (e.type === "ac" || e.type === "air_cooler") return "ac";
  if (e.category === "fans_ventilation") return "fans";
  if (e.type === "fridge" || e.type === "freezer") return "fridge";
  if (e.category === "lighting") return "lighting";
  if (e.type === "tv") return "tv";
  return "other";
}

/** Group estimates into the six dashboard buckets (empty buckets are omitted). */
export function groupEstimates(estimates: ApplianceEstimate[]): EstimateGroup[] {
  const groups = new Map<EstimateGroupKey, EstimateGroup>();
  for (const e of estimates) {
    const key = estimateGroupKey(e);
    const g = groups.get(key);
    if (g) {
      g.kwh = round1(g.kwh + e.kwh);
      g.estimates.push(e);
      g.confidence = minConfidence(g.confidence, e.confidence);
    } else {
      groups.set(key, {
        key,
        label: ESTIMATE_GROUP_LABEL[key],
        kwh: e.kwh,
        estimates: [e],
        confidence: e.confidence,
      });
    }
  }
  return ESTIMATE_GROUP_ORDER.filter((k) => groups.has(k)).map((k) => groups.get(k) as EstimateGroup);
}

// ---------------------------------------------------------------------------
// Detail score (§8.3 "appliance detail")
// ---------------------------------------------------------------------------

/** High-load appliances dominate the estimate, so their detail carries more weight. */
export const HIGH_LOAD_DETAIL_WEIGHT = 4;

function questionAnswered(a: Appliance, key: ApplianceQuestionKey): boolean {
  switch (key) {
    case "count":
      return Number.isFinite(a.count) && a.count > 0;
    case "hoursPerDay":
      return a.hoursPerDay !== undefined;
    case "daysPerMonth":
      return a.daysPerMonth !== undefined;
    case "ageYears":
      return a.ageYears !== undefined || a.spec.ageYears !== undefined;
    default:
      return a.spec[key] !== undefined;
  }
}

/** Share of the catalogue's questions answered for one appliance (0..1); 0 when set up later. */
export function applianceDetail(a: Appliance): number {
  if (a.setupStatus === "later" || a.setupStatus === "none") return 0;
  const entry = getCatalogueEntry(a.type);
  if (entry.questions.length === 0) return 1;
  const answered = entry.questions.filter((q) => questionAnswered(a, q.key)).length;
  return answered / entry.questions.length;
}

/** Detail level label for the status checklist. */
export function applianceDetailLevel(a: Appliance): ConfidenceLevel {
  const d = applianceDetail(a);
  return d >= 0.99 ? "High" : d >= 0.5 ? "Medium" : "Low";
}

/**
 * Appliance detail score 0..1: weighted mean of per-appliance detail, high-load appliances
 * (AC, geyser, washing machine, pump, …) weighted ×4. H-1024 → 0.77 (12 bills → Medium).
 */
export function applianceDetailScore(as: Appliance[]): number {
  if (as.length === 0) return 0;
  let weighted = 0;
  let total = 0;
  for (const a of as) {
    const w = getCatalogueEntry(a.type).highLoad ? HIGH_LOAD_DETAIL_WEIGHT : 1;
    weighted += w * applianceDetail(a);
    total += w;
  }
  return total === 0 ? 0 : Math.round((weighted / total) * 1000) / 1000;
}
