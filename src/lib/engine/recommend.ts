/**
 * Rule-based recommendations (MASTER_PROMPT §8.9).
 *
 * A rule table keyed by contributor (appliance type / group): action → kWh saving as a
 * range (hours × kW × days, or a share of the line's estimated kWh) → ₹ via the marginal
 * slab at the household's current usage. Ranked by estimated ₹ saving; no-cost habit
 * changes rank ahead of actions that need a purchase (BLDC fans, LED battens). The top
 * item is titled "Your biggest opportunity". Every line says "may reduce" — never a
 * guarantee.
 */

import { DEMO_TARIFF } from "@/data/catalogue/tariff";
import type { Appliance, ApplianceEstimate, ApplianceType, Recommendation, Tariff } from "@/types";
import { marginalRate } from "./tariff";

export const BIGGEST_OPPORTUNITY_TITLE = "Your biggest opportunity";

/** Days per month used for hour-based savings. */
const DAYS = 30;

const roundTo5 = (n: number): number => Math.round(n / 5) * 5;

interface Rule {
  id: string;
  /** Types whose estimates feed this rule (kWh summed). */
  types: ApplianceType[];
  title: string;
  action: string;
  why: (kwh: number, line: ApplianceEstimate) => string;
  /** kWh saving range from the summed kWh and the first (largest) line. */
  saving: (kwh: number, line: ApplianceEstimate, appliance?: Appliance) => { low: number; high: number };
  /** Needs a purchase — ranked after no-cost actions. */
  upgrade?: boolean;
  twinDeviceId?: string;
  twinPatch?: (line: ApplianceEstimate, appliance?: Appliance) => Record<string, number | boolean>;
  applianceType: ApplianceType;
}

const share = (lo: number, hi: number) => (kwh: number) => ({ low: kwh * lo, high: kwh * hi });

const RULES: Rule[] = [
  {
    id: "rec-ac-setpoint",
    types: ["ac"],
    applianceType: "ac",
    title: "AC set-point and sleep mode",
    action: "Raise AC set-point from 24 °C to 26 °C and use sleep mode",
    why: (kwh) =>
      `The air conditioner is your largest estimated load this month (${Math.round(
        kwh,
      )} kWh, estimated). Each degree of set-point may reduce cooling energy by roughly 4–6 %, and sleep mode tapers the compressor overnight.`,
    // ≈ 4–6 % per °C for two degrees plus sleep mode → 16–22 % of AC kWh.
    saving: share(0.16, 0.22),
    twinDeviceId: "ac",
    twinPatch: () => ({ setpointC: 26 }),
  },
  {
    id: "rec-ac-hours",
    types: ["ac"],
    applianceType: "ac",
    title: "One hour less of AC",
    action: "Run the AC 1 hour less per day",
    why: (_kwh, line) =>
      `At an average draw of ${(line.kwAvg ?? 0).toFixed(2)} kW while cooling, one hour less per day may reduce the AC's estimated consumption over the month.`,
    // 1 h × average kW × 30 days; 80–100 % of that (some hours are lighter).
    saving: (_kwh, line) => {
      const perMonth = (line.kwAvg ?? 0) * 1 * DAYS;
      return { low: perMonth * 0.8, high: perMonth };
    },
    twinDeviceId: "ac",
    twinPatch: (_line, appliance) => ({
      hoursPerDay: Math.max(1, (appliance?.hoursPerDay ?? 6) - 1),
    }),
  },
  {
    id: "rec-fan-hours",
    types: ["ceiling_fan", "table_fan"],
    applianceType: "ceiling_fan",
    title: "Fan running hours",
    action: "Switch fans off in empty rooms — about 2 hours less per fan per day",
    why: (kwh) =>
      `Fans are running an estimated ${Math.round(
        kwh,
      )} kWh a month. Two fewer hours per fan per day may reduce this without any purchase.`,
    // 2 h × line kW (all fans) × 30 days; 85–110 % band.
    saving: (_kwh, line) => {
      const perMonth = (line.kwAvg ?? 0) * 2 * DAYS;
      return { low: perMonth * 0.85, high: perMonth * 1.1 };
    },
    twinDeviceId: "fan",
    twinPatch: (_line, appliance) => ({
      hoursPerDay: Math.max(1, (appliance?.hoursPerDay ?? 8) - 2),
    }),
  },
  {
    id: "rec-fan-bldc",
    types: ["ceiling_fan"],
    applianceType: "ceiling_fan",
    title: "BLDC fans",
    action: "Switch to BLDC fans",
    why: (kwh) =>
      `BLDC fans draw roughly 30 W instead of 75 W. Replacing the ceiling fans may reduce their estimated ${Math.round(
        kwh,
      )} kWh a month by half or more. Requires a one-time purchase.`,
    saving: share(0.5, 0.6),
    upgrade: true,
    twinDeviceId: "fan",
    twinPatch: (line) => ({ kw: Math.round((line.kwAvg ?? 0.3) * 0.4 * 1000) / 1000 }),
  },
  {
    id: "rec-geyser-time",
    types: ["geyser"],
    applianceType: "geyser",
    title: "Geyser heating time",
    action: "Reduce geyser heating to 15 minutes per use",
    why: (kwh) =>
      `A storage geyser keeps reheating while it stays on. Limiting each use to about 15 minutes may reduce its estimated ${Math.round(
        kwh,
      )} kWh a month.`,
    saving: share(0.25, 0.35),
    twinDeviceId: "geyser",
    twinPatch: () => ({ hoursPerDay: 0.25 }),
  },
  {
    id: "rec-lighting-led",
    types: ["tube_light", "cfl_bulb"],
    applianceType: "tube_light",
    title: "LED lighting",
    action: "Replace tube lights and CFLs with LED battens and bulbs",
    why: (kwh) =>
      `LED battens draw about half of a fluorescent tube. Replacing the remaining tube lights and CFLs may reduce their estimated ${Math.round(
        kwh,
      )} kWh a month. Requires a one-time purchase.`,
    saving: share(0.4, 0.55),
    upgrade: true,
    twinDeviceId: "lights",
  },
  {
    id: "rec-fridge-seal",
    types: ["fridge"],
    applianceType: "fridge",
    title: "Refrigerator care",
    action: "Check door seals and keep 2–3 cm clearance behind the fridge",
    why: (kwh) =>
      `A tight door seal and airflow behind the unit may reduce the refrigerator's estimated ${Math.round(
        kwh,
      )} kWh a month by a small but steady amount.`,
    saving: share(0.08, 0.12),
  },
  {
    id: "rec-wm-cold",
    types: ["washing_machine"],
    applianceType: "washing_machine",
    title: "Washing machine loads",
    action: "Run full loads on cold wash",
    why: (kwh) =>
      `Fewer, fuller, cold-water loads may reduce the washing machine's estimated ${Math.round(
        kwh,
      )} kWh a month.`,
    saving: share(0.2, 0.3),
  },
  {
    id: "rec-standby",
    types: ["tv", "set_top_box", "speaker"],
    applianceType: "tv",
    title: "Standby loads",
    action: "Switch off standby loads at the socket",
    why: (kwh) =>
      `TVs, set-top boxes and speakers keep drawing power on standby. Switching them off at the socket may reduce their estimated ${Math.round(
        kwh,
      )} kWh a month.`,
    saving: share(0.15, 0.25),
    twinDeviceId: "tv",
  },
  {
    id: "rec-pump-timer",
    types: ["water_pump"],
    applianceType: "water_pump",
    title: "Water pump timer",
    action: "Use a timer for the water pump",
    why: (kwh) =>
      `A timer stops the pump from running once the tank is full and may reduce its estimated ${Math.round(
        kwh,
      )} kWh a month.`,
    saving: share(0.15, 0.25),
  },
];

/**
 * Recommendations for the current month's (reconciled) estimates, ranked by ₹ saving.
 * ₹ uses the marginal slab at the household's current usage (Σ estimates).
 */
export function recommend(
  estimates: ApplianceEstimate[],
  appliances: Appliance[],
  tariff: Tariff = DEMO_TARIFF,
): Recommendation[] {
  const totalKwh = estimates.reduce((s, e) => s + e.kwh, 0);
  const rate = marginalRate(totalKwh, tariff);
  const byId = new Map(appliances.map((a) => [a.id, a]));

  const ranked: { rec: Recommendation; upgrade: boolean; mid: number }[] = [];
  for (const rule of RULES) {
    const lines = estimates
      .filter((e) => rule.types.includes(e.type) && e.kwh > 0)
      .sort((a, b) => b.kwh - a.kwh);
    if (lines.length === 0) continue;
    const kwh = lines.reduce((s, e) => s + e.kwh, 0);
    const line = lines[0];
    const appliance = byId.get(line.applianceId);
    const saving = rule.saving(kwh, line, appliance);
    const kwhLow = Math.max(1, Math.round(saving.low));
    const kwhHigh = Math.max(kwhLow, Math.round(saving.high));
    const rec: Recommendation = {
      id: rule.id,
      applianceType: rule.applianceType,
      title: rule.title,
      action: rule.action,
      why: `${rule.why(kwh, line)} May reduce ${kwhLow}–${kwhHigh} kWh (₹${roundTo5(
        kwhLow * rate,
      )}–${roundTo5(kwhHigh * rate)}) per month — estimated, not guaranteed.`,
      kwhSavingLow: kwhLow,
      kwhSavingHigh: kwhHigh,
      rupeeLow: roundTo5(kwhLow * rate),
      rupeeHigh: roundTo5(kwhHigh * rate),
      twinDeviceId: rule.twinDeviceId,
      twinPatch: rule.twinPatch ? rule.twinPatch(line, appliance) : undefined,
    };
    ranked.push({ rec, upgrade: rule.upgrade === true, mid: (rec.rupeeLow + rec.rupeeHigh) / 2 });
  }

  ranked.sort((a, b) => Number(a.upgrade) - Number(b.upgrade) || b.mid - a.mid);
  return ranked.map(({ rec }, index) =>
    index === 0 ? { ...rec, title: BIGGEST_OPPORTUNITY_TITLE } : rec,
  );
}

/** "Raise AC set-point … — may reduce 25–34 kWh (₹195–265) per month." */
export function recommendationSummary(r: Recommendation): string {
  return `${r.action} — may reduce ${r.kwhSavingLow}–${r.kwhSavingHigh} kWh (₹${r.rupeeLow}–${r.rupeeHigh}) per month.`;
}
