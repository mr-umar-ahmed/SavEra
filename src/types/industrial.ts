import type { IsoDateTime, MonthKey } from "./common";
import type { LatLng } from "./geo";

/** Simulated stack readings (µg/m³ or equivalent demo units). */
export interface EmissionReadings {
  pm: number;
  so2: number;
  nox: number;
}

export interface EmissionThreshold {
  elevated: number;
  exceedance: number;
}

/** Configured demo thresholds per pollutant. */
export interface EmissionThresholds {
  pm: EmissionThreshold;
  so2: EmissionThreshold;
  nox: EmissionThreshold;
}

/** Within applicable limit / Elevated / Exceedance. */
export type EmissionStatus = "within" | "elevated" | "exceedance";

/** An industrial unit on the emissions map. Feed is simulated and labelled as such. */
export interface IndustrialUnit {
  id: string;
  name: string;
  sector: string;
  location: LatLng;
  readings: EmissionReadings;
  thresholds: EmissionThresholds;
  status: EmissionStatus;
  lastUpdate: IsoDateTime;
  trend: "up" | "down" | "flat";
  stackHeightM?: number;
  simulatedFeed: true;
}

/** Monthly activity data for GHG accounting. */
export interface GhgActivity {
  unitId: string;
  month: MonthKey;
  dieselLitres: number;
  electricityKwh: number;
  naturalGasScm: number;
  processTonnes: number;
}

/** Emission factors (kgCO₂e per unit of activity) with a source note. */
export interface GhgFactors {
  diesel: number;
  electricity: number;
  naturalGas: number;
  process: number;
  note: string;
}

export type GhgScope = 1 | 2 | 3;

/** CO₂e inventory for one unit and month, split by scope. */
export interface GhgInventory {
  unitId: string;
  month: MonthKey;
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  breakdown: { key: string; label: string; co2e: number; scope: GhgScope }[];
}

/** A reduction opportunity, ranked by estimated reduction. */
export interface GhgOpportunity {
  id: string;
  /** Absent for city-wide opportunities. */
  unitId?: string;
  title: string;
  description: string;
  reductionTco2eLow: number;
  reductionTco2eHigh: number;
}

export const EMISSION_STATUS_LABEL: Record<EmissionStatus, string> = {
  within: "Within applicable limit",
  elevated: "Elevated",
  exceedance: "Exceedance",
};
