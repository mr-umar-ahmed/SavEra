/**
 * Static appliance catalogue used by the electricity setup wizard and the
 * appliance-estimation engine (MASTER_PROMPT §6.4, §8.1).
 *
 * Every `ApplianceType` in `src/types/household.ts` has exactly one entry here.
 * The engine (`lib/engine/appliances.ts`) reads the defaults below whenever a
 * household did not answer a question ("Don't know" / skipped), and lowers the
 * confidence of that appliance's estimate.
 *
 * Estimation models
 *  - `duty`        kWh/month = kW × dutyFactor × hours/day × days/month × count
 *  - `continuous`  kWh/month = defaultKwhPerMonth (× size / star adjustments) × count
 *  - `per-cycle`   kWh/month = kwhPerCycle × cyclesPerWeek × 4.3 × count
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Calibration for the primary demo household H-1024 (fixtures/h1024.ts).
 * The engine must land within ±10 % of these figures using the defaults here:
 *
 *   AC        1 × 1.5 T, 3★, non-inverter, 4 yrs, 6 h/day, 30 days
 *             AC_BASE_KW[1.5] = 1.15 kW (input power)
 *             1.15 × AC_DUTY.nonInverter 0.75 × STAR_MULTIPLIER[3] 1.0 × 6 × 30 × 1 = 155.25  (≈155 ✔)
 *   Fans      4 × 75 W × 7.8 h × 30 d           = 4 × 0.075 × 7.8 × 30 = 70.2       (≈70 ✔)
 *   Fridge    260 L 3★ → FRIDGE_KWH_BANDS 200–300 L = 46 kWh                          (≈46 ✔)
 *   Lighting  8 LED × 10 W × 5.5 h × 30 = 13.2  +  2 tube × 40 W × 6.5 h × 30 = 15.6  = 28.8 (≈29 ✔)
 *   TV        55" 100 W × 6.5 h × 30            = 19.5                                  (≈20 ✔)
 *   Other     microwave 1200 W × 0.25 h × 30 = 9.0
 *             mixer     750 W × 0.30 h × 30    = 6.75
 *             router    continuous              = 7.0
 *             laptop    60 W × 6 h × 30         = 10.8
 *             iron      1000 W × 0.5 h × 12 d   = 6.0
 *             washing machine (partial) top_load 0.5 kWh × 4 loads/wk × 4.3 = 8.6
 *             geyser    setupStatus 'later' → not estimated (0)
 *             Σ other                           = 48.15                                 (≈48–50 ✔)
 *   Total     155.25 + 70.2 + 46 + 28.8 + 19.5 + 48.15 = 367.9 → unallocated ≈ 22 against 390 kWh actual ✔
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  AcTonnage,
  ApplianceCatalogueEntry,
  ApplianceCategory,
  ApplianceQuestion,
  ApplianceType,
  StarRating,
  WashingMachineType,
} from "@/types/household";
import { APPLIANCE_CATEGORY_LABEL } from "@/types/household";

// ---------------------------------------------------------------------------
// Engine constants (§8.1)
// ---------------------------------------------------------------------------

/** BEE star-rating multiplier applied to AC and fridge estimates. */
export const STAR_MULTIPLIER: Record<StarRating | "unknown", number> = {
  5: 0.85,
  4: 0.92,
  3: 1,
  2: 1.1,
  1: 1.1,
  unknown: 1.1,
};

/**
 * AC INPUT power (kW) by tonnage — electrical draw, not cooling capacity.
 * Chosen so that 1.5 T × 0.75 duty × 6 h × 30 d = 155 kWh (see calibration above).
 */
export const AC_BASE_KW: Record<AcTonnage, number> = {
  1: 0.8,
  1.5: 1.15,
  2: 1.5,
};

/** Average compressor duty while an AC is switched on. */
export const AC_DUTY = { inverter: 0.55, nonInverter: 0.75 } as const;

/** +2 % consumption per year of age beyond 5 years (AC and fridge). */
export const AGE_PENALTY_PER_YEAR = 0.02;
export const AGE_PENALTY_FREE_YEARS = 5;

/** Fridge kWh/month at 3★ by capacity band (`maxLitres` is exclusive upper bound). */
export const FRIDGE_KWH_BANDS: { maxLitres: number; kwh: number }[] = [
  { maxLitres: 200, kwh: 32 },
  { maxLitres: 300, kwh: 46 },
  { maxLitres: 400, kwh: 56 },
  { maxLitres: Number.POSITIVE_INFINITY, kwh: 70 },
];

/** Base fridge kWh/month at 3★ for a capacity; unknown capacity → 200–300 L band. */
export function fridgeBaseKwh(capacityLitres?: number): number {
  if (capacityLitres === undefined || !Number.isFinite(capacityLitres)) return 46;
  const band = FRIDGE_KWH_BANDS.find((b) => capacityLitres < b.maxLitres);
  return band ? band.kwh : 70;
}

/** kWh per wash cycle by washing-machine type. */
export const WM_KWH_PER_CYCLE: Record<WashingMachineType, number> = {
  top_load: 0.5,
  front_load: 0.9,
  semi_automatic: 0.3,
};

/** Typical TV draw (W) by screen size; the engine picks the nearest band. */
export const TV_WATTS_BY_INCH: { maxInches: number; watts: number }[] = [
  { maxInches: 32, watts: 50 },
  { maxInches: 43, watts: 80 },
  { maxInches: 55, watts: 100 },
  { maxInches: 65, watts: 150 },
  { maxInches: Number.POSITIVE_INFINITY, watts: 200 },
];

export function tvWattsForInches(screenInches?: number): number {
  if (screenInches === undefined || !Number.isFinite(screenInches)) return 100;
  const band = TV_WATTS_BY_INCH.find((b) => screenInches <= b.maxInches);
  return band ? band.watts : 200;
}

/** Weeks per month used by the per-cycle model. */
export const WEEKS_PER_MONTH = 4.3;

// ---------------------------------------------------------------------------
// Question building blocks (progressive disclosure, §6.4 step 2)
// "Don't know / Skip for now / Set up later" are rendered by the UI on every row.
// ---------------------------------------------------------------------------

const STAR_OPTIONS = [
  { value: 5, label: "5★" },
  { value: 4, label: "4★" },
  { value: 3, label: "3★" },
  { value: 2, label: "2★" },
  { value: 1, label: "1★" },
];

const qStar: ApplianceQuestion = {
  key: "star",
  label: "BEE star rating",
  kind: "select",
  options: STAR_OPTIONS,
  helper: "Printed on the BEE label on the appliance.",
};

const qAge: ApplianceQuestion = {
  key: "ageYears",
  label: "Age",
  kind: "number",
  unit: "yrs",
  helper: "Appliances older than 5 years typically use a little more energy.",
};

const qCount = (label = "Count"): ApplianceQuestion => ({
  key: "count",
  label,
  kind: "number",
});

const qHours = (helper?: string): ApplianceQuestion => ({
  key: "hoursPerDay",
  label: "Hours per day",
  kind: "number",
  unit: "h/day",
  helper,
});

const qDays: ApplianceQuestion = {
  key: "daysPerMonth",
  label: "Days per month",
  kind: "number",
  unit: "days",
};

const qWatts = (helper = "Rated power, usually printed on the label."): ApplianceQuestion => ({
  key: "watts",
  label: "Wattage",
  kind: "number",
  unit: "W",
  helper,
});

const qLoads: ApplianceQuestion = {
  key: "loadsPerWeek",
  label: "Loads per week",
  kind: "number",
  unit: "loads/wk",
};

/** Generic question set for small electronics: hours, count, wattage. */
const GENERIC_QUESTIONS: ApplianceQuestion[] = [qHours(), qCount(), qWatts()];

// ---------------------------------------------------------------------------
// The catalogue — one entry per ApplianceType, grouped by the nine categories
// ---------------------------------------------------------------------------

export const APPLIANCE_CATALOGUE: ApplianceCatalogueEntry[] = [
  // ── Cooling ──────────────────────────────────────────────────────────────
  {
    type: "ac",
    label: "Air conditioner",
    category: "cooling",
    model: "duty",
    // Input kW for the default 1.5 T unit (AC_BASE_KW[1.5]); duty by inverter flag (AC_DUTY).
    defaultWatts: 1150,
    defaultDutyFactor: AC_DUTY.nonInverter,
    defaultHoursPerDay: 6,
    defaultDaysPerMonth: 30,
    questions: [
      {
        key: "acType",
        label: "Type",
        kind: "select",
        options: [
          { value: "split", label: "Split" },
          { value: "window", label: "Window" },
          { value: "cassette", label: "Cassette" },
        ],
      },
      {
        key: "tonnage",
        label: "Tonnage",
        kind: "select",
        options: [
          { value: 1, label: "1 T" },
          { value: 1.5, label: "1.5 T" },
          { value: 2, label: "2 T" },
        ],
      },
      qStar,
      { key: "inverter", label: "Inverter model?", kind: "boolean" },
      qAge,
      qHours("Average across the month — summer nights count."),
      qCount(),
    ],
    icon: "Snowflake",
    highLoad: true,
  },
  {
    type: "air_cooler",
    label: "Air cooler",
    category: "cooling",
    model: "duty",
    defaultWatts: 180,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 6,
    defaultDaysPerMonth: 30,
    questions: [qWatts(), qHours(), qCount()],
    icon: "AirVent",
    highLoad: false,
  },

  // ── Fans & Ventilation ───────────────────────────────────────────────────
  {
    type: "ceiling_fan",
    label: "Ceiling fan",
    category: "fans_ventilation",
    model: "duty",
    defaultWatts: 75,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 8,
    defaultDaysPerMonth: 30,
    questions: [
      {
        key: "fanType",
        label: "Type",
        kind: "select",
        options: [
          { value: "ceiling", label: "Standard" },
          { value: "bldc", label: "BLDC (energy-saving)" },
        ],
        helper: "BLDC fans draw roughly 30 W instead of 75 W.",
      },
      qWatts(),
      qCount("Number of fans"),
      qHours(),
    ],
    icon: "Fan",
    highLoad: false,
  },
  {
    type: "table_fan",
    label: "Table / pedestal fan",
    category: "fans_ventilation",
    model: "duty",
    defaultWatts: 50,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 5,
    defaultDaysPerMonth: 30,
    questions: [
      {
        key: "fanType",
        label: "Type",
        kind: "select",
        options: [
          { value: "table", label: "Table / pedestal" },
          { value: "bldc", label: "BLDC (energy-saving)" },
        ],
      },
      qWatts(),
      qCount("Number of fans"),
      qHours(),
    ],
    icon: "Fan",
    highLoad: false,
  },
  {
    type: "exhaust_fan",
    label: "Exhaust fan",
    category: "fans_ventilation",
    model: "duty",
    defaultWatts: 40,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 1.5,
    defaultDaysPerMonth: 30,
    questions: [
      {
        key: "fanType",
        label: "Type",
        kind: "select",
        options: [{ value: "exhaust", label: "Exhaust" }],
      },
      qWatts(),
      qCount("Number of fans"),
      qHours(),
    ],
    icon: "AirVent",
    highLoad: false,
  },

  // ── Lighting ─────────────────────────────────────────────────────────────
  {
    type: "led_bulb",
    label: "LED bulb",
    category: "lighting",
    model: "duty",
    defaultWatts: 10,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 5.5,
    defaultDaysPerMonth: 30,
    questions: [qCount("Number of bulbs"), qWatts("Typical LED bulbs are 7–12 W."), qHours()],
    icon: "Lightbulb",
    highLoad: false,
  },
  {
    type: "tube_light",
    label: "Tube light",
    category: "lighting",
    model: "duty",
    defaultWatts: 40,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 6,
    defaultDaysPerMonth: 30,
    questions: [
      qCount("Number of tubes"),
      qWatts("Fluorescent tubes 36–40 W; LED battens ~20 W."),
      qHours(),
    ],
    icon: "LampCeiling",
    highLoad: false,
  },
  {
    type: "cfl_bulb",
    label: "CFL bulb",
    category: "lighting",
    model: "duty",
    defaultWatts: 18,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 5,
    defaultDaysPerMonth: 30,
    questions: [qCount("Number of bulbs"), qWatts("Typical CFLs are 11–23 W."), qHours()],
    icon: "Lamp",
    highLoad: false,
  },

  // ── Kitchen ──────────────────────────────────────────────────────────────
  {
    type: "fridge",
    label: "Refrigerator",
    category: "kitchen",
    model: "continuous",
    defaultWatts: 150,
    defaultHoursPerDay: 24,
    defaultDaysPerMonth: 30,
    // 3★ 200–300 L band (FRIDGE_KWH_BANDS); engine applies STAR_MULTIPLIER and age penalty.
    defaultKwhPerMonth: 46,
    questions: [
      {
        key: "fridgeType",
        label: "Type",
        kind: "select",
        options: [
          { value: "single_door", label: "Single door" },
          { value: "double_door", label: "Double door" },
          { value: "side_by_side", label: "Side-by-side" },
        ],
      },
      {
        key: "capacityLitres",
        label: "Capacity",
        kind: "number",
        unit: "L",
        helper: "Single door ≈ 180–200 L, double door ≈ 240–300 L.",
      },
      qStar,
      qAge,
      qCount(),
    ],
    icon: "Refrigerator",
    highLoad: false,
  },
  {
    type: "freezer",
    label: "Deep freezer",
    category: "kitchen",
    model: "continuous",
    defaultWatts: 200,
    defaultHoursPerDay: 24,
    defaultDaysPerMonth: 30,
    defaultKwhPerMonth: 40,
    questions: [
      { key: "capacityLitres", label: "Capacity", kind: "number", unit: "L" },
      qStar,
      qAge,
      qCount(),
    ],
    icon: "ThermometerSnowflake",
    highLoad: false,
  },
  {
    type: "microwave",
    label: "Microwave",
    category: "kitchen",
    model: "duty",
    defaultWatts: 1200,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 0.25,
    defaultDaysPerMonth: 30,
    questions: [qWatts(), qHours("Minutes of use per day ÷ 60, e.g. 15 min = 0.25 h."), qCount()],
    icon: "Microwave",
    highLoad: false,
  },
  {
    type: "mixer_grinder",
    label: "Mixer / grinder",
    category: "kitchen",
    model: "duty",
    defaultWatts: 750,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 0.3,
    defaultDaysPerMonth: 30,
    questions: [qWatts(), qHours("Minutes of use per day ÷ 60, e.g. 18 min = 0.3 h."), qCount()],
    icon: "Blend",
    highLoad: false,
  },
  {
    type: "induction_cooktop",
    label: "Induction cooktop",
    category: "kitchen",
    model: "duty",
    defaultWatts: 1800,
    defaultDutyFactor: 0.8,
    defaultHoursPerDay: 1,
    defaultDaysPerMonth: 30,
    questions: [qWatts(), qHours(), qCount()],
    icon: "CookingPot",
    highLoad: true,
  },
  {
    type: "oven",
    label: "Oven / OTG",
    category: "kitchen",
    model: "duty",
    defaultWatts: 1500,
    defaultDutyFactor: 0.7,
    defaultHoursPerDay: 0.5,
    defaultDaysPerMonth: 12,
    questions: [qWatts(), qHours(), qDays, qCount()],
    icon: "ChefHat",
    highLoad: true,
  },
  {
    type: "kettle",
    label: "Electric kettle",
    category: "kitchen",
    model: "duty",
    defaultWatts: 1500,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 0.15,
    defaultDaysPerMonth: 30,
    questions: [qWatts(), qHours("Minutes of boiling per day ÷ 60."), qCount()],
    icon: "Coffee",
    highLoad: false,
  },
  {
    type: "toaster",
    label: "Toaster",
    category: "kitchen",
    model: "duty",
    defaultWatts: 800,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 0.1,
    defaultDaysPerMonth: 20,
    questions: [qWatts(), qHours(), qDays, qCount()],
    icon: "Sandwich",
    highLoad: false,
  },
  {
    type: "ro_purifier",
    label: "RO water purifier",
    category: "kitchen",
    model: "continuous",
    defaultWatts: 40,
    defaultHoursPerDay: 24,
    defaultDaysPerMonth: 30,
    defaultKwhPerMonth: 6,
    questions: [qCount()],
    icon: "Droplets",
    highLoad: false,
  },

  // ── Water & Heating ──────────────────────────────────────────────────────
  {
    type: "geyser",
    label: "Geyser / water heater",
    category: "water_heating",
    model: "duty",
    defaultWatts: 2000,
    defaultDutyFactor: 0.6,
    defaultHoursPerDay: 1,
    defaultDaysPerMonth: 30,
    questions: [
      {
        key: "geyserLitres",
        label: "Capacity",
        kind: "number",
        unit: "L",
        helper: "Storage geysers are usually 10–25 L.",
      },
      qWatts("Most storage geysers are 2000 W."),
      qHours("Minutes switched on per day ÷ 60."),
      qCount(),
    ],
    icon: "Flame",
    highLoad: true,
  },
  {
    type: "instant_water_heater",
    label: "Instant water heater",
    category: "water_heating",
    model: "duty",
    defaultWatts: 3000,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 0.3,
    defaultDaysPerMonth: 30,
    questions: [qWatts(), qHours("Minutes of hot water per day ÷ 60."), qCount()],
    icon: "ShowerHead",
    highLoad: false,
  },
  {
    type: "water_pump",
    label: "Water pump / motor",
    category: "water_heating",
    model: "duty",
    // 1 HP ≈ 746 W input
    defaultWatts: 750,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 1,
    defaultDaysPerMonth: 30,
    questions: [
      {
        key: "pumpHp",
        label: "Motor rating",
        kind: "select",
        options: [
          { value: 0.5, label: "0.5 HP" },
          { value: 1, label: "1 HP" },
          { value: 1.5, label: "1.5 HP" },
          { value: 2, label: "2 HP" },
        ],
        helper: "1 HP draws about 750 W.",
      },
      qHours("Time the motor runs each day."),
    ],
    icon: "Waves",
    highLoad: true,
  },
  {
    type: "room_heater",
    label: "Room heater",
    category: "water_heating",
    model: "duty",
    defaultWatts: 2000,
    defaultDutyFactor: 0.8,
    defaultHoursPerDay: 3,
    defaultDaysPerMonth: 30,
    questions: [
      qWatts(),
      qHours("Winter months only — set days per month accordingly."),
      qDays,
      qCount(),
    ],
    icon: "Heater",
    highLoad: true,
  },

  // ── Laundry ──────────────────────────────────────────────────────────────
  {
    type: "washing_machine",
    label: "Washing machine",
    category: "laundry",
    model: "per-cycle",
    defaultWatts: 500,
    defaultHoursPerDay: 1,
    defaultDaysPerMonth: 30,
    // top_load default; see WM_KWH_PER_CYCLE for front_load (0.9) / semi_automatic (0.3)
    kwhPerCycle: WM_KWH_PER_CYCLE.top_load,
    defaultCyclesPerWeek: 4,
    questions: [
      {
        key: "wmType",
        label: "Type",
        kind: "select",
        options: [
          { value: "top_load", label: "Top load" },
          { value: "front_load", label: "Front load" },
          { value: "semi_automatic", label: "Semi-automatic" },
        ],
      },
      { key: "capacityKg", label: "Capacity", kind: "number", unit: "kg" },
      qLoads,
      qCount(),
    ],
    icon: "WashingMachine",
    highLoad: true,
  },
  {
    type: "dryer",
    label: "Clothes dryer",
    category: "laundry",
    model: "per-cycle",
    defaultWatts: 2000,
    defaultHoursPerDay: 1,
    defaultDaysPerMonth: 30,
    kwhPerCycle: 2.5,
    defaultCyclesPerWeek: 2,
    questions: [qLoads, qCount()],
    icon: "Wind",
    highLoad: false,
  },
  {
    type: "dishwasher",
    label: "Dishwasher",
    category: "laundry",
    model: "per-cycle",
    defaultWatts: 1500,
    defaultHoursPerDay: 1.5,
    defaultDaysPerMonth: 30,
    kwhPerCycle: 1.2,
    defaultCyclesPerWeek: 5,
    questions: [qLoads, qCount()],
    icon: "UtensilsCrossed",
    highLoad: false,
  },

  // ── Entertainment ────────────────────────────────────────────────────────
  {
    type: "tv",
    label: "Television",
    category: "entertainment",
    model: "duty",
    // 55" LED ≈ 100 W; see TV_WATTS_BY_INCH for other sizes
    defaultWatts: 100,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 5,
    defaultDaysPerMonth: 30,
    questions: [
      {
        key: "screenInches",
        label: "Screen size",
        kind: "select",
        options: [
          { value: 32, label: '32"' },
          { value: 43, label: '43"' },
          { value: 55, label: '55"' },
          { value: 65, label: '65"' },
        ],
      },
      qHours(),
      qCount(),
    ],
    icon: "Tv",
    highLoad: false,
  },
  {
    type: "set_top_box",
    label: "Set-top box",
    category: "entertainment",
    model: "continuous",
    defaultWatts: 20,
    defaultHoursPerDay: 24,
    defaultDaysPerMonth: 30,
    defaultKwhPerMonth: 8,
    questions: [qCount()],
    icon: "Cable",
    highLoad: false,
  },
  {
    type: "speaker",
    label: "Speaker / home theatre",
    category: "entertainment",
    model: "duty",
    defaultWatts: 30,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 2,
    defaultDaysPerMonth: 30,
    questions: GENERIC_QUESTIONS,
    icon: "Speaker",
    highLoad: false,
  },

  // ── Computing & Electronics ──────────────────────────────────────────────
  {
    type: "router",
    label: "Wi-Fi router",
    category: "computing",
    model: "continuous",
    defaultWatts: 10,
    defaultHoursPerDay: 24,
    defaultDaysPerMonth: 30,
    defaultKwhPerMonth: 7,
    questions: [qHours("Most routers stay on 24 h."), qCount(), qWatts()],
    icon: "Router",
    highLoad: false,
  },
  {
    type: "laptop",
    label: "Laptop",
    category: "computing",
    model: "duty",
    defaultWatts: 60,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 6,
    defaultDaysPerMonth: 30,
    questions: GENERIC_QUESTIONS,
    icon: "Laptop",
    highLoad: false,
  },
  {
    type: "desktop",
    label: "Desktop PC",
    category: "computing",
    model: "duty",
    defaultWatts: 200,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 4,
    defaultDaysPerMonth: 30,
    questions: GENERIC_QUESTIONS,
    icon: "Monitor",
    highLoad: false,
  },
  {
    type: "printer",
    label: "Printer",
    category: "computing",
    model: "duty",
    defaultWatts: 50,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 0.2,
    defaultDaysPerMonth: 10,
    questions: [qHours(), qDays, qCount(), qWatts()],
    icon: "Printer",
    highLoad: false,
  },

  // ── Other ────────────────────────────────────────────────────────────────
  {
    type: "iron",
    label: "Iron",
    category: "other",
    model: "duty",
    defaultWatts: 1000,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 0.5,
    defaultDaysPerMonth: 12,
    questions: [
      qWatts(),
      qHours("Minutes of ironing on a typical ironing day ÷ 60."),
      qDays,
      qCount(),
    ],
    icon: "Shirt",
    highLoad: false,
  },
  {
    type: "ev_charger",
    label: "EV charger",
    category: "other",
    model: "duty",
    defaultWatts: 3300,
    defaultDutyFactor: 0.9,
    defaultHoursPerDay: 2,
    defaultDaysPerMonth: 20,
    questions: [qWatts("Home AC chargers are 3.3 kW or 7.2 kW."), qHours(), qDays, qCount()],
    icon: "BatteryCharging",
    highLoad: true,
  },
  {
    type: "other",
    label: "Other appliance",
    category: "other",
    model: "duty",
    defaultWatts: 100,
    defaultDutyFactor: 1,
    defaultHoursPerDay: 2,
    defaultDaysPerMonth: 30,
    questions: [qWatts(), qHours(), qDays, qCount()],
    icon: "Plug",
    highLoad: false,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Nine wizard categories in display order. */
export const CATEGORY_ORDER: ApplianceCategory[] = [
  "cooling",
  "fans_ventilation",
  "lighting",
  "kitchen",
  "water_heating",
  "laundry",
  "entertainment",
  "computing",
  "other",
];

/** Human labels for the nine categories (mirrors `APPLIANCE_CATEGORY_LABEL`). */
export const CATEGORY_LABELS: Record<ApplianceCategory, string> = { ...APPLIANCE_CATEGORY_LABEL };

const CATALOGUE_MAP: Record<ApplianceType, ApplianceCatalogueEntry> = APPLIANCE_CATALOGUE.reduce(
  (acc, entry) => {
    acc[entry.type] = entry;
    return acc;
  },
  {} as Record<ApplianceType, ApplianceCatalogueEntry>,
);

/** Catalogue entry for a type. Falls back to the generic "other" entry for safety. */
export function getCatalogueEntry(type: ApplianceType): ApplianceCatalogueEntry {
  return CATALOGUE_MAP[type] ?? CATALOGUE_MAP.other;
}

/** Entries grouped by category, in catalogue order (high-load items first within a group). */
export const CATALOGUE_BY_CATEGORY: Record<ApplianceCategory, ApplianceCatalogueEntry[]> =
  CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = APPLIANCE_CATALOGUE.filter((e) => e.category === category).sort(
        (a, b) => Number(b.highLoad) - Number(a.highLoad),
      );
      return acc;
    },
    {} as Record<ApplianceCategory, ApplianceCatalogueEntry[]>,
  );

/** Types shown first in the checklist ("high-load appliances"). */
export const HIGH_LOAD_TYPES: ApplianceType[] = APPLIANCE_CATALOGUE.filter((e) => e.highLoad).map(
  (e) => e.type,
);
