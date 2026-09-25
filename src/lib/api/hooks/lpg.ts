/**
 * LPG read hooks (Phase 4). Household hooks wrap `analyzeLpg`; ward / city hooks combine the
 * persisted area aggregates with the deterministic monthly history and the demand engine.
 * Supervisor and government hooks expose aggregates and counts only.
 */

import { useMemo } from "react";

import type {
  Area,
  AreaAggregate,
  Household,
  IsoDate,
  LpgAnalysis,
  LpgBooking,
  LpgCylinder,
  MonthKey,
  OfficialAlert,
  Reminder,
  Ward,
  Zone,
} from "@/types";
import { lpgAreaHistory, lpgCityHistory } from "@/data/seed/lpgAggregates";
import { analyzeLpg } from "@/lib/engine/lpg";
import {
  cylinderRequirement,
  pctVsBaseline,
  rollup,
  statusVsBaseline,
} from "@/lib/engine/aggregate";
import { cylinderUsedPct, forecastLpgDemand, refillWindow, type LpgDemandForecast } from "@/lib/engine/lpgDemand";
import { addMonths, currentMonth } from "@/lib/dates";
import { useDataStore } from "@/stores/data";
import { useSessionStore } from "@/stores/session";

// --------------------------------------------------------------------------- household

export interface LpgHouseholdView {
  householdId: string;
  household?: Household;
  analysis: LpgAnalysis;
  cylinders: LpgCylinder[];
  openCylinder?: LpgCylinder;
  usedPct: number;
  refillWindow?: { earliest: IsoDate; latest: IsoDate; days: number };
  bookings: LpgBooking[];
  activeBooking?: LpgBooking;
  lastBooking?: LpgBooking;
  reminders: Reminder[];
  officialAlert?: OfficialAlert;
  now: IsoDate;
}

/** LPG view for the signed-in citizen's household (H-1024 by default). */
export function useLpgHousehold(): LpgHouseholdView {
  const user = useSessionStore((s) => s.user);
  const now = useSessionStore((s) => s.demoNow);
  const households = useDataStore((s) => s.households);
  const allCylinders = useDataStore((s) => s.cylinders);
  const allBookings = useDataStore((s) => s.lpgBookings);
  const allReminders = useDataStore((s) => s.reminders);
  const officialAlerts = useDataStore((s) => s.officialAlerts);
  const householdId = user?.householdId ?? "H-1024";

  return useMemo(() => {
    const household = households.find((h) => h.id === householdId);
    const cylinders = allCylinders
      .filter((c) => c.householdId === householdId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
    const analysis = analyzeLpg(cylinders, now);
    const openCylinder = cylinders.find((c) => !c.finishDate);
    const bookings = allBookings
      .filter((b) => b.householdId === householdId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const reminders = allReminders
      .filter((r) => r.householdId === householdId && r.kind === "lpg_refill")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const officialAlert = officialAlerts.find(
      (a) =>
        a.stream === "lpg" &&
        a.status !== "resolved" &&
        (!household ||
          a.areaIds.includes(household.areaId) ||
          a.wardIds.includes(household.wardId)),
    );
    return {
      householdId,
      household,
      analysis,
      cylinders,
      openCylinder,
      usedPct: analysis.current
        ? cylinderUsedPct(analysis.current.sizeKg, analysis.current.estimatedRemainingKg)
        : 0,
      refillWindow: analysis.refill ? refillWindow(analysis.refill.date, analysis.confidence) : undefined,
      bookings,
      activeBooking: bookings.find((b) => b.status !== "delivered"),
      lastBooking: bookings[0],
      reminders,
      officialAlert,
      now,
    };
  }, [householdId, households, allCylinders, allBookings, allReminders, officialAlerts, now]);
}

// --------------------------------------------------------------------------- ward (supervisor)

export interface LpgAreaRow {
  area: Area;
  agg: AreaAggregate;
  /** Current vs historical baseline, percent. */
  pctVsBaseline: number;
  /** Vs last month, percent. */
  trendPct: number;
  lastMonthKg: number;
  cylinders: number;
  forecast: LpgDemandForecast;
  series: { month: MonthKey; kg: number }[];
  /** Consecutive months of month-on-month increase ending at the current month. */
  risingMonths: number;
}

export interface LpgTotals {
  consumption: number;
  lastMonth: number;
  baseline: number;
  registered: number;
  active: number;
  abnormal: number;
  avgPerHousehold: number;
  pctVsBaseline: number;
  status: AreaAggregate["status"];
  cylinders: number;
}

function totalsOf(rows: { agg: AreaAggregate; lastMonthKg: number }[]): LpgTotals {
  const consumption = rows.reduce((s, r) => s + r.agg.totalConsumption, 0);
  const baseline = rows.reduce((s, r) => s + r.agg.baseline, 0);
  const active = rows.reduce((s, r) => s + r.agg.activeHouseholds, 0);
  return {
    consumption,
    lastMonth: rows.reduce((s, r) => s + r.lastMonthKg, 0),
    baseline,
    registered: rows.reduce((s, r) => s + r.agg.totalHouseholds, 0),
    active,
    abnormal: rows.reduce((s, r) => s + r.agg.aboveBaselineHouseholds, 0),
    avgPerHousehold: active > 0 ? Math.round((consumption / active) * 10) / 10 : 0,
    pctVsBaseline: pctVsBaseline(consumption, baseline),
    status: statusVsBaseline(consumption, baseline, "lpg"),
    cylinders: cylinderRequirement(consumption),
  };
}

function risingMonthsOf(series: number[]): number {
  let n = 0;
  for (let i = series.length - 1; i > 0 && series[i] > series[i - 1]; i--) n++;
  return n;
}

function sumSeries(list: { month: MonthKey; kg: number }[][]): { month: MonthKey; kg: number }[] {
  if (list.length === 0) return [];
  return list[0].map((p, i) => ({ month: p.month, kg: list.reduce((s, series) => s + series[i].kg, 0) }));
}

export interface WardLpgIntel {
  wardId: string;
  wardName: string;
  month: MonthKey;
  nextMonth: MonthKey;
  rows: LpgAreaRow[];
  totals: LpgTotals;
  series: { month: MonthKey; kg: number }[];
  forecast: LpgDemandForecast;
  alerts: LpgAreaRow[];
}

/** Ward-level LPG intelligence (aggregates only). */
export function useWardLpgIntel(wardId = "ward-24"): WardLpgIntel {
  const now = useSessionStore((s) => s.demoNow);
  const areaAggregates = useDataStore((s) => s.areaAggregates);
  const areas = useDataStore((s) => s.areas);
  const wards = useDataStore((s) => s.wards);

  return useMemo(() => {
    const month = currentMonth(now);
    const nextMonth = addMonths(month, 1);
    const history = lpgAreaHistory(now);
    const rows: LpgAreaRow[] = areas
      .filter((a) => a.wardId === wardId)
      .map((area) => {
        const agg = areaAggregates.find((g) => g.areaId === area.id && g.stream === "lpg");
        const series = history[area.id] ?? [];
        return { area, agg, series };
      })
      .filter((r): r is { area: Area; agg: AreaAggregate; series: { month: MonthKey; kg: number }[] } => !!r.agg)
      .map(({ area, agg, series }) => {
        const kgSeries = series.map((p) => p.kg);
        const lastMonthKg = kgSeries.at(-2) ?? agg.totalConsumption;
        return {
          area,
          agg,
          pctVsBaseline: pctVsBaseline(agg.totalConsumption, agg.baseline),
          trendPct: agg.trendPct,
          lastMonthKg,
          cylinders: cylinderRequirement(agg.totalConsumption),
          forecast: forecastLpgDemand(kgSeries, nextMonth),
          series,
          risingMonths: risingMonthsOf(kgSeries),
        };
      })
      .sort((a, b) => (a.area.code ?? a.area.name).localeCompare(b.area.code ?? b.area.name));
    const series = sumSeries(rows.map((r) => r.series));
    const ward = wards.find((w) => w.id === wardId);
    return {
      wardId,
      wardName: ward?.name ?? wardId,
      month,
      nextMonth,
      rows,
      totals: totalsOf(rows),
      series,
      forecast: forecastLpgDemand(
        series.map((p) => p.kg),
        nextMonth,
      ),
      alerts: rows
        .filter((r) => r.agg.status !== "normal")
        .sort((a, b) => b.pctVsBaseline - a.pctVsBaseline),
    };
  }, [now, areaAggregates, areas, wards, wardId]);
}

// --------------------------------------------------------------------------- city (government)

export interface LpgWardRow {
  ward: Ward;
  totals: LpgTotals;
  forecast: LpgDemandForecast;
  rows: LpgAreaRow[];
}

export interface LpgZoneRow {
  zone: Zone;
  totals: LpgTotals;
  wards: LpgWardRow[];
}

export interface CityLpgIntel {
  month: MonthKey;
  nextMonth: MonthKey;
  totals: LpgTotals;
  zones: LpgZoneRow[];
  series: { month: MonthKey; kg: number }[];
  forecast: LpgDemandForecast;
  /** Engine roll-up (for status parity with other city screens). */
  rolled: ReturnType<typeof rollup>;
}

/** City-level LPG intelligence: city → zone → ward → area, aggregates only. */
export function useCityLpgIntel(): CityLpgIntel {
  const now = useSessionStore((s) => s.demoNow);
  const areaAggregates = useDataStore((s) => s.areaAggregates);
  const areas = useDataStore((s) => s.areas);
  const wards = useDataStore((s) => s.wards);
  const zones = useDataStore((s) => s.zones);

  return useMemo(() => {
    const month = currentMonth(now);
    const nextMonth = addMonths(month, 1);
    const history = lpgAreaHistory(now);
    const lpgAggs = areaAggregates.filter((a) => a.stream === "lpg");

    const areaRow = (area: Area): LpgAreaRow | null => {
      const agg = lpgAggs.find((g) => g.areaId === area.id);
      if (!agg) return null;
      const series = history[area.id] ?? [];
      const kgSeries = series.map((p) => p.kg);
      return {
        area,
        agg,
        pctVsBaseline: pctVsBaseline(agg.totalConsumption, agg.baseline),
        trendPct: agg.trendPct,
        lastMonthKg: kgSeries.at(-2) ?? agg.totalConsumption,
        cylinders: cylinderRequirement(agg.totalConsumption),
        forecast: forecastLpgDemand(kgSeries, nextMonth),
        series,
        risingMonths: risingMonthsOf(kgSeries),
      };
    };

    const wardRow = (ward: Ward): LpgWardRow => {
      const rows = areas
        .filter((a) => a.wardId === ward.id)
        .map(areaRow)
        .filter((r): r is LpgAreaRow => r !== null);
      const series = sumSeries(rows.map((r) => r.series));
      return {
        ward,
        totals: totalsOf(rows),
        forecast: forecastLpgDemand(
          series.map((p) => p.kg),
          nextMonth,
        ),
        rows,
      };
    };

    const zoneRows: LpgZoneRow[] = zones.map((zone) => {
      const wardRows = wards.filter((w) => w.zoneId === zone.id).map(wardRow);
      const allRows = wardRows.flatMap((w) => w.rows);
      return { zone, totals: totalsOf(allRows), wards: wardRows };
    });

    const allRows = zoneRows.flatMap((z) => z.wards.flatMap((w) => w.rows));
    const series = lpgCityHistory(now);
    return {
      month,
      nextMonth,
      totals: totalsOf(allRows),
      zones: zoneRows,
      series,
      forecast: forecastLpgDemand(
        series.map((p) => p.kg),
        nextMonth,
      ),
      rolled: rollup(lpgAggs, { wards, zones }),
    };
  }, [now, areaAggregates, areas, wards, zones]);
}
