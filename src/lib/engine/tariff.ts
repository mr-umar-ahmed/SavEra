/**
 * Demo slab tariff arithmetic (MASTER_PROMPT §8.8).
 *
 *   bill = (Σ slab charges + fixed charge) × (1 + tax %)
 *
 * The tariff is a configurable demo (`DEMO_TARIFF`, "Demo tariff — configurable") and every
 * ₹ figure derived here is an estimate; the UI shows `TARIFF_DISCLAIMER` under forecasts.
 */

import { DEMO_TARIFF } from "@/data/catalogue/tariff";
import type { BillBreakdown, SlabLine, Tariff } from "@/types";

const round2 = (n: number): number => Math.round(n * 100) / 100;

function slabLabel(from: number, upto: number | null): string {
  if (upto === null) return `Above ${from} units`;
  return from === 0 ? `0–${upto} units` : `${from + 1}–${upto} units`;
}

/** Bill for `kwh` under the tariff, with one line per slab consumed. */
export function computeBill(kwh: number, tariff: Tariff = DEMO_TARIFF): BillBreakdown {
  const units = Math.max(0, Number.isFinite(kwh) ? kwh : 0);
  const slabLines: SlabLine[] = [];
  let consumed = 0;
  for (const slab of tariff.slabs) {
    const cap = slab.upto ?? Number.POSITIVE_INFINITY;
    const inSlab = Math.min(units, cap) - consumed;
    if (inSlab <= 0) break;
    slabLines.push({
      label: slabLabel(consumed, slab.upto),
      units: round2(inSlab),
      rate: slab.rate,
      amount: round2(inSlab * slab.rate),
    });
    consumed += inSlab;
    if (slab.upto === null || units <= cap) break;
  }
  const energyCharge = round2(slabLines.reduce((sum, l) => sum + l.amount, 0));
  const fixedCharge = tariff.fixedCharge;
  const subtotal = energyCharge + fixedCharge;
  const tax = round2((subtotal * tariff.taxPct) / 100);
  return {
    kwh: units,
    energyCharge,
    fixedCharge,
    tax,
    total: Math.round(subtotal + tax),
    slabLines,
  };
}

/**
 * ₹ per kWh (incl. tax) for the last unit consumed at `kwh` — what one saved unit is worth.
 * At 0 kWh the first slab applies.
 */
export function marginalRate(kwh: number, tariff: Tariff = DEMO_TARIFF): number {
  const units = Math.max(0, Number.isFinite(kwh) ? kwh : 0);
  const slab =
    tariff.slabs.find((s) => s.upto === null || units <= s.upto) ??
    tariff.slabs[tariff.slabs.length - 1];
  return round2(slab.rate * (1 + tariff.taxPct / 100));
}

/** ₹ range for a kWh range under the tariff. */
export function billRange(
  lowKwh: number,
  highKwh: number,
  tariff: Tariff = DEMO_TARIFF,
): { low: number; high: number } {
  return { low: computeBill(lowKwh, tariff).total, high: computeBill(highKwh, tariff).total };
}
