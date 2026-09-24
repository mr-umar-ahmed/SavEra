import type { ConfidenceLevel, EstimateInput, IsoDate, IsoDateTime, Range } from "./common";

/** How a cylinder record entered the system. */
export type LpgCylinderSource = "manual" | "import" | "seed";

/** One LPG cylinder. Dates are measured values, never labelled estimated. */
export interface LpgCylinder {
  id: string;
  householdId: string;
  /** Usually 14.2; also 5 and 19 (see `LpgCylinderSize`). */
  sizeKg: number;
  refillDate: IsoDate;
  startDate: IsoDate;
  /** Absent for the cylinder currently in use. */
  finishDate?: IsoDate;
  /** Generic provider label, never a real brand. */
  provider: string;
  source: LpgCylinderSource;
}

/** A finished cylinder cycle. */
export interface LpgCycle {
  cylinderId: string;
  startDate: IsoDate;
  finishDate: IsoDate;
  days: number;
  kgPerDay: number;
}

export type LpgStatus = "normal" | "higher" | "lower" | "insufficient_data";

/** Output of `analyzeLpg` (MASTER_PROMPT §8.11). */
export interface LpgAnalysis {
  householdId: string;
  /** The cylinder in use, when one is open. */
  current?: {
    cylinderId: string;
    sizeKg: number;
    startDate: IsoDate;
    daysUsed: number;
    /** Projected consumption rate for the current cylinder (estimated). */
    projectedKgPerDay: number;
    estimatedRemainingDays: number;
    estimatedRemainingKg: number;
  };
  /** Median kg/day over finished cylinders. */
  typicalKgPerDay?: number;
  typicalRange?: Range;
  typicalDaysPerCylinder?: number;
  currentKgPerDay?: number;
  status: LpgStatus;
  /** Current vs typical, in percent. */
  deltaPct?: number;
  /** Estimated refill date and how it was derived. */
  refill?: { date: IsoDate; basis: string; daysFromNow: number };
  cycles: LpgCycle[];
  /** Possible reasons on `higher` — includes "Possible leakage — check for safety". */
  possibleReasons: string[];
  /** Conservation & safety guidance. */
  guidance: string[];
  confidence: ConfidenceLevel;
  inputs: EstimateInput[];
}

export type LpgBookingStatus = "requested" | "confirmed" | "out_for_delivery" | "delivered";

/** Simulated refill booking, advanced by a demo control. */
export interface LpgBooking {
  id: string;
  householdId: string;
  /** Booking reference shown to the citizen. */
  ref: string;
  status: LpgBookingStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  history: { status: LpgBookingStatus; at: IsoDateTime }[];
  simulated: true;
}

export const LPG_BOOKING_STATUS_LABEL: Record<LpgBookingStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

export const LPG_STATUS_LABEL: Record<LpgStatus, string> = {
  normal: "Normal",
  higher: "Higher consumption detected",
  lower: "Lower than typical",
  insufficient_data: "Insufficient data",
};
