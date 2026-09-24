import type { AreaAggregate, Broadcast, DrEvent, GridIncident, GridSnapshot } from "./aggregate";
import type { User } from "./auth";
import type { CarbonInputs } from "./carbon";
import type {
  BillDue,
  ConsentGrant,
  OfficialAlert,
  Reminder,
  ServiceTransaction,
} from "./connected";
import type { ElectricityBill } from "./electricity";
import type { Area, Ward, Zone } from "./geo";
import type { GreenScoreHistoryPoint, LeaderboardSeedEntry } from "./greenScore";
import type { Appliance, Household } from "./household";
import type { GhgActivity, IndustrialUnit } from "./industrial";
import type { LpgBooking, LpgCylinder } from "./lpg";
import type { Notification } from "./notifications";
import type { FieldAssistant, WaterCase, WaterReport, WaterSupplySchedule } from "./water";

/**
 * The whole demo database, produced by `buildSeed(now)` and persisted by `useDataStore`.
 * `SEED_VERSION` lives beside the seed generator, not here.
 */
export interface SeedDb {
  users: User[];
  zones: Zone[];
  wards: Ward[];
  areas: Area[];
  households: Household[];
  appliances: Appliance[];
  bills: ElectricityBill[];
  waterSchedules: WaterSupplySchedule[];
  waterReports: WaterReport[];
  waterCases: WaterCase[];
  fieldAssistants: FieldAssistant[];
  cylinders: LpgCylinder[];
  lpgBookings: LpgBooking[];
  areaAggregates: AreaAggregate[];
  gridSnapshot: GridSnapshot;
  gridIncidents: GridIncident[];
  broadcasts: Broadcast[];
  drEvents: DrEvent[];
  officialAlerts: OfficialAlert[];
  industrialUnits: IndustrialUnit[];
  ghgActivity: GhgActivity[];
  notifications: Notification[];
  consents: ConsentGrant[];
  transactions: ServiceTransaction[];
  reminders: Reminder[];
  billsDue: BillDue[];
  carbonInputs: CarbonInputs[];
  greenScoreHistory: GreenScoreHistoryPoint[];
  leaderboard: LeaderboardSeedEntry[];
}

/** Names of the array collections in `SeedDb` (everything except `gridSnapshot`). */
export type SeedCollection = {
  [K in keyof SeedDb]: SeedDb[K] extends unknown[] ? K : never;
}[keyof SeedDb];
