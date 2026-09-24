/**
 * Shared vocabulary used by every module. Keep this file small and stable;
 * domain entities live in the sibling files (household.ts, water.ts, ...).
 */

export type Role = "citizen" | "supervisor" | "gov";
export type Department = "electricity" | "water" | "gas";
export type Stream = "electricity" | "water" | "lpg";

/** Status palette tone. Always pair with a label/icon; never colour alone. */
export type Tone = "optimal" | "normal" | "moderate" | "critical" | "unknown";

export type ConfidenceLevel = "High" | "Medium" | "Low";
export type Season = "summer" | "normal" | "winter";

/** 'YYYY-MM' */
export type MonthKey = string;
/** 'YYYY-MM-DD' */
export type IsoDate = string;
/** full ISO 8601 timestamp */
export type IsoDateTime = string;

export type SetupStatus = "complete" | "partial" | "later" | "none";
export type SetupSection = "household" | "electricity" | "water" | "gas" | "carbon";

/** Household electricity status vs baseline (MASTER_PROMPT §8.6). */
export type ConsumptionStatus = "normal" | "above" | "significantly_above" | "below";

/** Area/ward/city aggregate status vs historical baseline (§8.13): 🟢 / 🟡 / 🔴. */
export type AggStatus = "normal" | "higher" | "significantly_higher";

export interface Range {
  low: number;
  high: number;
}

export interface TimelineStep {
  key: string;
  label: string;
  state: "done" | "active" | "pending";
  at?: IsoDateTime;
  note?: string;
}

/** A named input that fed an estimate (shown in the Estimated-chip tooltip). */
export interface EstimateInput {
  label: string;
  value?: string;
}

export const TONE_LABEL: Record<Tone, string> = {
  optimal: "Optimal",
  normal: "Normal",
  moderate: "Moderate",
  critical: "Critical",
  unknown: "Unknown",
};

export const STREAM_LABEL: Record<Stream, string> = {
  electricity: "Electricity",
  water: "Water",
  lpg: "LPG",
};

export const DEPARTMENT_LABEL: Record<Department, string> = {
  electricity: "Electricity Department",
  water: "Water Supply Board",
  gas: "LPG Distribution Cell",
};

export const DEPARTMENT_STREAM: Record<Department, Stream> = {
  electricity: "electricity",
  water: "water",
  gas: "lpg",
};

export function aggStatusTone(s: AggStatus): Tone {
  return s === "normal" ? "normal" : s === "higher" ? "moderate" : "critical";
}

export function aggStatusLabel(s: AggStatus, stream: Stream = "water"): string {
  if (stream === "lpg") {
    return s === "normal" ? "Normal" : s === "higher" ? "Increasing" : "High increase";
  }
  return s === "normal"
    ? "Normal"
    : s === "higher"
      ? "Higher than baseline"
      : "Significantly higher";
}

export function consumptionStatusTone(s: ConsumptionStatus): Tone {
  switch (s) {
    case "normal":
      return "normal";
    case "above":
      return "moderate";
    case "significantly_above":
      return "critical";
    case "below":
      return "optimal";
  }
}

export function consumptionStatusLabel(s: ConsumptionStatus): string {
  switch (s) {
    case "normal":
      return "Normal";
    case "above":
      return "Above normal";
    case "significantly_above":
      return "Significantly above normal";
    case "below":
      return "Below normal";
  }
}

export function confidenceTone(c: ConfidenceLevel): Tone {
  return c === "High" ? "normal" : c === "Medium" ? "moderate" : "unknown";
}
