import { useMemo } from "react";
import { useDataStore } from "@/stores/data";
import { useSessionStore } from "@/stores/session";
import { buildEnergyAnalysis } from "@/lib/engine/energyProfile";
import { analyzeLpg } from "@/lib/engine/lpg";
import { rollup } from "@/lib/engine/aggregate";
import { selectNotificationsFor } from "../notifications";
import { api } from "../index";
import { computeBill } from "@/lib/engine/tariff";
import { billsFromHistory } from "@/data/fixtures/shared";
import type {
  Area,
  AreaAggregate,
  EnergyAnalysis,
  FieldAssistant,
  Household,
  LpgAnalysis,
  LpgBooking,
  Notification,
  WaterCase,
  WaterReport,
  WaterSupplySchedule,
} from "@/types";

export function useCurrentHousehold(): {
  household?: Household;
  isLoading: boolean;
} {
  const user = useSessionStore((s) => s.user);
  const households = useDataStore((s) => s.households);
  const householdId = user?.householdId ?? "H-1024";
  const household = useMemo(() => households.find((h) => h.id === householdId), [households, householdId]);

  return {
    household,
    isLoading: !household,
  };
}

export function useEnergyAnalysis(propHouseholdId?: string): EnergyAnalysis | undefined {
  const user = useSessionStore((s) => s.user);
  const now = useSessionStore((s) => s.demoNow);
  const households = useDataStore((s) => s.households);
  const appliances = useDataStore((s) => s.appliances);
  const bills = useDataStore((s) => s.bills);

  const householdId = propHouseholdId || user?.householdId || "H-1024";

  return useMemo(() => {
    const hh = households.find((h) => h.id === householdId) ?? households[0];
    if (!hh) return undefined;
    const hhAppliances = appliances.filter((a) => a.householdId === householdId);
    let hhBills = bills.filter((b) => b.householdId === householdId);

    if (hhBills.length === 0) {
      const people = hh.people || 3;
      const baseKwh = 110 + people * 45;
      const seasonalMultipliers = [1.08, 1.02, 0.98, 1.15, 1.32, 1.28, 1.05, 0.92, 0.85, 0.86, 0.95, 1.00];
      const billHistory = seasonalMultipliers.map((mult, idx) => {
        const kwh = Math.round(baseKwh * mult);
        return { offset: -idx, kwh, amount: computeBill(kwh).total };
      });
      hhBills = billsFromHistory(householdId, billHistory, now, {
        meterStart: 2100,
        tariffName: "Demo Domestic LT-1",
      });
    }

    return buildEnergyAnalysis({
      household: hh,
      appliances: hhAppliances.length > 0 ? hhAppliances : appliances.filter((a) => a.householdId === "H-1024"),
      bills: hhBills,
      areaAvgKwh: 340,
      now,
    });
  }, [householdId, households, appliances, bills, now]);
}

export function useLpgAnalysis(householdId = "H-1024"): {
  analysis?: LpgAnalysis;
  bookings: LpgBooking[];
} {
  const now = useSessionStore((s) => s.demoNow);
  const cylinders = useDataStore((s) => s.cylinders);
  const bookings = useDataStore((s) => s.lpgBookings);

  return useMemo(() => {
    const hhCyls = cylinders.filter((c) => c.householdId === householdId);
    const hhBookings = bookings.filter((b) => b.householdId === householdId);
    const analysis = analyzeLpg(hhCyls, now);
    return { analysis, bookings: hhBookings };
  }, [householdId, cylinders, bookings, now]);
}

export function useWaterHome(householdId = "H-1024"): {
  schedule?: WaterSupplySchedule;
  reports: WaterReport[];
  activeCase?: WaterCase;
} {
  const households = useDataStore((s) => s.households);
  const schedules = useDataStore((s) => s.waterSchedules);
  const reports = useDataStore((s) => s.waterReports);
  const cases = useDataStore((s) => s.waterCases);

  return useMemo(() => {
    const hh = households.find((h) => h.id === householdId);
    const areaId = hh?.water?.scheduleAreaId ?? hh?.areaId ?? "area-xyz";
    const schedule = schedules.find((s) => s.areaId === areaId);
    const hhReports = reports.filter((r) => r.householdId === householdId);
    const activeCase = cases.find(
      (c) => c.areaId === areaId && c.state !== "resolved" && c.state !== "not_confirmed",
    );

    return { schedule, reports: hhReports, activeCase };
  }, [householdId, households, schedules, reports, cases]);
}

export function useWardWater(wardId = "ward-24"): {
  cases: WaterCase[];
  fieldAssistants: FieldAssistant[];
  areas: Area[];
} {
  const cases = useDataStore((s) => s.waterCases);
  const fieldAssistants = useDataStore((s) => s.fieldAssistants);
  const areas = useDataStore((s) => s.areas);

  return useMemo(() => {
    const wardCases = cases.filter((c) => c.wardId === wardId);
    const wardAreas = areas.filter((a) => a.wardId === wardId);
    return {
      cases: wardCases,
      fieldAssistants,
      areas: wardAreas,
    };
  }, [wardId, cases, fieldAssistants, areas]);
}

export function useWardLpg(wardId = "ward-24"): {
  aggregates: AreaAggregate[];
  areas: Area[];
} {
  const areaAggregates = useDataStore((s) => s.areaAggregates);
  const areas = useDataStore((s) => s.areas);

  return useMemo(() => {
    const lpgAggs = areaAggregates.filter((a) => a.wardId === wardId && a.stream === "lpg");
    const wardAreas = areas.filter((a) => a.wardId === wardId);
    return { aggregates: lpgAggs, areas: wardAreas };
  }, [wardId, areaAggregates, areas]);
}

export function useWardElectricity(wardId = "ward-24"): {
  aggregates: AreaAggregate[];
  areas: Area[];
  drEvents: ReturnType<typeof useDataStore.getState>["drEvents"];
} {
  const areaAggregates = useDataStore((s) => s.areaAggregates);
  const areas = useDataStore((s) => s.areas);
  const drEvents = useDataStore((s) => s.drEvents);

  return useMemo(() => {
    const elAggs = areaAggregates.filter((a) => a.wardId === wardId && a.stream === "electricity");
    const wardAreas = areas.filter((a) => a.wardId === wardId);
    const wardDr = drEvents.filter((d) => d.wardIds.includes(wardId) || d.wardIds.length === 0);
    return { aggregates: elAggs, areas: wardAreas, drEvents: wardDr };
  }, [wardId, areaAggregates, areas, drEvents]);
}

export function useCityDashboard() {
  const zones = useDataStore((s) => s.zones);
  const wards = useDataStore((s) => s.wards);
  const areaAggregates = useDataStore((s) => s.areaAggregates);
  const gridSnapshot = useDataStore((s) => s.gridSnapshot);
  const gridIncidents = useDataStore((s) => s.gridIncidents);
  const officialAlerts = useDataStore((s) => s.officialAlerts);
  const industrialUnits = useDataStore((s) => s.industrialUnits);
  const ghgActivity = useDataStore((s) => s.ghgActivity);

  return useMemo(() => {
    // Separate streams for rollups
    const elAggs = areaAggregates.filter((a) => a.stream === "electricity");
    const waterAggs = areaAggregates.filter((a) => a.stream === "water");
    const lpgAggs = areaAggregates.filter((a) => a.stream === "lpg");

    const rolledElectricity = rollup(elAggs, { wards, zones });
    const rolledWater = rollup(waterAggs, { wards, zones });
    const rolledLpg = rollup(lpgAggs, { wards, zones });

    return {
      electricity: rolledElectricity,
      water: rolledWater,
      lpg: rolledLpg,
      gridSnapshot,
      gridIncidents,
      officialAlerts,
      industrialUnits,
      ghgActivity,
    };
  }, [zones, wards, areaAggregates, gridSnapshot, gridIncidents, officialAlerts, industrialUnits, ghgActivity]);
}

export function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
} {
  const user = useSessionStore((s) => s.user);
  const allNotifications = useDataStore((s) => s.notifications);

  const notifications = useMemo(
    () => selectNotificationsFor(user, allNotifications),
    [user, allNotifications],
  );

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return notifications.filter((n) => !n.readBy.includes(user.id)).length;
  }, [user, notifications]);

  return {
    notifications,
    unreadCount,
    markRead: (id: string) => {
      if (user) api.notifications.markRead(id, user.id);
    },
    markAllRead: () => {
      if (user) api.notifications.markAllRead({ role: user.role }, user.id);
    },
  };
}
