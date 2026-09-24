/**
 * H-1088 — the second demo household, used to demonstrate the abnormal-LPG alert and safety
 * guidance (MASTER_PROMPT §11, spec 03). Anand Kulkarni · 3 people · 1BHK · ABC Colony (Area B),
 * Ward 24, Zone 3.
 *
 * LPG story (kept simple and truthful — the engine derives rates from cylinder dates only):
 *   cyl-1088-1  27 days  → 0.526 kg/day
 *   cyl-1088-2  26 days  → 0.546 kg/day
 *   cyl-1088-3  25 days  → 0.568 kg/day        typical (median of finished cycles) ≈ 0.56 kg/day
 *   cyl-1088-4  17 days  → 0.835 kg/day        last finished cycle: +49 % vs typical
 *   cyl-1088-5  in use, started 6 days ago     ≥ 5 elapsed days, tracking the recent faster pattern
 * The engine flags the last finished cycle plus the current trend as "Higher consumption detected"
 * (projected rate > typical × 1.2 after ≥ 5 elapsed days) and shows the safety guidance including
 * "Possible leakage — check for safety" — never "leak detected".
 *
 * Electricity: a smaller 1BHK set (window 1 T 5★ inverter AC, 190 L fridge, 3 fans, lights, 43" TV,
 * small geyser, mixer, router, iron). Estimates ≈ 200 kWh against bills of 205–262 kWh.
 */

import type { Household, Appliance } from "@/types/household";
import type { WaterSupplySchedule } from "@/types/water";
import type { BillHistoryPoint, LpgCycleSpec } from "./shared";

export const H1088_ID = "H-1088";
export const H1088_AREA_ID = "area-abc";
export const H1088_WARD_ID = "ward-24";
export const H1088_ZONE_ID = "zone-3";

const ADDED_AT = "2026-01-18T14:05:00.000Z";

// ---------------------------------------------------------------------------
// Household
// ---------------------------------------------------------------------------

export const H1088_HOUSEHOLD: Household = {
  id: H1088_ID,
  areaId: H1088_AREA_ID,
  wardId: H1088_WARD_ID,
  zoneId: H1088_ZONE_ID,
  name: "Anand Kulkarni",
  mobile: "9000000002",
  pin: "584101",
  providerId: "Electricity Department",
  consumerCategory: "domestic",
  people: 3,
  homeType: "1BHK",
  sizeSqft: 620,
  renewable: "none",
  sections: {
    household: "complete",
    electricity: "complete",
    water: "complete",
    gas: "complete",
    carbon: "none",
  },
  water: {
    usagePoints: ["kitchen", "bathroom"],
    scheduleAreaId: H1088_AREA_ID,
    source: "municipal",
    storageLitres: 500,
  },
  gas: {
    kind: "lpg",
    cylinderSizeKg: 14.2,
    provider: "LPG Distribution Cell",
  },
  createdAt: ADDED_AT,
  displayName: "Anand K.",
  displayNamePublic: false,
};

// ---------------------------------------------------------------------------
// Appliances (ids `app-1088-*`)
// ---------------------------------------------------------------------------

const base = {
  householdId: H1088_ID,
  source: "manual" as const,
  addedAt: ADDED_AT,
};

export const H1088_APPLIANCES: Appliance[] = [
  {
    ...base,
    id: "app-1088-ac",
    type: "ac",
    category: "cooling",
    label: "Window AC 1 T",
    // 0.8 kW × 0.55 (inverter) × 0.85 (5★) × 5 h × 30 d = 56.1 kWh
    spec: { acType: "window", tonnage: 1, star: 5, inverter: true, ageYears: 2 },
    count: 1,
    hoursPerDay: 5,
    daysPerMonth: 30,
    ageYears: 2,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1088-fridge",
    type: "fridge",
    category: "kitchen",
    label: "Single-door refrigerator 190 L",
    // < 200 L band at 3★ = 32 kWh
    spec: { fridgeType: "single_door", capacityLitres: 190, star: 3, ageYears: 3 },
    count: 1,
    hoursPerDay: 24,
    daysPerMonth: 30,
    ageYears: 3,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1088-fan",
    type: "ceiling_fan",
    category: "fans_ventilation",
    label: "Ceiling fans",
    // 3 × 0.075 kW × 8 h × 30 d = 54 kWh
    spec: { fanType: "ceiling", watts: 75 },
    count: 3,
    hoursPerDay: 8,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1088-led",
    type: "led_bulb",
    category: "lighting",
    label: "LED bulbs",
    // 6 × 0.010 kW × 5 h × 30 d = 9 kWh
    spec: { watts: 10, bulbCount: 6 },
    count: 6,
    hoursPerDay: 5,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1088-tube",
    type: "tube_light",
    category: "lighting",
    label: "Tube light",
    // 1 × 0.040 kW × 5 h × 30 d = 6 kWh
    spec: { watts: 40, bulbCount: 1 },
    count: 1,
    hoursPerDay: 5,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1088-tv",
    type: "tv",
    category: "entertainment",
    label: 'LED TV 43"',
    // 0.080 kW × 4 h × 30 d = 9.6 kWh
    spec: { screenInches: 43, watts: 80 },
    count: 1,
    hoursPerDay: 4,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1088-geyser",
    type: "geyser",
    category: "water_heating",
    label: "Geyser 15 L",
    // 2.0 kW × 0.6 × 0.5 h × 30 d = 18 kWh
    spec: { geyserLitres: 15, watts: 2000 },
    count: 1,
    hoursPerDay: 0.5,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1088-mixer",
    type: "mixer_grinder",
    category: "kitchen",
    label: "Mixer / grinder",
    // 0.75 kW × 0.25 h × 30 d = 5.6 kWh
    spec: { watts: 750 },
    count: 1,
    hoursPerDay: 0.25,
    daysPerMonth: 30,
    setupStatus: "complete",
  },
  {
    ...base,
    id: "app-1088-router",
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
    id: "app-1088-iron",
    type: "iron",
    category: "other",
    label: "Iron",
    // 1.0 kW × 0.4 h × 8 d = 3.2 kWh
    spec: { watts: 1000 },
    count: 1,
    hoursPerDay: 0.4,
    daysPerMonth: 8,
    setupStatus: "complete",
  },
];

// ---------------------------------------------------------------------------
// Electricity bills — 12 months, 205–262 kWh with the same seasonality shape as H-1024.
// Amounts follow the demo tariff (≈ 1,648.6 + 7.848 × (kWh − 200), rounded to ₹5).
// ---------------------------------------------------------------------------

export const H1088_BILL_HISTORY: BillHistoryPoint[] = [
  { offset: 0, kwh: 235, amount: 1925 },
  { offset: -1, kwh: 218, amount: 1790 },
  { offset: -2, kwh: 226, amount: 1855 },
  { offset: -3, kwh: 242, amount: 1980 },
  { offset: -4, kwh: 258, amount: 2105 },
  { offset: -5, kwh: 262, amount: 2135 },
  { offset: -6, kwh: 249, amount: 2035 },
  { offset: -7, kwh: 231, amount: 1890 },
  { offset: -8, kwh: 212, amount: 1745 },
  { offset: -9, kwh: 205, amount: 1690 },
  { offset: -10, kwh: 208, amount: 1710 },
  { offset: -11, kwh: 214, amount: 1760 },
];

/** Starting cumulative meter reading for the oldest seeded bill. */
export const H1088_METER_START = 11840;

/** kWh for a month offset (0 = current … −11); wraps like `H1024_BILL_KWH_BY_OFFSET`. */
export function H1088_BILL_KWH_BY_OFFSET(monthOffset: number): number {
  const back = Math.max(0, Math.round(-monthOffset));
  const point = H1088_BILL_HISTORY[back % 12];
  const extraYears = Math.floor(back / 12);
  return Math.round(point.kwh * Math.pow(0.96, extraYears));
}

/** ₹ amount for a month offset. */
export function H1088_BILL_AMOUNT_BY_OFFSET(monthOffset: number): number {
  const back = Math.max(0, Math.round(-monthOffset));
  const point = H1088_BILL_HISTORY[back % 12];
  const extraYears = Math.floor(back / 12);
  return Math.round((point.amount * Math.pow(0.96, extraYears)) / 5) * 5;
}

// ---------------------------------------------------------------------------
// LPG — 14.2 kg cylinders, relative to demoNow (see file header for the story)
//   cyl-1088-1  start 101 d ago, 27 days → finished 74 d ago
//   cyl-1088-2  start  74 d ago, 26 days → finished 48 d ago
//   cyl-1088-3  start  48 d ago, 25 days → finished 23 d ago
//   cyl-1088-4  start  23 d ago, 17 days → finished  6 d ago   (0.835 kg/day — abnormal)
//   cyl-1088-5  start   6 d ago, in use
// ---------------------------------------------------------------------------

export const H1088_LPG_PROVIDER = "LPG Distribution Cell";

export const H1088_LPG: LpgCycleSpec[] = [
  { id: "cyl-1088-1", daysAgoStart: 101, days: 27, sizeKg: 14.2, provider: H1088_LPG_PROVIDER },
  { id: "cyl-1088-2", daysAgoStart: 74, days: 26, sizeKg: 14.2, provider: H1088_LPG_PROVIDER },
  { id: "cyl-1088-3", daysAgoStart: 48, days: 25, sizeKg: 14.2, provider: H1088_LPG_PROVIDER },
  { id: "cyl-1088-4", daysAgoStart: 23, days: 17, sizeKg: 14.2, provider: H1088_LPG_PROVIDER },
  { id: "cyl-1088-5", daysAgoStart: 6, current: true, sizeKg: 14.2, provider: H1088_LPG_PROVIDER },
];

/**
 * Expected outcome of `analyzeLpg` for H-1088 — documented for the engine tests and the demo script.
 * typical = median(14.2/27, 14.2/26, 14.2/25, 14.2/17) ≈ 0.56 kg/day; last cycle 0.835 kg/day (+49 %).
 */
export const H1088_LPG_EXPECTED = {
  typicalKgPerDay: 0.56,
  lastCycleKgPerDay: 0.84,
  lastCycleDays: 17,
  priorCycleDays: [27, 26, 25],
  currentDaysUsed: 6,
  status: "higher",
} as const;

// ---------------------------------------------------------------------------
// Water — ABC Colony planned supply
// ---------------------------------------------------------------------------

export const H1088_WATER_SCHEDULE: WaterSupplySchedule = {
  areaId: H1088_AREA_ID,
  start: "06:30",
  end: "07:30",
  plannedLitres: 340000,
  frequency: "daily",
  note: "Planned supply for ABC Colony — published by the Water Supply Board.",
};
