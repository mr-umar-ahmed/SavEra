/**
 * Response and request shapes of the SAVERA backend (`backend/app/models/*.py`).
 *
 * These are hand-written rather than generated so the UI only carries what it
 * actually renders. When a backend model changes, the matching interface here
 * is the single place to follow it.
 */

export type ResourceType = "electricity" | "water" | "lpg";
export type ReadingSource = "manual" | "ocr" | "ami";
export type UserRole = "citizen" | "supervisor" | "admin";

// --- profile ---------------------------------------------------------------

export interface Ward {
  id: number;
  name: string;
  city: string;
  lat: number | null;
  lng: number | null;
}

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  ward_id: number | null;
  ward_name: string | null;
  household_size: number;
  city: string;
  role: UserRole;
  push_enabled: boolean;
  /** True once a ward is chosen — the one thing onboarding cannot default. */
  onboarding_complete: boolean;
  created_at: string;
}

export interface ProfileUpdate {
  name?: string | null;
  ward_id?: number | null;
  household_size?: number;
  city?: string;
}

// --- appliances ------------------------------------------------------------

export type ApplianceType =
  | "ac_1ton"
  | "ac_1.5ton"
  | "ac_2ton"
  | "refrigerator"
  | "ceiling_fan"
  | "geyser"
  | "washing_machine"
  | "tv_led_40"
  | "tv_led_55"
  | "other";

/** One entry of the static catalog served by `GET /profile/appliance-types`. */
export interface ApplianceTypeInfo {
  type: ApplianceType;
  label: string;
  has_star_rating: boolean;
  default_hours: number;
  /** Runs 24 h a day, so `daily_hours` is ignored for it. */
  always_on: boolean;
  watts_by_star: Record<string, number>;
  default_watts: number;
}

export interface ApplianceInput {
  type: ApplianceType;
  count: number;
  daily_hours: number;
  star_rating?: number | null;
  wattage_override?: number | null;
}

export interface Appliance extends ApplianceInput {
  id: string;
  /** Watts one unit is estimated at — from BEE wattages, never measured. */
  effective_watts: number;
}

// --- readings --------------------------------------------------------------

export interface ElectricityReading {
  id: string;
  kwh: number;
  billing_period_start: string;
  billing_period_end: string;
  /** Inclusive day count of the period. */
  billing_days: number;
  /** `kwh / billing_days * 30`, so bills of different lengths compare. */
  kwh_per_30d: number;
  billed_amount: number | null;
  source: ReadingSource;
  bill_image_url: string | null;
  created_at: string;
}

export interface ElectricityReadingInput {
  kwh: number;
  billing_period_start: string;
  billing_period_end: string;
  billed_amount?: number | null;
  source?: ReadingSource;
  ocr_job_id?: string | null;
}

export interface WaterReading {
  id: string;
  liters: number;
  reading_date: string;
  source: ReadingSource;
  created_at: string;
}

export interface WaterReadingCreated extends WaterReading {
  /** True when this corrected a figure already logged for the same day. */
  replaced: boolean;
}

export interface WaterReadingInput {
  liters: number;
  reading_date: string;
  source?: ReadingSource;
}

// --- LPG -------------------------------------------------------------------

export interface LpgCycle {
  id: string;
  cylinder_kg: number;
  start_date: string;
  end_date: string | null;
  /** kg/day, set when the cylinder is closed. */
  daily_burn_rate: number | null;
  days: number;
  is_open: boolean;
}

/** Keys are exactly those of `services/lpg.predict_finish` (SPEC 5.3). */
export interface LpgPrediction {
  estimated_finish_date: string;
  refill_alert_date: string;
  kg_remaining: number;
  burn_rate_kg_per_day: number;
  days_to_empty: number;
  should_alert_now: boolean;
  pct_remaining: number;
  days_elapsed: number;
}

export interface LpgCurrent {
  cycle: LpgCycle | null;
  prediction: LpgPrediction | null;
}

// --- bill OCR --------------------------------------------------------------

export type OcrStatus = "pending" | "done" | "failed";
export type OcrEngine = "gcv" | "tesseract" | "none";

export interface BillExtraction {
  kwh: number | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  billed_amount: number | null;
  utility: string | null;
  field_confidence: Record<string, number>;
  warnings: string[];
}

export interface OcrJobCreated {
  id: string;
  status: OcrStatus;
}

export interface OcrJob {
  id: string;
  status: OcrStatus;
  engine: OcrEngine | null;
  confidence: number | null;
  needs_review: boolean | null;
  extraction: BillExtraction | null;
  raw_text: string | null;
  image_url: string | null;
  error_code: string | null;
  reading_id: string | null;
  created_at: string;
  finished_at: string | null;
}

// --- alerts ----------------------------------------------------------------

export type AlertType =
  | "high_consumption"
  | "leak_suspected"
  | "refill_due_soon"
  | "refill_overdue"
  | "milestone"
  | "weekly_digest";

/** Whatever the pipeline attached to an alert; every field is optional by design. */
export interface AlertContext {
  pct_over?: number;
  current?: number;
  baseline_mean?: number;
  severity?: "none" | "medium" | "high";
  weather_context?: string | null;
  tips?: string[];
  top_appliance?: string | null;
  estimated_finish_date?: string;
  kg_remaining?: number;
  total_score?: number | null;
}

export interface Alert {
  id: string;
  resource_type: ResourceType | "general";
  alert_type: AlertType;
  title: string;
  message: string;
  context: AlertContext | null;
  is_read: boolean;
  created_at: string;
}

// --- insights --------------------------------------------------------------

export type Status = "good" | "warn" | "bad" | "unknown";

export interface Baseline {
  mean: number;
  std_dev: number;
  upper_threshold: number;
  lower_threshold: number;
  sample_count: number;
}

export interface ResourceSummary {
  current: number | null;
  unit: string;
  baseline: Baseline | null;
  status: Status;
  pct_vs_baseline: number | null;
  period_start: string | null;
  period_end: string | null;
}

export interface LpgSummary {
  cycle: {
    id: string;
    cylinder_kg: number;
    start_date: string;
    days: number;
    is_open: boolean;
  } | null;
  prediction: LpgPrediction | null;
}

export interface GreenScore {
  month: string;
  electricity_score: number | null;
  water_score: number | null;
  lpg_score: number | null;
  total_score: number | null;
  ward_percentile: number | null;
}

export interface PeerComparison {
  available: boolean;
  reason: string | null;
  ward_name: string | null;
  avg_per_household: number | null;
  avg_per_person: number | null;
  yours: number | null;
  pct_diff: number | null;
  household_count: number | null;
}

export interface WardRank {
  available: boolean;
  line: string | null;
  pct_diff: number | null;
  reason: string | null;
}

export interface Dashboard {
  electricity: ResourceSummary;
  water: ResourceSummary;
  lpg: LpgSummary;
  green_score: GreenScore | null;
  normalisation_note: string;
  unread_alerts: number;
  ward_rank: WardRank;
}

export interface ElectricityPoint {
  period_start: string;
  period_end: string;
  kwh: number;
  kwh_per_30d: number;
}

export interface ApplianceShare {
  type: ApplianceType;
  label: string;
  kwh: number;
  pct: number;
}

export interface ElectricityInsights {
  history: ElectricityPoint[];
  baseline: Baseline | null;
  appliance_breakdown: ApplianceShare[];
  unknown_load: number;
  estimate_note: string;
  tips: string[];
  over_baseline: boolean;
  peer_comparison: PeerComparison;
}

export interface WaterPoint {
  reading_date: string;
  liters: number;
}

export interface WaterMonth {
  month: string;
  avg_liters: number;
  total_liters: number;
  days_logged: number;
}

export interface WaterInsights {
  history: WaterPoint[];
  monthly: WaterMonth[];
  baseline: Baseline | null;
  tips: string[];
  over_baseline: boolean;
  peer_comparison: PeerComparison;
}

export interface LpgCycleTimelineEntry {
  id: string;
  cylinder_kg: number;
  start_date: string;
  end_date: string | null;
  daily_burn_rate: number | null;
  days: number;
  is_open: boolean;
}

export interface LpgInsights {
  cycles: LpgCycleTimelineEntry[];
  current: LpgSummary;
  baseline: Baseline | null;
  tips: string[];
  over_baseline: boolean;
}

export interface GreenScoreInsights {
  current: GreenScore | null;
  history: GreenScore[];
  normalisation_note: string;
}

// --- supervisor ----------------------------------------------------------------

export interface SupervisorWard {
  id: number;
  name: string;
  city: string;
}

export interface HeatmapResource {
  resource_type: ResourceType;
  avg_consumption: number;
  household_count: number;
  pct_change_vs_prev: number | null;
  anomaly_flag: boolean;
}

export interface HeatmapResponse {
  ward_id: number;
  ward_name: string;
  resources: HeatmapResource[];
}

export interface AnomalyWard {
  ward_id: number;
  ward_name: string;
  resource_type: ResourceType;
  avg_consumption: number;
  pct_change_vs_prev: number | null;
  household_count: number;
}

export interface ComparisonWard {
  ward_id: number;
  ward_name: string;
  avg_per_household: number;
  avg_per_person: number;
  household_count: number;
}
