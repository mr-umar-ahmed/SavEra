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
