/**
 * Explanation templates (MASTER_PROMPT §8.16). Every "why" text in the product comes from
 * these templates; an optional Anthropic provider (lib/explain) may only rephrase them.
 *
 * Wording rules (§2): "possible contributors", "possible cause — further inspection may be
 * required", "possible supply-demand gap", "possible leakage — check for safety",
 * "may reduce". Never "faulty", "leak detected", "broken".
 *
 * `ctx` is a loose record so callers can pass engine outputs directly; each template reads
 * the fields it needs defensively (missing numbers → 0, missing strings → "").
 */

import { formatINR, formatKwh, formatMonth, formatPct } from "@/lib/format";
import { consumptionStatusLabel } from "@/types";
import type { ConsumptionStatus } from "@/types";

export type ExplanationKind =
  | "mom"
  | "anomaly"
  | "forecast"
  | "baseline"
  | "recommendation"
  | "lpg_status"
  | "water_case"
  | "green_score"
  | "carbon"
  | "aggregate_status";

export type ExplanationContext = Record<string, unknown>;

export interface ExplanationProvider {
  explain(kind: ExplanationKind, ctx: ExplanationContext): Promise<string>;
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

function num(ctx: ExplanationContext, key: string, fallback = 0): number {
  const v = ctx[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(ctx: ExplanationContext, key: string, fallback = ""): string {
  const v = ctx[key];
  return typeof v === "string" ? v : fallback;
}

function list(ctx: ExplanationContext, key: string): string[] {
  const v = ctx[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function obj(ctx: ExplanationContext, key: string): ExplanationContext | undefined {
  const v = ctx[key];
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as ExplanationContext) : undefined;
}

function joinPossibilities(items: string[], max = 4): string {
  return items.slice(0, max).join("; ");
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * ctx: prevMonth, currMonth, prevKwh, currKwh, delta, deltaPct,
 *      largestContributor?: { label, delta }, contributors: string[]
 */
function explainMom(ctx: ExplanationContext): string {
  const prevKwh = num(ctx, "prevKwh");
  const currKwh = num(ctx, "currKwh");
  const delta = num(ctx, "delta", currKwh - prevKwh);
  const deltaPct = num(ctx, "deltaPct", prevKwh > 0 ? ((currKwh - prevKwh) / prevKwh) * 100 : 0);
  const prevMonth = str(ctx, "prevMonth");
  const currMonth = str(ctx, "currMonth");
  const largest = obj(ctx, "largestContributor");
  const contributors = list(ctx, "contributors");

  const parts: string[] = [
    `Your consumption moved from ${formatKwh(prevKwh)}${prevMonth ? ` in ${formatMonth(prevMonth)}` : ""} to ${formatKwh(
      currKwh,
    )}${currMonth ? ` in ${formatMonth(currMonth)}` : ""} (${delta > 0 ? "+" : ""}${Math.round(delta)} kWh, ${formatPct(
      deltaPct,
      1,
      true,
    )}).`,
  ];
  if (largest) {
    const d = num(largest, "delta");
    parts.push(
      `The largest estimated contributor is the ${str(largest, "label").toLowerCase()} (${d > 0 ? "+" : ""}${Math.round(
        d,
      )} kWh, estimated).`,
    );
  }
  if (contributors.length > 0) {
    parts.push(`Possible contributors: ${joinPossibilities(contributors)}.`);
  }
  parts.push(
    "These are possible contributors based on your appliance profile and consumption history, not confirmed causes.",
  );
  return parts.join(" ");
}

/** ctx: status, kwh, low, high, contributors: string[], season? */
function explainAnomaly(ctx: ExplanationContext): string {
  const status = str(ctx, "status", "normal") as ConsumptionStatus;
  const kwh = num(ctx, "kwh");
  const low = num(ctx, "low");
  const high = num(ctx, "high");
  const season = str(ctx, "season");
  const band = `${Math.round(low)}–${Math.round(high)} kWh${season ? ` (${season} season band)` : ""}`;
  const contributors = list(ctx, "contributors");

  switch (status) {
    case "normal":
      return `${consumptionStatusLabel(status)} — ${formatKwh(kwh)} is within your baseline band of ${band}. Seasonal changes are compared with the seasonal band, never flagged blindly.`;
    case "below":
      return `${consumptionStatusLabel(status)} — ${formatKwh(kwh)} is below your baseline band of ${band}. Possible contributors: ${joinPossibilities(
        contributors.length > 0 ? contributors : ["Lower usage — possibly reduced occupancy or seasonal change"],
      )}.`;
    default:
      return `${consumptionStatusLabel(status)} — ${formatKwh(kwh)} is above your baseline band of ${band}. Possible contributors: ${joinPossibilities(
        contributors.length > 0
          ? contributors
          : ["Possible electrical issue — further inspection may be required"],
        5,
      )}. These are possibilities, not confirmed causes.`;
  }
}

/** ctx: month, low, point, high, expectedChangePct, drivers: string[], confidence, billLow?, billHigh? */
function explainForecast(ctx: ExplanationContext): string {
  const month = str(ctx, "month");
  const low = num(ctx, "low");
  const high = num(ctx, "high");
  const point = num(ctx, "point", (low + high) / 2);
  const change = num(ctx, "expectedChangePct");
  const drivers = list(ctx, "drivers");
  const confidence = str(ctx, "confidence", "Medium");
  const billLow = num(ctx, "billLow");
  const billHigh = num(ctx, "billHigh");
  const parts = [
    `Next month${month ? ` (${formatMonth(month)})` : ""} is estimated at ${Math.round(low)}–${Math.round(
      high,
    )} kWh (point ${Math.round(point)}, ${formatPct(change, 1, true)} vs this month) at ${confidence} confidence.`,
  ];
  if (drivers.length > 0) parts.push(`Why: ${joinPossibilities(drivers, 5)}.`);
  if (billLow > 0 && billHigh > 0) {
    parts.push(
      `Estimated next bill ${formatINR(billLow)}–${formatINR(billHigh).replace("₹", "")} — actual bill may differ based on tariff, fixed charges, taxes and other billing components.`,
    );
  }
  return parts.join(" ");
}

/** ctx: kind, low, high, season?, billCount, note? */
function explainBaseline(ctx: ExplanationContext): string {
  const kind = str(ctx, "kind", "default");
  const low = num(ctx, "low");
  const high = num(ctx, "high");
  const season = str(ctx, "season");
  const billCount = num(ctx, "billCount");
  const note = str(ctx, "note");
  const band = `${Math.round(low)}–${Math.round(high)} kWh per month`;
  let text: string;
  if (kind === "seasonal") {
    text = `Your ${season ? `${season}-season ` : "seasonal "}baseline is ${band}, built from ${billCount} bills in the same season (mean ± 1 SD). Seasonal increases are compared with this band, never flagged blindly.`;
  } else if (kind === "personalized") {
    text = `Your personalised baseline is ${band}, built from your last ${billCount} bills (mean ± 1 SD of non-anomalous months).`;
  } else {
    text = `Your default baseline is ${band}, blended from your appliance estimate, the area average for households like yours and your available bill (±12 %). Adding more bills personalises it.`;
  }
  return note ? `${text} ${note}.` : text;
}

/** ctx: action, applianceLabel?, kwhSavingLow, kwhSavingHigh, rupeeLow, rupeeHigh, why? */
function explainRecommendation(ctx: ExplanationContext): string {
  const action = str(ctx, "action");
  const label = str(ctx, "applianceLabel");
  const kLow = num(ctx, "kwhSavingLow");
  const kHigh = num(ctx, "kwhSavingHigh");
  const rLow = num(ctx, "rupeeLow");
  const rHigh = num(ctx, "rupeeHigh");
  const why = str(ctx, "why");
  const lead = label ? `${label}: ${action}` : action;
  const impact = `may reduce ${Math.round(kLow)}–${Math.round(kHigh)} kWh (${formatINR(rLow)}–${formatINR(rHigh).replace("₹", "")}) per month`;
  return `${lead} — ${impact}. ${why ? `${why} ` : ""}Estimated from your appliance profile and the demo tariff — actual savings depend on usage and tariff.`.trim();
}

/** ctx: status, currentKgPerDay, typicalKgPerDay, deltaPct, daysUsed, refillDate?, estimatedRemainingDays? */
function explainLpg(ctx: ExplanationContext): string {
  const status = str(ctx, "status", "normal");
  const current = num(ctx, "currentKgPerDay");
  const typical = num(ctx, "typicalKgPerDay");
  const deltaPct = num(ctx, "deltaPct");
  const daysUsed = num(ctx, "daysUsed");
  const refillDate = str(ctx, "refillDate");
  const remaining = num(ctx, "estimatedRemainingDays");
  const rate = `${current.toFixed(2)} kg/day${typical > 0 ? ` against a typical ${typical.toFixed(2)} kg/day` : ""}`;
  const refill = refillDate
    ? ` A refill is estimated around ${refillDate}${remaining > 0 ? ` (about ${Math.round(remaining)} days)` : ""}.`
    : "";
  switch (status) {
    case "higher":
      return `Higher consumption detected — the current cylinder is tracking ${rate} (${formatPct(
        deltaPct,
        0,
        true,
      )}) after ${Math.round(daysUsed)} days. Possible reasons: more cooking or guests, a change in routine, or possible leakage — check for safety (soap-water test on the regulator and hose, keep the valve closed when not in use).${refill}`;
    case "lower":
      return `Lower than typical — the current cylinder is tracking ${rate} (${formatPct(deltaPct, 0, true)}). Possibly fewer meals cooked at home or days away.${refill}`;
    case "insufficient_data":
      return "Not enough cylinder history yet — add the start and finish dates of a finished cylinder to estimate your typical consumption.";
    default:
      return `Normal — the current cylinder is tracking ${rate} after ${Math.round(daysUsed)} days, in line with your usual pattern.${refill}`;
  }
}

/** ctx: areaName, reportCount, severity, sharePct?, plannedWindow? */
function explainWaterCase(ctx: ExplanationContext): string {
  const area = str(ctx, "areaName");
  const reports = num(ctx, "reportCount");
  const severity = str(ctx, "severity", "normal");
  const share = num(ctx, "sharePct");
  const window = str(ctx, "plannedWindow");
  const severityText =
    severity === "high" ? "High" : severity === "moderate" ? "Moderate" : "Normal";
  return `Possible supply-demand gap. Multiple households are reporting lower-than-expected availability compared with the area's planned supply and historical pattern. ${
    reports > 0 ? `${reports} reports${area ? ` from ${area}` : ""}${window ? ` for the ${window} window` : ""}` : area || "This area"
  }${share > 0 ? ` (${Math.round(share)} % of respondents reporting insufficient or no water)` : ""} — severity ${severityText}. Field verification establishes the facts; this is not a confirmed cause.`;
}

/** ctx: total, efficiency: { electricity?, water?, lpg? }, improvement, consistency, rank, prevRank, participants */
function explainGreenScore(ctx: ExplanationContext): string {
  const total = num(ctx, "total");
  const efficiency = obj(ctx, "efficiency") ?? {};
  const improvement = num(ctx, "improvement");
  const consistency = num(ctx, "consistency");
  const rank = num(ctx, "rank");
  const prevRank = num(ctx, "prevRank");
  const participants = num(ctx, "participants");
  const effParts = (["electricity", "water", "lpg"] as const)
    .filter((k) => typeof efficiency[k] === "number")
    .map((k) => `${k === "lpg" ? "LPG" : k} ${Math.round(num(efficiency, k))}`);
  const rankText =
    rank > 0
      ? ` You rank #${rank}${prevRank > 0 ? ` (was #${prevRank})` : ""}${participants > 0 ? ` of ${participants} participating households in your ward` : ""}.`
      : "";
  return `Your Green Score is ${Math.round(total)} / 100. It is normalised per person and home type against peers in your ward, so the lowest consumer does not automatically win: efficiency ${
    effParts.length > 0 ? effParts.join(", ") : "—"
  } (50 % weight), improvement vs your own baseline ${Math.round(improvement)} (30 %), consistency ${Math.round(
    consistency,
  )} (20 %).${rankText}`;
}

/** ctx: tco2e, perPersonTco2e?, topCategory?, topShare?, strategies?: string[] */
function explainCarbon(ctx: ExplanationContext): string {
  const total = num(ctx, "tco2e");
  const perPerson = num(ctx, "perPersonTco2e");
  const top = str(ctx, "topCategory");
  const topShare = num(ctx, "topShare");
  const strategies = list(ctx, "strategies");
  const parts = [
    `Your household's estimated footprint is ${total.toFixed(2)} tCO₂e per year${
      perPerson > 0 ? ` (${perPerson.toFixed(2)} per person)` : ""
    }.`,
  ];
  if (top) {
    parts.push(`The largest share is ${top}${topShare > 0 ? ` at ${Math.round(topShare * 100)} %` : ""}.`);
  }
  if (strategies.length > 0) {
    parts.push(`Strategies that may reduce it: ${joinPossibilities(strategies, 3)}.`);
  }
  parts.push("Estimated with published emission factors — see “How this is calculated”.");
  return parts.join(" ");
}

/** ctx: name, level ('area'|'ward'|'zone'|'city'), stream, status, current, baseline, deltaPct, unit? */
function explainAggregateStatus(ctx: ExplanationContext): string {
  const name = str(ctx, "name", "This area");
  const stream = str(ctx, "stream", "water");
  const status = str(ctx, "status", "normal");
  const current = num(ctx, "current");
  const baseline = num(ctx, "baseline");
  const deltaPct = num(ctx, "deltaPct", baseline > 0 ? ((current - baseline) / baseline) * 100 : 0);
  const unit = str(ctx, "unit", stream === "electricity" ? "kWh" : stream === "lpg" ? "kg" : "L");
  const vs = `${Math.round(current).toLocaleString("en-IN")} ${unit} against a historical baseline of ${Math.round(
    baseline,
  ).toLocaleString("en-IN")} ${unit} (${formatPct(deltaPct, 1, true)})`;
  if (status === "normal") {
    return `${name}: ${stream === "lpg" ? "Normal" : "Normal"} — ${vs}. Aggregated across households; no individual household data is shown.`;
  }
  const label =
    stream === "lpg"
      ? status === "higher"
        ? "Increasing"
        : "High increase"
      : status === "higher"
        ? "Higher than baseline"
        : "Significantly higher";
  const hint =
    stream === "water"
      ? "Possible supply-demand gap — field verification establishes the facts."
      : stream === "lpg"
        ? "Possible contributors: seasonal cooking patterns, more households tracked, or supply timing; not a confirmed cause."
        : "Possible contributors: seasonal cooling demand, longer operating hours or new connections; not a confirmed cause.";
  return `${name}: ${label} — ${vs}. ${hint} Aggregated across households; no individual household data is shown.`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function explain(kind: ExplanationKind, ctx: ExplanationContext): string {
  switch (kind) {
    case "mom":
      return explainMom(ctx);
    case "anomaly":
      return explainAnomaly(ctx);
    case "forecast":
      return explainForecast(ctx);
    case "baseline":
      return explainBaseline(ctx);
    case "recommendation":
      return explainRecommendation(ctx);
    case "lpg_status":
      return explainLpg(ctx);
    case "water_case":
      return explainWaterCase(ctx);
    case "green_score":
      return explainGreenScore(ctx);
    case "carbon":
      return explainCarbon(ctx);
    case "aggregate_status":
      return explainAggregateStatus(ctx);
  }
}

/** Default provider: synchronous templates wrapped in a promise. */
export class RuleBasedProvider implements ExplanationProvider {
  readonly name = "rule-based";

  explain(kind: ExplanationKind, ctx: ExplanationContext): Promise<string> {
    return Promise.resolve(explain(kind, ctx));
  }
}

export const ruleBasedProvider: ExplanationProvider = new RuleBasedProvider();

/** Words the product never uses for causes; used by tests and copy checks. */
export const FORBIDDEN_CAUSE_WORDS: readonly string[] = ["faulty", "leak detected", "broken"];
