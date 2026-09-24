/**
 * Meter reconciliation (MASTER_PROMPT §8.4).
 *
 *   unallocated = actual − Σ estimates
 *
 * When Σ estimates exceeds the metered kWh the estimates are scaled proportionally to the
 * meter reading and the result carries the note "Estimates scaled to meter reading".
 * Estimates are never presented as measurements.
 */

import type { ApplianceEstimate, Reconciliation } from "@/types";

export const RECONCILE_SCALED_NOTE = "Estimates scaled to meter reading";
export const RECONCILE_UNALLOCATED_NOTE =
  "Unallocated units may come from appliances not yet added or usage variations. Estimates are never presented as measurements.";

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function reconcile(actualKwh: number, estimates: ApplianceEstimate[]): Reconciliation {
  const actual = Math.max(0, Number.isFinite(actualKwh) ? actualKwh : 0);
  const estimatedTotal = round1(estimates.reduce((sum, e) => sum + e.kwh, 0));

  if (estimatedTotal > actual && estimatedTotal > 0) {
    const factor = actual / estimatedTotal;
    const scaled = estimates.map((e) => ({
      ...e,
      kwh: round1(e.kwh * factor),
      assumptions: [...e.assumptions, `${RECONCILE_SCALED_NOTE} (×${factor.toFixed(2)})`],
    }));
    return {
      actualKwh: actual,
      estimatedTotal: round1(scaled.reduce((sum, e) => sum + e.kwh, 0)),
      unallocatedKwh: 0,
      scaled: true,
      note: RECONCILE_SCALED_NOTE,
      estimates: scaled,
    };
  }

  return {
    actualKwh: actual,
    estimatedTotal,
    unallocatedKwh: round1(actual - estimatedTotal),
    scaled: false,
    note: estimatedTotal < actual ? RECONCILE_UNALLOCATED_NOTE : undefined,
    estimates: estimates.map((e) => ({ ...e })),
  };
}

/** Unallocated share of the meter reading, percent (0 when nothing measured). */
export function unallocatedPct(r: Reconciliation): number {
  if (r.actualKwh <= 0) return 0;
  return Math.round((r.unallocatedKwh / r.actualKwh) * 1000) / 10;
}
