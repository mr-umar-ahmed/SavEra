/**
 * Simulated barcode / model-code lookup for Smart Appliance Scan (MASTER_PROMPT §9.3).
 *
 * Fifteen fictional products: 5 ACs, 3 refrigerators, 3 washing machines, 2 geysers, 2 TVs.
 * Brands are invented (Voltra, Kelvion, Norda, Aurel, Hydra, Lumo) — never real manufacturers.
 * Each product answers to two codes: a readable SAVERA model code (`code`, e.g. `SAV-AC-15-5S-001`)
 * and an EAN-13-style numeric barcode (`ean`, e.g. `8901234567001`) so both the camera flow and the
 * "enter code manually" flow resolve the same entry. The scan is positioned as an onboarding
 * accelerator, not an efficiency detector.
 */

import type { BarcodeEntry } from "@/types/household";

/**
 * `BarcodeEntry` (contract) carries a single `code`; the scan flow also needs the numeric
 * EAN form, so the catalogue rows extend the contract type locally.
 */
export interface BarcodeCatalogueEntry extends BarcodeEntry {
  /** EAN-13-style numeric barcode. */
  ean: string;
  /** Extra spec hints applied to the appliance on scan. */
  inverter?: boolean;
  wmType?: "top_load" | "front_load" | "semi_automatic";
  geyserLitres?: number;
}

export const BARCODES: BarcodeCatalogueEntry[] = [
  // ── Air conditioners ─────────────────────────────────────────────────────
  {
    code: "SAV-AC-15-5S-001",
    ean: "8901234567001",
    brand: "Voltra",
    model: "Voltra CoolPro 155i",
    type: "ac",
    star: 5,
    ratedWatts: 1350,
    tonnage: 1.5,
    inverter: true,
    yearIntroduced: 2024,
  },
  {
    code: "SAV-AC-15-3S-002",
    ean: "8901234567002",
    brand: "Kelvion",
    model: "Kelvion Breeze 150",
    type: "ac",
    star: 3,
    ratedWatts: 1650,
    tonnage: 1.5,
    inverter: false,
    yearIntroduced: 2021,
  },
  {
    code: "SAV-AC-10-4S-003",
    ean: "8901234567003",
    brand: "Norda",
    model: "Norda Arctic 100i",
    type: "ac",
    star: 4,
    ratedWatts: 950,
    tonnage: 1,
    inverter: true,
    yearIntroduced: 2023,
  },
  {
    code: "SAV-AC-20-3S-004",
    ean: "8901234567004",
    brand: "Voltra",
    model: "Voltra CoolMax 200",
    type: "ac",
    star: 3,
    ratedWatts: 2100,
    tonnage: 2,
    inverter: false,
    yearIntroduced: 2020,
  },
  {
    code: "SAV-AC-10-5S-005",
    ean: "8901234567005",
    brand: "Aurel",
    model: "Aurel Zephyr 1.0 Window",
    type: "ac",
    star: 5,
    ratedWatts: 880,
    tonnage: 1,
    inverter: true,
    yearIntroduced: 2025,
  },

  // ── Refrigerators ────────────────────────────────────────────────────────
  {
    code: "SAV-FR-260-3S-006",
    ean: "8901234567006",
    brand: "Kelvion",
    model: "Kelvion FrostFree 260",
    type: "fridge",
    star: 3,
    ratedWatts: 150,
    capacityLitres: 260,
    yearIntroduced: 2021,
  },
  {
    code: "SAV-FR-190-4S-007",
    ean: "8901234567007",
    brand: "Norda",
    model: "Norda Compact 190",
    type: "fridge",
    star: 4,
    ratedWatts: 110,
    capacityLitres: 190,
    yearIntroduced: 2023,
  },
  {
    code: "SAV-FR-350-5S-008",
    ean: "8901234567008",
    brand: "Aurel",
    model: "Aurel DuoDoor 350i",
    type: "fridge",
    star: 5,
    ratedWatts: 130,
    capacityLitres: 350,
    yearIntroduced: 2024,
  },

  // ── Washing machines ─────────────────────────────────────────────────────
  {
    code: "SAV-WM-70-5S-009",
    ean: "8901234567009",
    brand: "Hydra",
    model: "Hydra AquaSpin 7.0 TL",
    type: "washing_machine",
    star: 5,
    ratedWatts: 500,
    capacityKg: 7,
    wmType: "top_load",
    yearIntroduced: 2023,
  },
  {
    code: "SAV-WM-80-4S-010",
    ean: "8901234567010",
    brand: "Hydra",
    model: "Hydra FrontLine 8.0 FL",
    type: "washing_machine",
    star: 4,
    ratedWatts: 2000,
    capacityKg: 8,
    wmType: "front_load",
    yearIntroduced: 2022,
  },
  {
    code: "SAV-WM-65-3S-011",
    ean: "8901234567011",
    brand: "Norda",
    model: "Norda TwinTub 6.5 SA",
    type: "washing_machine",
    star: 3,
    ratedWatts: 350,
    capacityKg: 6.5,
    wmType: "semi_automatic",
    yearIntroduced: 2020,
  },

  // ── Geysers ──────────────────────────────────────────────────────────────
  {
    code: "SAV-GY-25-5S-012",
    ean: "8901234567012",
    brand: "Hydra",
    model: "Hydra ThermoStore 25",
    type: "geyser",
    star: 5,
    ratedWatts: 2000,
    geyserLitres: 25,
    yearIntroduced: 2024,
  },
  {
    code: "SAV-GY-15-4S-013",
    ean: "8901234567013",
    brand: "Aurel",
    model: "Aurel HotPoint 15",
    type: "geyser",
    star: 4,
    ratedWatts: 2000,
    geyserLitres: 15,
    yearIntroduced: 2022,
  },

  // ── Televisions ──────────────────────────────────────────────────────────
  {
    code: "SAV-TV-55-4K-014",
    ean: "8901234567014",
    brand: "Lumo",
    model: "Lumo Vista 55 4K",
    type: "tv",
    ratedWatts: 100,
    screenInches: 55,
    yearIntroduced: 2023,
  },
  {
    code: "SAV-TV-43-FHD-015",
    ean: "8901234567015",
    brand: "Lumo",
    model: "Lumo Vista 43 FHD",
    type: "tv",
    ratedWatts: 80,
    screenInches: 43,
    yearIntroduced: 2022,
  },
];

function normalise(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Resolve a scanned or typed code. Case-insensitive, trims whitespace, and matches either the
 * SAVERA model code or the numeric EAN form. Returns `undefined` when nothing matches.
 */
export function findBarcode(code: string): BarcodeCatalogueEntry | undefined {
  const key = normalise(code);
  if (!key) return undefined;
  return BARCODES.find((b) => normalise(b.code) === key || b.ean === key);
}

/** Codes offered as quick "try one of these" chips on the manual-entry screen. */
export const SAMPLE_BARCODES: string[] = BARCODES.slice(0, 5).map((b) => b.code);
