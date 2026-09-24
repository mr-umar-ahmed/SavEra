import type { SeedDb } from "@/types";
import { AREAS, WARDS, ZONES } from "../geo/raichur";
import { SEED_USERS } from "./users";
import { seedHouseholdsAndAppliances } from "./households";
import { seedLpg } from "./lpg";
import { seedWater } from "./water";
import { seedAggregates } from "./aggregates";
import { seedIndustrial } from "./industrial";
import { seedGreenScore } from "./greenScore";
import { seedConnected } from "./connected";
import { seedNotifications } from "./notifications";

export const SEED_VERSION = "1.0.0";

/**
 * Builds the complete deterministic demo database for the given `now` date (`YYYY-MM-DD`).
 * Everything relative to time is anchored to `now`, preserving spec numbers and relationships.
 */
export function buildSeed(now: string): SeedDb {
  const { households, appliances, bills } = seedHouseholdsAndAppliances(now);
  const { cylinders, lpgBookings } = seedLpg(now);
  const { waterSchedules, waterReports, waterCases, fieldAssistants } = seedWater(now);
  const {
    areaAggregates,
    gridSnapshot,
    gridIncidents,
    broadcasts,
    drEvents,
    officialAlerts,
  } = seedAggregates(now);
  const { industrialUnits, ghgActivity } = seedIndustrial(now);
  const { leaderboard, greenScoreHistory, carbonInputs } = seedGreenScore(now);
  const { consents, transactions, reminders, billsDue } = seedConnected(now);
  const notifications = seedNotifications(now);

  return {
    users: SEED_USERS,
    zones: ZONES,
    wards: WARDS,
    areas: AREAS,
    households,
    appliances,
    bills,
    waterSchedules,
    waterReports,
    waterCases,
    fieldAssistants,
    cylinders,
    lpgBookings,
    areaAggregates,
    gridSnapshot,
    gridIncidents,
    broadcasts,
    drEvents,
    officialAlerts,
    industrialUnits,
    ghgActivity,
    notifications,
    consents,
    transactions,
    reminders,
    billsDue,
    carbonInputs,
    greenScoreHistory,
    leaderboard,
  };
}
