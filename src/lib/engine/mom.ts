/**
 * Month-on-month comparison (MASTER_PROMPT §8.5).
 *
 * Delta, %, appliance deltas ranked by |delta|, the "largest estimated contributor" and
 * rule-based possible contributors (season change, new appliance, hours, occupancy,
 * efficiency). Possibilities, never causes.
 */

import { getCatalogueEntry } from "@/data/catalogue/appliances";
import { SEASON_LABEL, seasonOf } from "@/lib/dates";
import type { ApplianceDelta, ApplianceEstimate, ApplianceType, MonthKey, MonthOnMonth } from "@/types";

export interface MonthSnapshot {
  month: MonthKey;
  kwh: number;
  estimates: ApplianceEstimate[];
}

export interface MomContext {
  /** Appliance types added in the current month (labels are looked up in the catalogue). */
  newApplianceTypes?: ApplianceType[];
  hoursChanged?: boolean;
  occupancyChanged?: boolean;
  seasonChanged?: boolean;
}

/** AC / cooling delta must exceed this share of the total delta to be named. */
export const COOLING_SHARE_OF_DELTA = 0.1;
/** Below this |%| the months are described as in line with each other. */
export const IN_LINE_PCT = 2;

export const EFFICIENCY_CONTRIBUTOR =
  "Appliance efficiency or condition — possible cause, further inspection may be required";
export const MOM_FOOTER =
  "These are possible contributors based on your appliance profile and consumption history, not confirmed causes.";

const round1 = (n: number): number => Math.round(n * 10) / 10;

function sumByType(estimates: ApplianceEstimate[]): Map<ApplianceType, { label: string; kwh: number }> {
  const out = new Map<ApplianceType, { label: string; kwh: number }>();
  for (const e of estimates) {
    const cur = out.get(e.type);
    if (cur) {
      cur.kwh += e.kwh;
      // Several lines of one type → use the catalogue label.
      cur.label = getCatalogueEntry(e.type).label;
    } else {
      out.set(e.type, { label: e.label, kwh: e.kwh });
    }
  }
  return out;
}

/** Per-type deltas ranked by |delta| (largest first), ties by current kWh. */
export function applianceDeltas(prev: ApplianceEstimate[], curr: ApplianceEstimate[]): ApplianceDelta[] {
  const p = sumByType(prev);
  const c = sumByType(curr);
  const types = new Set<ApplianceType>([...p.keys(), ...c.keys()]);
  const rows: ApplianceDelta[] = [];
  for (const type of types) {
    const pv = p.get(type);
    const cv = c.get(type);
    const prevKwh = round1(pv?.kwh ?? 0);
    const currKwh = round1(cv?.kwh ?? 0);
    rows.push({
      type,
      label: cv?.label ?? pv?.label ?? getCatalogueEntry(type).label,
      prev: prevKwh,
      curr: currKwh,
      delta: round1(currKwh - prevKwh),
    });
  }
  return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.curr - a.curr);
}

function isCooling(type: ApplianceType): boolean {
  return type === "ac" || type === "air_cooler";
}

export function compareMonths(prev: MonthSnapshot, curr: MonthSnapshot, ctx: MomContext = {}): MonthOnMonth {
  const delta = round1(curr.kwh - prev.kwh);
  const deltaPct = prev.kwh > 0 ? round1((delta / prev.kwh) * 100) : 0;
  const deltas = applianceDeltas(prev.estimates, curr.estimates);

  const sign = Math.sign(delta);
  const largest =
    deltas.find((d) => d.delta !== 0 && (sign === 0 || Math.sign(d.delta) === sign)) ??
    deltas.find((d) => d.delta !== 0);
  const largestContributor = largest
    ? { type: largest.type, label: largest.label, delta: largest.delta }
    : undefined;

  const contributors: string[] = [];
  const prevSeason = seasonOf(prev.month);
  const currSeason = seasonOf(curr.month);
  const coolingDelta = round1(deltas.filter((d) => isCooling(d.type)).reduce((s, d) => s + d.delta, 0));

  if (ctx.seasonChanged || prevSeason !== currSeason) {
    contributors.push(
      `Seasonal change — ${SEASON_LABEL[prevSeason].toLowerCase()} to ${SEASON_LABEL[
        currSeason
      ].toLowerCase()} may change cooling or heating demand`,
    );
  }
  if (coolingDelta > 0 && Math.abs(delta) > 0 && coolingDelta > Math.abs(delta) * COOLING_SHARE_OF_DELTA) {
    contributors.push(`Increase in AC / cooling usage (estimated +${Math.round(coolingDelta)} kWh)`);
    contributors.push("Higher cooling demand — warmer days in this period");
  } else if (coolingDelta < 0 && Math.abs(coolingDelta) > Math.abs(delta) * COOLING_SHARE_OF_DELTA) {
    contributors.push(`Lower AC / cooling usage (estimated ${Math.round(coolingDelta)} kWh)`);
  }

  const currTypes = new Set(curr.estimates.map((e) => e.type));
  const prevTypes = new Set(prev.estimates.map((e) => e.type));
  const newTypes = new Set<ApplianceType>(ctx.newApplianceTypes ?? []);
  for (const t of currTypes) if (!prevTypes.has(t)) newTypes.add(t);
  if (newTypes.size > 0) {
    const labels = [...newTypes].map((t) => getCatalogueEntry(t).label.toLowerCase());
    contributors.push(`A new appliance added this month (${labels.join(", ")})`);
  }

  if (Math.abs(deltaPct) < IN_LINE_PCT && !ctx.hoursChanged && !ctx.occupancyChanged) {
    contributors.push("Consumption is in line with last month");
    return { prevMonth: prev.month, currMonth: curr.month, prevKwh: prev.kwh, currKwh: curr.kwh, delta, deltaPct, applianceDeltas: deltas, largestContributor, contributors };
  }

  if (ctx.hoursChanged || delta > 0) {
    contributors.push("Longer appliance operating hours");
  } else if (delta < 0) {
    contributors.push("Shorter appliance operating hours");
  }
  if (ctx.occupancyChanged || Math.abs(deltaPct) >= 5) {
    contributors.push("Change in occupancy or routine");
  }
  if (delta > 0) contributors.push(EFFICIENCY_CONTRIBUTOR);

  return {
    prevMonth: prev.month,
    currMonth: curr.month,
    prevKwh: prev.kwh,
    currKwh: curr.kwh,
    delta,
    deltaPct,
    applianceDeltas: deltas,
    largestContributor,
    contributors,
  };
}
