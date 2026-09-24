import type {
  AreaAggregate,
  Broadcast,
  DrEvent,
  GridIncident,
  GridSnapshot,
  OfficialAlert,
} from "@/types";
import { currentMonth } from "@/lib/dates";
import { addDaysIso } from "../fixtures/shared";
import { AREAS } from "../geo/raichur";

export function seedAggregates(now: string): {
  areaAggregates: AreaAggregate[];
  gridSnapshot: GridSnapshot;
  gridIncidents: GridIncident[];
  broadcasts: Broadcast[];
  drEvents: DrEvent[];
  officialAlerts: OfficialAlert[];
} {
  const month = currentMonth(now);

  const areaAggregates: AreaAggregate[] = [];

  for (const area of AREAS) {
    const isW24 = area.wardId === "ward-24";
    const isAreaA = area.id === "area-xyz";
    const isAreaB = area.id === "area-abc";

    // 1. Electricity Aggregate
    const elBaseline = isAreaA ? 175000 : 160000;
    const elCons = isAreaA ? 195000 : 168000;
    areaAggregates.push({
      areaId: area.id,
      wardId: area.wardId,
      zoneId: area.zoneId,
      stream: "electricity",
      month,
      unit: "kWh",
      totalConsumption: elCons,
      baseline: elBaseline,
      activeHouseholds: isW24 ? 480 : 350,
      totalHouseholds: area.householdCount,
      avgPerHousehold: Math.round(elCons / (isW24 ? 480 : 350)),
      status: elCons / elBaseline - 1 > 0.05 ? "higher" : "normal",
      demand: Math.round(elCons * 1.05),
      forecast: Math.round(elCons * 1.08),
      aboveBaselineHouseholds: isAreaA ? 142 : 85,
      trendPct: isAreaA ? 11.4 : 5.0,
    });

    // 2. Water Aggregate
    // Anchor: XYZ (Area A) baseline 10,900,000 L, current 11,800,000 L (higher)
    const wBaseline = isAreaA ? 10900000 : 9500000;
    const wCons = isAreaA ? 11800000 : 9200000;
    areaAggregates.push({
      areaId: area.id,
      wardId: area.wardId,
      zoneId: area.zoneId,
      stream: "water",
      month,
      unit: "L",
      totalConsumption: wCons,
      baseline: wBaseline,
      activeHouseholds: isW24 ? 500 : 380,
      totalHouseholds: area.householdCount,
      avgPerHousehold: Math.round(wCons / (isW24 ? 500 : 380)),
      status: isAreaA ? "higher" : "normal",
      demand: Math.round(wCons * 1.02),
      forecast: Math.round(wCons * 1.04),
      aboveBaselineHouseholds: isAreaA ? 78 : 30,
      trendPct: isAreaA ? 8.3 : -3.2,
    });

    // 3. LPG Aggregate
    // Anchor: ABC (Area B) baseline 4,100 kg, current 4,900 kg (> 15% increase, significantly_higher)
    const lpgBaseline = isAreaB ? 4100 : 3800;
    const lpgCons = isAreaB ? 4900 : 3850;
    areaAggregates.push({
      areaId: area.id,
      wardId: area.wardId,
      zoneId: area.zoneId,
      stream: "lpg",
      month,
      unit: "kg",
      totalConsumption: lpgCons,
      baseline: lpgBaseline,
      activeHouseholds: isW24 ? 280 : 220,
      totalHouseholds: area.householdCount,
      avgPerHousehold: Math.round((lpgCons / (isW24 ? 280 : 220)) * 10) / 10,
      status: isAreaB ? "significantly_higher" : "normal",
      demand: Math.round(lpgCons * 1.03),
      forecast: isAreaB ? 5100 : 3900,
      aboveBaselineHouseholds: isAreaB ? 42 : 12,
      trendPct: isAreaB ? 19.5 : 1.3,
    });
  }

  const gridSnapshot: GridSnapshot = {
    activeSmartMeters: 24500,
    uptimePct: 99.85,
    peakDemandMw: 142.4,
    peakDeltaPct: 14.2,
    loadSheddingAvertedMw: 3.8,
    alertsDispatched24h: 4,
    regions: [
      { name: "Zone 1 · North Feeder Grid", loadPct: 68, tone: "normal", label: "STABLE", trend: "flat" },
      { name: "Zone 2 · Central Commercial", loadPct: 82, tone: "moderate", label: "ELEVATED", trend: "up" },
      { name: "Zone 3 · South (Ward 24)", loadPct: 74, tone: "normal", label: "STABLE", trend: "down" },
      { name: "Industrial Substation 4", loadPct: 89, tone: "moderate", label: "PEAK LOAD", trend: "up" },
    ],
    demandSeries: [
      { t: "00:00", mw: 82.5 },
      { t: "04:00", mw: 75.2 },
      { t: "08:00", mw: 118.4 },
      { t: "12:00", mw: 135.6 },
      { t: "16:00", mw: 128.0 },
      { t: "19:00", mw: 142.4 },
      { t: "20:00", mw: 139.8 },
      { t: "22:00", mw: 110.2 },
    ],
  };

  const gridIncidents: GridIncident[] = [
    {
      id: "inc-01",
      severity: "warning",
      title: "11 kV Feeder-04 Transient Trip",
      location: "Ward 07 Substation",
      at: `${now}T06:14:00.000Z`,
      resolved: true,
    },
    {
      id: "inc-02",
      severity: "warning",
      title: "Distribution Transformer T-12 Temperature Alarm (72 °C)",
      location: "Ward 18 Commercial Hub",
      at: `${now}T11:45:00.000Z`,
      resolved: false,
    },
  ];

  const broadcasts: Broadcast[] = [
    {
      id: "bc-01",
      channel: "push",
      type: "Peak Load Alert (Push)",
      message: "City electricity demand peaking above 140 MW. Residents requested to shift heavy appliances after 21:30.",
      areaIds: ["area-xyz", "area-abc"],
      wardIds: ["ward-24"],
      at: `${now}T18:00:00.000Z`,
      by: "u-gov-electricity",
    },
    {
      id: "bc-02",
      channel: "portal",
      type: "Supply Advisory (Portal)",
      message: "Krishna Pumping Station maintenance scheduled for Sunday 05:00–07:00. Store adequate water in advance.",
      areaIds: [],
      wardIds: ["ward-24", "ward-18"],
      at: `${addDaysIso(now, -1)}T10:00:00.000Z`,
      by: "u-gov-water",
    },
  ];

  const drEvents: DrEvent[] = [
    {
      id: "dr-001",
      title: "Evening Grid Peak Shaving (18:30–21:30)",
      windowStart: `${now}T18:30:00.000Z`,
      windowEnd: `${now}T21:30:00.000Z`,
      targetMw: 1.8,
      areaIds: ["area-xyz", "area-abc", "area-def", "area-ghi"],
      wardIds: ["ward-24"],
      optedInHouseholds: 320,
      responses: {
        "H-1024": "auto",
        "H-1088": "approve",
      },
      avertedMw: 1.25,
      status: "active",
      createdBy: "u-gov-electricity",
      createdAt: `${now}T12:00:00.000Z`,
      flexibleLoads: ["AC setpoint +2 °C", "Water heater pre-heat", "EV charger delay"],
      protectedLoads: ["Refrigerators", "Medical equipment", "Emergency lighting"],
    },
    {
      id: "dr-002",
      title: "Tomorrow Morning Solar Sync DR",
      windowStart: `${addDaysIso(now, 1)}T08:00:00.000Z`,
      windowEnd: `${addDaysIso(now, 1)}T10:30:00.000Z`,
      targetMw: 1.5,
      areaIds: ["area-xyz"],
      wardIds: ["ward-24"],
      optedInHouseholds: 180,
      responses: {},
      avertedMw: 0,
      status: "scheduled",
      createdBy: "u-gov-electricity",
      createdAt: `${now}T14:30:00.000Z`,
      flexibleLoads: ["Washing machine cycle", "Water pumping"],
      protectedLoads: ["Medical", "Cold storage"],
    },
    {
      id: "dr-003",
      title: "Yesterday Evening Industrial Peak Relief",
      windowStart: `${addDaysIso(now, -1)}T18:30:00.000Z`,
      windowEnd: `${addDaysIso(now, -1)}T21:00:00.000Z`,
      targetMw: 1.6,
      areaIds: ["area-xyz", "area-abc"],
      wardIds: ["ward-24"],
      optedInHouseholds: 295,
      responses: {
        "H-1024": "approve",
      },
      avertedMw: 1.55,
      status: "completed",
      createdBy: "u-gov-electricity",
      createdAt: `${addDaysIso(now, -1)}T10:00:00.000Z`,
      flexibleLoads: ["AC", "Geysers"],
      protectedLoads: ["Fridges"],
    },
  ];

  const officialAlerts: OfficialAlert[] = [
    {
      id: "alert-001",
      stream: "water",
      type: "water_disruption",
      title: "Planned Pressure Reduction on Ward 18 Main Feeder",
      areaIds: ["area-w18-1", "area-w18-2"],
      wardIds: ["ward-18"],
      windowStart: `${now}T10:00:00.000Z`,
      windowEnd: `${now}T14:00:00.000Z`,
      reason: "Emergency valve replacement at Station Road junction.",
      status: "active",
      publishedBy: "water",
      publishedByUserId: "u-gov-water",
      publishedAt: `${now}T08:30:00.000Z`,
      updates: [
        {
          at: `${now}T08:30:00.000Z`,
          text: "Valve replacement work initiated. Water tankers on standby.",
          status: "active",
        },
      ],
    },
    {
      id: "alert-002",
      stream: "electricity",
      type: "power_interruption",
      title: "Substation Maintenance (Ward 07)",
      areaIds: ["area-w07-1"],
      wardIds: ["ward-07"],
      windowStart: `${addDaysIso(now, -1)}T09:00:00.000Z`,
      windowEnd: `${addDaysIso(now, -1)}T12:00:00.000Z`,
      reason: "Scheduled transformer oil filtration and bushing checks.",
      status: "resolved",
      publishedBy: "electricity",
      publishedByUserId: "u-gov-electricity",
      publishedAt: `${addDaysIso(now, -1)}T07:00:00.000Z`,
      updates: [
        {
          at: `${addDaysIso(now, -1)}T11:45:00.000Z`,
          text: "Maintenance complete. Feeder energized and load normalized.",
          status: "resolved",
        },
      ],
    },
  ];

  return { areaAggregates, gridSnapshot, gridIncidents, broadcasts, drEvents, officialAlerts };
}
