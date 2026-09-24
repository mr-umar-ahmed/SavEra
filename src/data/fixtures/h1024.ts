/**
 * H-1024 — the canonical primary demo household (MASTER_PROMPT §11, spec 02/03).
 * Priya Sharma · 4 people · 2BHK · XYZ Colony (Area A), Ward 24, Zone 3 · no renewable.
 *
 * Everything time-related is expressed relative to `demoNow` (ARCHITECTURE §7):
 *  - bills by month offset (0 = current month = 390 kWh, −1 = previous = 350 kWh)
 *  - LPG cylinders by "days ago" (current started 18 days ago; two 25-day cycles before it)
 *
 * Appliance calibration (see catalogue/appliances.ts header for the arithmetic):
 *   AC 155 · fans 70 · fridge 46 · lighting 29 · TV 20 · other 48 → Σ ≈ 368 → unallocated ≈ 22 of 390.
 *   The geyser is `setupStatus: 'later'` (no hours) and must NOT be estimated; the washing machine is
 *   `partial` (type + loads known, capacity unknown) and is estimated at top_load 0.5 kWh × 4 loads/wk × 4.3.
 */

import type { Household, Appliance } from "@/types/household";
import type { WaterSupplySchedule } from "@/types/water";
import type { BillHistoryPoint, LpgCycleSpec } from "./shared";

export const H1024_ID = "H-1024";
export const H1024_AREA_ID = "area-xyz";
export const H1024_WARD_ID = "ward-24";
export const H1024_ZONE_ID = "zone-3";

const ADDED_AT = "2025-11-10T09:30:00.000Z";

// ---------------------------------------------------------------------------
// Household
// ---------------------------------------------------------------------------

export const H1024_HOUSEHOLD: Household = {
  id: H1024_ID,
  areaId: H1024_AREA_ID,
  wardId: H1024_WARD_ID,
  zoneId: H1024_ZONE_ID,
  name: "Priya Sharma",
  mobile: "9000000001",
  pin: "584101",
  providerId: "Electricity Department",
  consumerCategory: "domestic",
  people: 4,
  homeType: "2BHK",
  sizeSqft: 950,
  renewable: "none",
  sections: {
    household: "complete",
    electricity: "partial",
    water: "complete",
    gas: "complete",
    carbon: "none",
  },
  water: {
    usagePoints: ["kitchen", "bathroom", "washing"],
    scheduleAreaId: H1024_AREA_ID,
    source: "municipal",
    storageLitres: 1000,
  },
  gas: {
    kind: "lpg",
    cylinderSizeKg: 14.2,
    provider: "LPG Distribution Cell",
  },
  createdAt: ADDED_AT,
  displayName: "Priya S.",
  displayNamePublic: false,
};

// ---------------------------------------------------------------------------
// Appliances (ids `app-1024-*`)
// ---------------------------------------------------------------------------

const base = {
  householdId: H1024_ID,
  source: "manual" as const,
  addedAt: ADDED_AT,
};

export const H1024_APPLIANCES: Appliance[] = [
  {
    ...base,
    id: "app-1024-ac",
    type: "ac",
    category: "cooling",
    label: "Split AC 1.5 T",
    // 1.15 kW × 0.75 × 6 h × 30 d × 1 = 155.25 kWh
    spec: { acType: "split", tonnage: 1.5, star: 3, inverter: false, ageYears: 4 },
    count: 1,
    hoursPerDay: 6,
    daysPerMonth: 30,
    ageYears: 4,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1024-fridge",
    type: "fridge",
    category: "kitchen",
    label: "Double-door refrigerator 260 L",
    // 200–300 L band at 3★ = 46 kWh; 5 yrs → no age penalty
    spec: { fridgeType: "double_door", capacityLitres: 260, star: 3, ageYears: 5 },
    count: 1,
    hoursPerDay: 24,
    daysPerMonth: 30,
    ageYears: 5,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1024-fan",
    type: "ceiling_fan",
    category: "fans_ventilation",
    label: "Ceiling fans",
    // 4 × 0.075 kW × 7.8 h × 30 d = 70.2 kWh
    spec: { fanType: "ceiling", watts: 75 },
    count: 4,
    hoursPerDay: 7.8,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1024-led",
    type: "led_bulb",
    category: "lighting",
    label: "LED bulbs",
    // 8 × 0.010 kW × 5.5 h × 30 d = 13.2 kWh
    spec: { watts: 10, bulbCount: 8 },
    count: 8,
    hoursPerDay: 5.5,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1024-tube",
    type: "tube_light",
    category: "lighting",
    label: "Tube lights",
    // 2 × 0.040 kW × 6.5 h × 30 d = 15.6 kWh
    spec: { watts: 40, bulbCount: 2 },
    count: 2,
    hoursPerDay: 6.5,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1024-tv",
    type: "tv",
    category: "entertainment",
    label: 'LED TV 55"',
    // 0.100 kW × 6.5 h × 30 d = 19.5 kWh
    spec: { screenInches: 55, watts: 100 },
    count: 1,
    hoursPerDay: 6.5,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1024-geyser",
    type: "geyser",
    category: "water_heating",
    label: "Geyser",
    // Set up later — no hours known; excluded from estimates until completed.
    spec: {},
    count: 1,
    setupStatus: "later",
  },
  {
    ...base,
    id: "app-1024-wm",
    type: "washing_machine",
    category: "laundry",
    label: "Washing machine (top load)",
    // Partial: capacity unknown. 0.5 kWh × 4 loads/wk × 4.3 = 8.6 kWh
    spec: { wmType: "top_load", loadsPerWeek: 4 },
    count: 1,
    setupStatus: "partial",
  },
  {
    ...base,
    id: "app-1024-microwave",
    type: "microwave",
    category: "kitchen",
    label: "Microwave",
    // 1.2 kW × 0.25 h × 30 d = 9.0 kWh
    spec: { watts: 1200 },
    count: 1,
    hoursPerDay: 0.25,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1024-mixer",
    type: "mixer_grinder",
    category: "kitchen",
    label: "Mixer / grinder",
    // 0.75 kW × 0.3 h × 30 d = 6.75 kWh
    spec: { watts: 750 },
    count: 1,
    hoursPerDay: 0.3,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1024-router",
    type: "router",
    category: "computing",
    label: "Wi-Fi router",
    // Continuous: 7 kWh/month
    spec: { watts: 10 },
    count: 1,
    hoursPerDay: 24,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1024-laptop",
    type: "laptop",
    category: "computing",
    label: "Laptop",
    // 0.06 kW × 6 h × 30 d = 10.8 kWh
    spec: { watts: 60 },
    count: 1,
    hoursPerDay: 6,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1024-iron",
    type: "iron",
    category: "other",
    label: "Iron",
    // 1.0 kW × 0.5 h × 12 d = 6.0 kWh
    spec: { watts: 1000 },
    count: 1,
    hoursPerDay: 0.5,
    daysPerMonth: 12,
    setupStatus: "complete",
  },
];

// ---------------------------------------------------------------------------
// Electricity bills — 12 months by offset with seasonality
// (offset 0 = current month; with demoNow in September: −4/−5 = May/April summer peak,
//  −8…−10 = January/December/November winter low). Anchors: current 390, previous 350.
// ---------------------------------------------------------------------------

/**
 * Amounts follow the demo tariff (bill ≈ 1,648.6 + 7.848 × (kWh − 200), rounded to ₹5) except
 * the two spec anchors, which are the "measured" bills: current ₹3,120, previous ₹2,850.
 */
export const H1024_BILL_HISTORY: BillHistoryPoint[] = [
  { offset: 0, kwh: 390, amount: 3120 },
  { offset: -1, kwh: 350, amount: 2850 },
  { offset: -2, kwh: 372, amount: 3000 },
  { offset: -3, kwh: 410, amount: 3300 },
  { offset: -4, kwh: 445, amount: 3570 },
  { offset: -5, kwh: 468, amount: 3750 },
  { offset: -6, kwh: 430, amount: 3455 },
  { offset: -7, kwh: 398, amount: 3200 },
  { offset: -8, kwh: 340, amount: 2750 },
  { offset: -9, kwh: 318, amount: 2575 },
  { offset: -10, kwh: 305, amount: 2470 },
  { offset: -11, kwh: 322, amount: 2605 },
];

/** Starting cumulative meter reading for the oldest seeded bill. */
export const H1024_METER_START = 24310;

/**
 * kWh for a month offset (0 = current, −1 = previous … −11). Offsets beyond the 12-month
 * table wrap to the same calendar month a year earlier, scaled by 0.96 per extra year
 * (so −12 returns a plausible "same month last year" of ≈374 kWh for forecasting).
 */
export function H1024_BILL_KWH_BY_OFFSET(monthOffset: number): number {
  const back = Math.max(0, Math.round(-monthOffset));
  const point = H1024_BILL_HISTORY[back % 12];
  const extraYears = Math.floor(back / 12);
  return Math.round(point.kwh * Math.pow(0.96, extraYears));
}

/** ₹ amount for a month offset; anchors are current 3,120 and previous 2,850. */
export function H1024_BILL_AMOUNT_BY_OFFSET(monthOffset: number): number {
  const back = Math.max(0, Math.round(-monthOffset));
  const point = H1024_BILL_HISTORY[back % 12];
  const extraYears = Math.floor(back / 12);
  return Math.round((point.amount * Math.pow(0.96, extraYears)) / 5) * 5;
}

// ---------------------------------------------------------------------------
// LPG — 14.2 kg cylinders, relative to demoNow
//   cyl-1024-1: started 68 days ago, finished after 25 days (43 days ago)      → 0.568 kg/day
//   cyl-1024-2: started 43 days ago, finished after 25 days (18 days ago)      → 0.568 kg/day
//   cyl-1024-3: started 18 days ago, in use                                    → tracking ≈ 0.57 kg/day
// Typical 0.55–0.60 kg/day, status Normal. With demoNow = 2026-10-10 this is
// Aug 3–28, Aug 28–Sep 22, current from Sep 22.
// ---------------------------------------------------------------------------

export const H1024_LPG_PROVIDER = "LPG Distribution Cell";

export const H1024_LPG: LpgCycleSpec[] = [
  { id: "cyl-1024-1", daysAgoStart: 68, days: 25, sizeKg: 14.2, provider: H1024_LPG_PROVIDER },
  { id: "cyl-1024-2", daysAgoStart: 43, days: 25, sizeKg: 14.2, provider: H1024_LPG_PROVIDER },
  { id: "cyl-1024-3", daysAgoStart: 18, current: true, sizeKg: 14.2, provider: H1024_LPG_PROVIDER },
];

// ---------------------------------------------------------------------------
// Water — XYZ Colony planned supply
// ---------------------------------------------------------------------------

export const H1024_WATER_SCHEDULE: WaterSupplySchedule = {
  areaId: H1024_AREA_ID,
  start: "07:00",
  end: "08:00",
  plannedLitres: 450000,
  frequency: "daily",
  note: "Planned supply for XYZ Colony — published by the Water Supply Board.",
};

// ---------------------------------------------------------------------------
// Spec anchors the engine tests assert against (ARCHITECTURE §6)
// ---------------------------------------------------------------------------

export const H1024_ANCHORS = {
  currentKwh: 390,
  previousKwh: 350,
  currentBill: 3120,
  previousBill: 2850,
  applianceKwh: { ac: 155, fans: 70, fridge: 46, lighting: 29, tv: 20, other: 50 },
  estimatedTotalKwh: 365,
  unallocatedKwh: 25,
  baseline: { low: 320, high: 350 },
  forecastKwh: { low: 405, high: 430 },
  forecastBill: { low: 3250, high: 3500 },
  lpgTypicalKgPerDay: { low: 0.55, high: 0.6 },
  lpgCurrentKgPerDay: 0.57,
  greenScore: 86,
  rank: { previous: 127, current: 84 },
  participants: 700,
  completenessPct: 78,
} as const;
