import type { IsoDate, IsoDateTime, Tone } from "./common";

/** Citizen answer to "How was today's water supply?". */
export type WaterExperience =
  "sufficient" | "less_than_usual" | "very_low" | "no_water" | "low_pressure" | "short_duration";

export type WaterIssueType =
  "insufficient" | "low_pressure" | "short_duration" | "no_water" | "quality" | "other";

/** Planned supply window for an area (e.g. XYZ Colony 07:00–08:00 daily, 4,50,000 L). */
export interface WaterSupplySchedule {
  areaId: string;
  /** `HH:MM` 24-hour. */
  start: string;
  /** `HH:MM` 24-hour. */
  end: string;
  plannedLitres: number;
  frequency: "daily" | "alternate";
  note?: string;
}

export type WaterReportStatus =
  "submitted" | "grouped" | "under_review" | "verified" | "actioned" | "closed";

/** One citizen water-supply report. */
export interface WaterReport {
  id: string;
  householdId: string;
  areaId: string;
  wardId: string;
  /** Supply date the report refers to. */
  date: IsoDate;
  submittedAt: IsoDateTime;
  experience: WaterExperience;
  issueType?: WaterIssueType;
  description?: string;
  /** Minutes of supply actually received. */
  durationMin?: number;
  /** "Was your requirement satisfied?" */
  satisfied?: boolean;
  /** Attached photo/video names (demo only). */
  media?: string[];
  status: WaterReportStatus;
  /** Case this report was grouped into, once grouped. */
  caseId?: string;
}

/** Report counts by experience class for a case or area. */
export interface WaterBreakdown {
  insufficient: number;
  lowPressure: number;
  shortDuration: number;
  noWater: number;
  sufficient: number;
}

export type CaseSeverity = "high" | "moderate" | "normal";

/** Water case pipeline states (MASTER_PROMPT §8.12). */
export type CaseState =
  | "detected"
  | "under_review"
  | "verification_assigned"
  | "verification_in_progress"
  | "verified"
  | "not_confirmed"
  | "needs_more"
  | "forwarded"
  | "action_scheduled"
  | "resolved";

export type ValidationDecision = "confirm" | "reject" | "needs_more";

/** Events accepted by `transitionCase`. Illegal transitions throw. */
export type CaseEvent =
  | { type: "review" }
  | { type: "assign"; assistantId: string; checklist: string[] }
  | { type: "start_verification" }
  | { type: "field_update"; patch: Partial<FieldVerification> }
  | { type: "submit_field_report" }
  | { type: "validate"; decision: ValidationDecision; note?: string }
  | { type: "forward" }
  | { type: "department_action"; action: DepartmentAction }
  | { type: "resolve" }
  | { type: "monitor" }
  | { type: "request_info" };

/** Field assistant or team available to a supervisor. */
export interface FieldAssistant {
  id: string;
  name: string;
  kind: "individual" | "team";
  available: boolean;
  phone?: string;
}

export interface FieldChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export type WaterAvailability = "normal" | "low" | "very_low" | "none";
export type WaterPressure = "normal" | "low" | "very_low";

/** Live field verification record, advanced by "Simulate field update". */
export interface FieldVerification {
  assistantId: string;
  assignedAt: IsoDateTime;
  checklist: FieldChecklistItem[];
  gpsActive: boolean;
  /** Demo progress step 0..5 (0 = assigned, 5 = report ready). */
  progress: number;
  /** `HH:MM` observed supply start. */
  observedStart?: string;
  /** `HH:MM` observed supply end. */
  observedEnd?: string;
  durationMin?: number;
  availability?: WaterAvailability;
  pressure?: WaterPressure;
  affectedStreets: string[];
  /** Evidence item names (photos / notes), demo only. */
  evidence: string[];
  notes?: string;
  submittedAt?: IsoDateTime;
  timeline: { at: IsoDateTime; text: string }[];
}

/** Supervisor validation of a field report. */
export interface Validation {
  decision: ValidationDecision;
  note?: string;
  at: IsoDateTime;
  /** User id of the validating supervisor. */
  by: string;
}

export type DepartmentActionType =
  "supply_adjustment" | "pressure_boost" | "tanker_dispatch" | "maintenance" | "other";

/** Action recorded by the Water Supply Board on a forwarded case. */
export interface DepartmentAction {
  caseId: string;
  actionType: DepartmentActionType;
  description: string;
  /** New planned supply window, e.g. 07:00–08:15. */
  newSchedule?: { start: string; end: string };
  scheduledFor?: IsoDate;
  status: "scheduled" | "in_progress" | "completed";
  updatedAt: IsoDateTime;
  /** User id of the department officer. */
  by: string;
}

export type AvailabilityVsExpected = "as_expected" | "below" | "significantly_below";
export type ReportFrequency = "low" | "medium" | "high";
export type HistoricalComparison = "normal" | "below_normal" | "above_normal";

/** An AI-grouped water supply case. Aggregates only — never exposes household ids. */
export interface WaterCase {
  id: string;
  areaId: string;
  wardId: string;
  stream: "water";
  severity: CaseSeverity;
  reportCount: number;
  householdsAffected: number;
  /** Distinct households that submitted a report in the window. */
  respondents: number;
  breakdown: WaterBreakdown;
  plannedWindow: { start: string; end: string; plannedLitres: number };
  availabilityVsExpected: AvailabilityVsExpected;
  reportFrequency: ReportFrequency;
  historicalComparison: HistoricalComparison;
  /** Always "possible supply-demand gap" wording — never a physical cause. */
  aiAssessment: string;
  verificationRequired: boolean;
  state: CaseState;
  detectedAt: IsoDateTime;
  updatedAt: IsoDateTime;
  assignment?: { assistantId: string; at: IsoDateTime; by: string };
  verification?: FieldVerification;
  validation?: Validation;
  departmentAction?: DepartmentAction;
  history: { state: CaseState; at: IsoDateTime; note?: string }[];
}

export const WATER_EXPERIENCE_LABEL: Record<WaterExperience, string> = {
  sufficient: "Sufficient",
  less_than_usual: "Less than usual",
  very_low: "Very low",
  no_water: "No water",
  low_pressure: "Low pressure",
  short_duration: "Short duration",
};

export const WATER_ISSUE_LABEL: Record<WaterIssueType, string> = {
  insufficient: "Insufficient supply",
  low_pressure: "Low pressure",
  short_duration: "Short duration",
  no_water: "No water",
  quality: "Water quality",
  other: "Other",
};

export const CASE_STATE_LABEL: Record<CaseState, string> = {
  detected: "Detected",
  under_review: "Under review",
  verification_assigned: "Verification assigned",
  verification_in_progress: "Verification in progress",
  verified: "Verified",
  not_confirmed: "Not confirmed",
  needs_more: "Needs further verification",
  forwarded: "Forwarded to department",
  action_scheduled: "Action scheduled",
  resolved: "Resolved",
};

export const CASE_SEVERITY_LABEL: Record<CaseSeverity, string> = {
  high: "High",
  moderate: "Moderate",
  normal: "Normal",
};

export function caseSeverityTone(s: CaseSeverity): Tone {
  return s === "high" ? "critical" : s === "moderate" ? "moderate" : "normal";
}

export function caseStateTone(s: CaseState): Tone {
  switch (s) {
    case "verified":
    case "action_scheduled":
    case "resolved":
      return "normal";
    case "not_confirmed":
      return "unknown";
    case "detected":
      return "critical";
    default:
      return "moderate";
  }
}
