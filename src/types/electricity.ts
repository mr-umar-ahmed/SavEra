import type {
  ConfidenceLevel,
  ConsumptionStatus,
  EstimateInput,
  IsoDate,
  MonthKey,
  Season,
  SetupSection,
  SetupStatus,
} from "./common";
import type { ApplianceCategory, ApplianceType, ConsumerCategory } from "./household";

/** How a bill record entered the system. `seed` marks pre-seeded demo history. */
export type BillSource = "upload" | "manual" | "import" | "seed";

/** One electricity bill. `kwh` is a measured value and is never labelled estimated. */
export interface ElectricityBill {
  id: string;
  householdId: string;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  billDate: IsoDate;
  /** Month the bill is attributed to (`YYYY-MM`). */
  month: MonthKey;
  kwh: number;
  /** Billed amount in ₹, when known. */
  amount?: number;
  meterPrev?: number;
  meterCurr?: number;
  consumerCategory?: ConsumerCategory;
  tariffName?: string;
  source: BillSource;
}

/** Result of the simulated bill OCR (`simulateOcr`). Always labelled "Simulated". */
export interface OcrExtraction {
  kwh: number;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  billDate: IsoDate;
  meterPrev: number;
  meterCurr: number;
  consumerCategory: ConsumerCategory;
  tariffName: string;
  amount: number;
  confidence: ConfidenceLevel;
  simulated: true;
}

/** Estimated monthly contribution of one appliance line (MASTER_PROMPT §8.1). */
export interface ApplianceEstimate {
  applianceId: string;
  type: ApplianceType;
  label: string;
  category: ApplianceCategory;
  /** Estimated kWh for the month (after any reconciliation scaling). */
  kwh: number;
  /** Average power draw while on, when meaningful (used by the twin). */
  kwAvg?: number;
  confidence: ConfidenceLevel;
  inputs: EstimateInput[];
  /** Plain-language assumptions, e.g. "Duty factor 0.75 (non-inverter)". */
  assumptions: string[];
}

/** Meter reconciliation (§8.4): actual vs Σ appliance estimates. */
export interface Reconciliation {
  actualKwh: number;
  estimatedTotal: number;
  /** actual − Σ estimates; zero when estimates were scaled down. */
  unallocatedKwh: number;
  /** True when estimates were scaled proportionally to the meter reading. */
  scaled: boolean;
  /** e.g. "Estimates scaled to meter reading". */
  note?: string;
  estimates: ApplianceEstimate[];
}

export type BaselineKind = "default" | "personalized" | "seasonal";

/** A consumption band the current month is compared against (§8.2). */
export interface Baseline {
  kind: BaselineKind;
  low: number;
  high: number;
  mid: number;
  season?: Season;
  confidence: ConfidenceLevel;
  inputs: EstimateInput[];
  /** Number of bills the band was built from. */
  billCount: number;
  note?: string;
}

/** Baseline band for one season (Summer / Normal / Winter). */
export interface SeasonalBaseline extends Baseline {
  season: Season;
  /** Months (of the bill history) that contributed to this band. */
  months: MonthKey[];
}

/** Per-appliance change between two months. */
export interface ApplianceDelta {
  type: ApplianceType;
  label: string;
  prev: number;
  curr: number;
  delta: number;
}

/** Month-on-month comparison (§8.5). Contributors are possibilities, never causes. */
export interface MonthOnMonth {
  prevMonth: MonthKey;
  currMonth: MonthKey;
  prevKwh: number;
  currKwh: number;
  delta: number;
  deltaPct: number;
  /** Ranked by absolute delta, largest first. */
  applianceDeltas: ApplianceDelta[];
  /** "Largest estimated contributor" to the change. */
  largestContributor?: { type: ApplianceType; label: string; delta: number };
  /** Rule-based possible contributors, e.g. "Seasonal cooling demand". */
  contributors: string[];
}

/** One slab of a rising-block tariff; `upto: null` is the open-ended top slab. */
export interface TariffSlab {
  upto: number | null;
  /** ₹ per kWh. */
  rate: number;
}

/** Demo slab tariff (§8.8) — labelled "Demo tariff — configurable". */
export interface Tariff {
  name: string;
  slabs: TariffSlab[];
  fixedCharge: number;
  taxPct: number;
  note: string;
}

export interface SlabLine {
  label: string;
  units: number;
  rate: number;
  amount: number;
}

/** Bill computed from kWh under a tariff. */
export interface BillBreakdown {
  kwh: number;
  energyCharge: number;
  fixedCharge: number;
  tax: number;
  total: number;
  slabLines: SlabLine[];
}

/** Next-month kWh forecast (§8.7). */
export interface KwhForecast {
  month: MonthKey;
  low: number;
  point: number;
  high: number;
  /** "Why" drivers, e.g. "Seasonal factor for October (+3 %)". */
  drivers: string[];
  expectedChangePct: number;
  confidence: ConfidenceLevel;
  inputs: EstimateInput[];
}

/** kWh forecast plus the financial forecast under the demo tariff. */
export interface Forecast extends KwhForecast {
  billLow: number;
  billPoint: number;
  billHigh: number;
  /** "Estimated — actual bill may differ based on tariff, fixed charges, taxes and other billing components." */
  disclaimer: string;
}

/** A rule-based recommendation (§8.9). Wording always "may reduce". */
export interface Recommendation {
  id: string;
  applianceType: ApplianceType;
  title: string;
  /** The concrete action, e.g. "Raise AC setpoint from 24 °C to 26 °C". */
  action: string;
  why: string;
  kwhSavingLow: number;
  kwhSavingHigh: number;
  rupeeLow: number;
  rupeeHigh: number;
  /** Twin device this recommendation can be applied to. */
  twinDeviceId?: string;
  /** Patch applied to the twin device when "applied", e.g. `{ setpointC: 26 }`. */
  twinPatch?: Record<string, number | boolean>;
}

/** Everything the dashboard needs for one month. */
export interface MonthlyEnergyProfile {
  householdId: string;
  month: MonthKey;
  /** Measured kWh from the bill (or reconciled estimate when no bill exists). */
  actualKwh: number;
  isCurrent: boolean;
  estimates: ApplianceEstimate[];
  reconciliation: Reconciliation;
  baseline: Baseline;
  status: ConsumptionStatus;
  contributors: string[];
  confidence: ConfidenceLevel;
  /** Bill amount in ₹ when known. */
  bill?: number;
}

export type CompletenessKey = SetupSection | "appliances" | "bills";

/** One row of the "Home Energy Profile — NN% Complete" table. */
export interface CompletenessSection {
  key: CompletenessKey;
  label: string;
  status: SetupStatus;
  /** What completing this would improve. */
  hint: string;
  /** Contribution to the overall percent (weights sum to 1). */
  weight: number;
}

/** Setup completeness — a score, never a gate. */
export interface CompletenessReport {
  percent: number;
  sections: CompletenessSection[];
  nextAction?: { label: string; href: string };
}

/** Orchestrated output of `buildEnergyAnalysis` consumed by the electricity dashboard. */
export interface EnergyAnalysis {
  householdId: string;
  /** Oldest → newest, ending with the current month. */
  months: MonthlyEnergyProfile[];
  current: MonthlyEnergyProfile;
  previous?: MonthlyEnergyProfile;
  mom?: MonthOnMonth;
  forecast: Forecast;
  recommendations: Recommendation[];
  baseline: Baseline;
  /** Present once ≥6 bills exist. */
  seasonal: SeasonalBaseline[] | null;
  confidence: ConfidenceLevel;
  completeness: CompletenessReport;
  billCount: number;
  /** Appliance detail score 0..1 (§8.3). */
  detailScore: number;
}
