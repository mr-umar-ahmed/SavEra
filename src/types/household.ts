import type { IsoDateTime, SetupSection, SetupStatus } from "./common";

/** Home type chosen in household details. */
export type HomeType = "1BHK" | "2BHK" | "3BHK" | "independent" | "villa" | "other";

/** Renewable energy opted by the household. */
export type Renewable = "none" | "rooftop_solar" | "solar_water_heater";

/** Electricity consumer category (drives tariff selection). */
export type ConsumerCategory = "domestic" | "bpl" | "commercial";

/** Every appliance kind the catalogue knows about. */
export type ApplianceType =
  | "ac"
  | "air_cooler"
  | "fridge"
  | "freezer"
  | "ceiling_fan"
  | "table_fan"
  | "exhaust_fan"
  | "led_bulb"
  | "tube_light"
  | "cfl_bulb"
  | "tv"
  | "set_top_box"
  | "speaker"
  | "geyser"
  | "instant_water_heater"
  | "water_pump"
  | "ro_purifier"
  | "washing_machine"
  | "dryer"
  | "dishwasher"
  | "microwave"
  | "mixer_grinder"
  | "induction_cooktop"
  | "oven"
  | "kettle"
  | "toaster"
  | "router"
  | "laptop"
  | "desktop"
  | "printer"
  | "iron"
  | "room_heater"
  | "ev_charger"
  | "other";

/** Checklist grouping used by the electricity setup wizard. */
export type ApplianceCategory =
  | "cooling"
  | "fans_ventilation"
  | "lighting"
  | "kitchen"
  | "water_heating"
  | "laundry"
  | "entertainment"
  | "computing"
  | "other";

export type AcType = "split" | "window" | "cassette";
export type AcTonnage = 1 | 1.5 | 2;
export type StarRating = 1 | 2 | 3 | 4 | 5;
export type FridgeType = "single_door" | "double_door" | "side_by_side";
export type FanType = "ceiling" | "table" | "exhaust" | "bldc";
export type WashingMachineType = "top_load" | "front_load" | "semi_automatic";

/** Appliance characteristics; every field optional — unknown values fall back to catalogue defaults. */
export interface ApplianceSpec {
  acType?: AcType;
  tonnage?: AcTonnage;
  star?: StarRating;
  inverter?: boolean;
  ageYears?: number;
  capacityLitres?: number;
  fridgeType?: FridgeType;
  fanType?: FanType;
  watts?: number;
  wmType?: WashingMachineType;
  capacityKg?: number;
  loadsPerWeek?: number;
  screenInches?: number;
  brand?: string;
  model?: string;
  ratedWatts?: number;
  bulbCount?: number;
  geyserLitres?: number;
  pumpHp?: number;
}

/** How an appliance record entered the system. */
export type ApplianceSource = "manual" | "scan" | "import";

/** One appliance line in a household's inventory. */
export interface Appliance {
  id: string;
  householdId: string;
  type: ApplianceType;
  category: ApplianceCategory;
  /** Display label, e.g. "Split AC 1.5 T". */
  label: string;
  spec: ApplianceSpec;
  count: number;
  hoursPerDay?: number;
  daysPerMonth?: number;
  ageYears?: number;
  setupStatus: SetupStatus;
  source: ApplianceSource;
  addedAt?: IsoDateTime;
}

/** Keys a wizard question may write to. */
export type ApplianceQuestionKey =
  keyof ApplianceSpec | "count" | "hoursPerDay" | "daysPerMonth" | "ageYears";

export interface ApplianceQuestionOption {
  value: string | number | boolean;
  label: string;
}

/** A progressive-disclosure question shown for a given appliance type. */
export interface ApplianceQuestion {
  key: ApplianceQuestionKey;
  label: string;
  kind: "select" | "number" | "boolean";
  options?: ApplianceQuestionOption[];
  /** Unit hint shown next to number inputs, e.g. "W", "L", "h/day". */
  unit?: string;
  /** Helper text under the field. */
  helper?: string;
}

/** Estimation model used by the engine for a catalogue entry (MASTER_PROMPT §8.1). */
export type ApplianceModel = "duty" | "continuous" | "per-cycle";

/** Static catalogue definition for one appliance type. */
export interface ApplianceCatalogueEntry {
  type: ApplianceType;
  label: string;
  category: ApplianceCategory;
  model: ApplianceModel;
  defaultWatts: number;
  /** Duty-model only: fraction of rated power drawn on average while on. */
  defaultDutyFactor?: number;
  defaultHoursPerDay: number;
  defaultDaysPerMonth: number;
  /** Continuous-model only: typical kWh/month. */
  defaultKwhPerMonth?: number;
  /** Per-cycle-model only. */
  kwhPerCycle?: number;
  defaultCyclesPerWeek?: number;
  questions: ApplianceQuestion[];
  /** lucide-react icon name, e.g. "Snowflake". */
  icon: string;
  /** Shown first in the checklist ("high-load appliances"). */
  highLoad: boolean;
}

/** Entry in the simulated barcode/model-code lookup used by Smart Appliance Scan. */
export interface BarcodeEntry {
  code: string;
  brand: string;
  model: string;
  type: ApplianceType;
  star?: StarRating;
  ratedWatts: number;
  tonnage?: AcTonnage;
  capacityLitres?: number;
  capacityKg?: number;
  screenInches?: number;
  yearIntroduced: number;
}

export type WaterSource = "municipal" | "borewell" | "tanker" | "mixed";

/** Household water setup (MASTER_PROMPT §6 "Water Setup"). */
export interface HouseholdWater {
  /** Usage points mapped, e.g. "Kitchen", "Bathroom 1", "Garden". */
  usagePoints: string[];
  /** Area whose supply schedule applies (normally the household's own area). */
  scheduleAreaId: string;
  storageLitres?: number;
  source: WaterSource;
}

export type GasKind = "lpg" | "piped";
export type LpgCylinderSize = 5 | 14.2 | 19;

/** Household gas setup. */
export interface HouseholdGas {
  kind: GasKind;
  cylinderSizeKg: LpgCylinderSize;
  /** Generic provider label, never a real brand. */
  provider: string;
}

/** A citizen household — the root entity of the citizen portal. */
export interface Household {
  id: string;
  areaId: string;
  wardId: string;
  zoneId: string;
  name?: string;
  mobile?: string;
  /** Postal PIN code. */
  pin?: string;
  /** Electricity provider id (generic demo provider). */
  providerId: string;
  consumerCategory: ConsumerCategory;
  people: number;
  homeType: HomeType;
  sizeSqft?: number;
  renewable: Renewable;
  /** Setup status per section, drives the completeness score. */
  sections: Record<SetupSection, SetupStatus>;
  water?: HouseholdWater;
  gas?: HouseholdGas;
  createdAt: IsoDateTime;
  /** Leaderboard display name (shown only when `displayNamePublic`). */
  displayName?: string;
  displayNamePublic: boolean;
}

export const APPLIANCE_CATEGORY_LABEL: Record<ApplianceCategory, string> = {
  cooling: "Cooling",
  fans_ventilation: "Fans & Ventilation",
  lighting: "Lighting",
  kitchen: "Kitchen",
  water_heating: "Water & Heating",
  laundry: "Laundry",
  entertainment: "Entertainment",
  computing: "Computing & Electronics",
  other: "Other",
};

export const HOME_TYPE_LABEL: Record<HomeType, string> = {
  "1BHK": "1 BHK",
  "2BHK": "2 BHK",
  "3BHK": "3 BHK",
  independent: "Independent house",
  villa: "Villa",
  other: "Other",
};

export const RENEWABLE_LABEL: Record<Renewable, string> = {
  none: "None",
  rooftop_solar: "Rooftop solar",
  solar_water_heater: "Solar water heater",
};

export const CONSUMER_CATEGORY_LABEL: Record<ConsumerCategory, string> = {
  domestic: "Domestic",
  bpl: "BPL",
  commercial: "Commercial",
};

export const SETUP_STATUS_LABEL: Record<SetupStatus, string> = {
  complete: "Complete",
  partial: "Partial",
  later: "Set up later",
  none: "Not added",
};

export const SETUP_SECTION_LABEL: Record<SetupSection, string> = {
  household: "Household details",
  electricity: "Electricity",
  water: "Water",
  gas: "Gas & Heating",
  carbon: "Carbon footprint",
};
