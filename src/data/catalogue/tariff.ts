/**
 * Demo domestic slab tariff (MASTER_PROMPT §8.8). Labelled "Demo tariff — configurable"
 * everywhere it is shown; it is NOT a real utility's tariff.
 *
 * Bill formula (engine/tariff.ts):  bill = (Σ slab charges + fixedCharge) × (1 + taxPct / 100)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Calibration — the spec's anchor bills for H-1024 must come out within ±2 %:
 *   350 kWh ≈ ₹2,850 · 390 kWh ≈ ₹3,120 · 405–430 kWh ≈ ₹3,250–3,500
 *
 * Because every anchor sits in the open top slab (>200 units), the bill is linear there:
 *   bill(k) = (50·4.15 + 50·5.60 + 100·6.85 + (k − 200)·7.20 + 340) × 1.09
 *           = (207.5 + 280 + 685 + 340 + 7.20·(k − 200)) × 1.09
 *           = (1,512.5 + 7.20·(k − 200)) × 1.09
 *           = 1,648.6 + 7.848·(k − 200)
 *
 *   k = 350 → 1,648.6 + 7.848 × 150 = 2,825.8   (target 2,850, −0.85 %) ✔
 *   k = 390 → 1,648.6 + 7.848 × 190 = 3,139.7   (target 3,120, +0.63 %) ✔
 *   k = 405 → 1,648.6 + 7.848 × 205 = 3,257.5   (target 3,250, +0.23 %) ✔
 *   k = 430 → 1,648.6 + 7.848 × 230 = 3,453.7   (target 3,500, −1.32 %) ✔
 *
 * Why these numbers: the two measured anchors force the marginal rate to be roughly
 * ₹6.75–7.85 per unit incl. tax, and the 430-unit anchor pulls it to the upper end.
 * With rising slabs (4.15 < 5.60 < 6.85 < 7.20) the remaining ₹ is carried by a fixed
 * charge of ₹340 — consistent with a domestic connection of 3–4 kW sanctioned load
 * at roughly ₹85–110 per kW.
 *
 * Marginal rate used for ₹ savings on recommendations (engine/tariff.ts `marginalRate`):
 * 7.20 × 1.09 = ₹7.85 per unit saved for any household above 200 units.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Tariff } from "@/types/electricity";

export const DEMO_TARIFF: Tariff = {
  name: "Demo domestic tariff — configurable",
  slabs: [
    { upto: 50, rate: 4.15 },
    { upto: 100, rate: 5.6 },
    { upto: 200, rate: 6.85 },
    { upto: null, rate: 7.2 },
  ],
  fixedCharge: 340,
  taxPct: 9,
  note:
    "Demo tariff — configurable. Rising-block domestic slabs (0–50 / 51–100 / 101–200 / above 200 units), " +
    "a fixed charge for a typical 3–4 kW sanctioned load and 9 % tax. Values are illustrative and are not " +
    "any utility's published tariff.",
};

/** Shown under every ₹ forecast (MASTER_PROMPT §6.5). */
export const TARIFF_DISCLAIMER =
  "Estimated — actual bill may differ based on tariff, fixed charges, taxes and other billing components.";

/** Short label used on chips beside the tariff name. */
export const TARIFF_LABEL = "Demo tariff — configurable";
