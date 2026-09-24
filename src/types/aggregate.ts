import type { AggStatus, IsoDateTime, MonthKey, Stream, Tone } from "./common";

export type AggregateUnit = "kWh" | "L" | "kg";

/** Anonymised consumption aggregate for one stream and month (MASTER_PROMPT §8.13). */
export interface AggregateBase {
  stream: Stream;
  month: MonthKey;
  totalConsumption: number;
  unit: AggregateUnit;
  activeHouseholds: number;
  totalHouseholds: number;
  avgPerHousehold: number;
  /** Historical baseline for the same period. */
  baseline: number;
  status: AggStatus;
  /** Current estimated demand (same unit). */
  demand: number;
  /** Next-period forecast demand (estimated). */
  forecast: number;
  /** Count of households above their own baseline (never ids). */
  aboveBaselineHouseholds: number;
  /** Trend vs previous period, percent. */
  trendPct: number;
}

export interface AreaAggregate extends AggregateBase {
  areaId: string;
  wardId: string;
  zoneId: string;
}

export interface WardAggregate extends AggregateBase {
  wardId: string;
  zoneId: string;
  areas: AreaAggregate[];
}

export interface ZoneAggregate extends AggregateBase {
  zoneId: string;
  wards: WardAggregate[];
}

export interface CityAggregate extends AggregateBase {
  zones: ZoneAggregate[];
}

/** One row of the Regional Sensor Matrix (grid ops). */
export interface GridRegion {
  name: string;
  loadPct: number;
  tone: Tone;
  /** e.g. "MODERATE", "STABLE", "OPTIMAL". */
  label: string;
  trend: "up" | "down" | "flat";
}

/** Grid operations KPIs and the simulated live demand series. */
export interface GridSnapshot {
  activeSmartMeters: number;
  uptimePct: number;
  peakDemandMw: number;
  /** Peak vs average, percent. */
  peakDeltaPct: number;
  loadSheddingAvertedMw: number;
  alertsDispatched24h: number;
  regions: GridRegion[];
  /** Live-feed points (simulated); `t` is an ISO timestamp or clock label. */
  demandSeries: { t: string; mw: number }[];
}

export interface GridIncident {
  id: string;
  severity: "critical" | "warning";
  title: string;
  location: string;
  at: IsoDateTime;
  resolved: boolean;
}

/** Message sent from the Command Terminal (push / city portal). */
export interface Broadcast {
  id: string;
  channel: "push" | "portal";
  /** Broadcast type label, e.g. "Standard Advisory (Push)". */
  type: string;
  message: string;
  areaIds: string[];
  wardIds: string[];
  at: IsoDateTime;
  /** User id of the sender. */
  by: string;
}

export type BroadcastInput = Omit<Broadcast, "id" | "at">;

export type DrResponse = "approve" | "auto" | "decline";
export type DrEventStatus = "scheduled" | "active" | "completed" | "cancelled";

/** Automated demand-response event (electricity only, MASTER_PROMPT §9.6). */
export interface DrEvent {
  id: string;
  title: string;
  windowStart: IsoDateTime;
  windowEnd: IsoDateTime;
  targetMw: number;
  areaIds: string[];
  wardIds: string[];
  optedInHouseholds: number;
  /** householdId → response. */
  responses: Record<string, DrResponse>;
  /** Simulated MW averted. */
  avertedMw: number;
  status: DrEventStatus;
  createdBy: string;
  createdAt: IsoDateTime;
  /** e.g. "AC", "EV charger", "Geyser". */
  flexibleLoads: string[];
  /** e.g. "Fridge", "Medical equipment". */
  protectedLoads: string[];
}

export type DrEventInput = Omit<
  DrEvent,
  "id" | "createdAt" | "responses" | "avertedMw" | "optedInHouseholds"
> &
  Partial<Pick<DrEvent, "optedInHouseholds" | "avertedMw">>;

export const DR_EVENT_STATUS_LABEL: Record<DrEventStatus, string> = {
  scheduled: "Scheduled",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};
