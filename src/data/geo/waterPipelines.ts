/**
 * Water Supply Infrastructure & Geographic Pipeline Network for Raichur City & Ward 24.
 *
 * Models the hydraulic supply network:
 * 1. Krishna River Intake & Water Treatment Plant (WTP Rampur)
 * 2. 900mm Bulk Transmission Main
 * 3. Master Balancing Reservoir (MBR Raichur Fort Hill)
 * 4. Primary Feeders 1 to 4 to municipal zones
 * 5. Primary Feeder 4 into Ward 24 Elevated Storage Reservoir (OHT Gandhi Nagar)
 * 6. Four distribution branches feeding XYZ Colony, ABC Colony, DEF Colony, and GHI Colony
 * 7. Real-time SCADA pressure sensors with critical drop on Feeder 4B (Case XYZ-001)
 */

import type { Tone } from "@/types/common";
import type { LatLng } from "@/types/geo";
import type { AreaMapMarker, AreaMapPolyline } from "@/components/maps/types";

export interface WaterFacility {
  id: string;
  name: string;
  code: string;
  type: "wtp" | "mbr" | "oht" | "booster_pump" | "pressure_sensor" | "sluice_valve";
  location: LatLng;
  capacity: string;
  currentLevelOrPressure: string;
  status: "optimal" | "normal" | "moderate" | "critical";
  tone: Tone;
  details: string;
  scadaTelemetry: {
    pressureBar: number;
    flowRateLps: number;
    waterLevelPct?: number;
    ph?: number;
    turbidityNtu?: number;
    chlorinePpm?: number;
    pumpStatus?: "running" | "idle" | "tripped" | "standby";
  };
  connectedTo: string[];
}

export interface WaterPipelineSpec {
  id: string;
  name: string;
  code: string;
  type: "bulk_transmission" | "primary_feeder" | "distribution_main" | "branch";
  diameterMm: number;
  material: string;
  coordinates: LatLng[];
  status: "optimal" | "normal" | "moderate" | "critical";
  tone: Tone;
  pressureBar: number;
  nominalPressureBar: number;
  flowMld: number;
  lengthKm: number;
  notes: string;
  linkedCaseId?: string;
  servesAreaId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Water Facilities & SCADA Nodes
// ─────────────────────────────────────────────────────────────────────────────

export const WATER_FACILITIES: WaterFacility[] = [
  {
    id: "fac-wtp-rampur",
    name: "WTP Rampur (Krishna River Intake)",
    code: "WTP-01",
    type: "wtp",
    location: [16.275, 77.315],
    capacity: "48.0 MLD",
    currentLevelOrPressure: "38.5 MLD Output · 3.8 bar",
    status: "optimal",
    tone: "optimal",
    details: "Raw water intake from Krishna River canal barrage with rapid sand filtration, coagulation, and chlorination.",
    scadaTelemetry: {
      pressureBar: 3.8,
      flowRateLps: 445,
      ph: 7.3,
      turbidityNtu: 1.4,
      chlorinePpm: 1.8,
      pumpStatus: "running",
    },
    connectedTo: ["pipe-bulk-transmission"],
  },
  {
    id: "fac-mbr-fort",
    name: "Master Balancing Reservoir (MBR Fort Hill)",
    code: "MBR-01",
    type: "mbr",
    location: [16.212, 77.35],
    capacity: "24.0 Million Litres (ML)",
    currentLevelOrPressure: "88% Full (21.1 ML) · 3.2 bar",
    status: "optimal",
    tone: "optimal",
    details: "Elevated natural ridge reservoir distributing bulk gravity feed to North, Central, and South city feeders.",
    scadaTelemetry: {
      pressureBar: 3.2,
      flowRateLps: 380,
      waterLevelPct: 88,
      ph: 7.2,
      chlorinePpm: 1.5,
      pumpStatus: "running",
    },
    connectedTo: ["pipe-bulk-transmission", "pipe-feeder-1", "pipe-feeder-2", "pipe-feeder-4"],
  },
  {
    id: "fac-oht-north",
    name: "OHT Gandhi Chowk (North Zone)",
    code: "OHT-01",
    type: "oht",
    location: [16.25, 77.348],
    capacity: "3.0 ML",
    currentLevelOrPressure: "76% Full · 2.5 bar",
    status: "normal",
    tone: "normal",
    details: "Supplies northern wards 03, 07, and 09 residential corridors.",
    scadaTelemetry: {
      pressureBar: 2.5,
      flowRateLps: 92,
      waterLevelPct: 76,
      pumpStatus: "running",
    },
    connectedTo: ["pipe-feeder-1"],
  },
  {
    id: "fac-oht-central",
    name: "OHT Station Road (Central Zone)",
    code: "OHT-02",
    type: "oht",
    location: [16.21, 77.365],
    capacity: "3.5 ML",
    currentLevelOrPressure: "82% Full · 2.4 bar",
    status: "normal",
    tone: "normal",
    details: "Supplies commercial core and Ward 11/15 civic clusters.",
    scadaTelemetry: {
      pressureBar: 2.4,
      flowRateLps: 110,
      waterLevelPct: 82,
      pumpStatus: "running",
    },
    connectedTo: ["pipe-feeder-2"],
  },
  {
    id: "fac-booster-south",
    name: "Station Road South In-line Booster Station",
    code: "BST-04",
    type: "booster_pump",
    location: [16.185, 77.36],
    capacity: "75 kW Dual Centrifugal",
    currentLevelOrPressure: "2.8 bar head · 140 L/s",
    status: "optimal",
    tone: "optimal",
    details: "Maintains head pressure along the southern transmission corridor feeding Ward 24.",
    scadaTelemetry: {
      pressureBar: 2.8,
      flowRateLps: 140,
      pumpStatus: "running",
    },
    connectedTo: ["pipe-feeder-4"],
  },
  {
    id: "fac-oht-ward24",
    name: "Ward 24 Elevated Storage Reservoir (OHT Gandhi Nagar)",
    code: "OHT-W24",
    type: "oht",
    location: [16.175, 77.375],
    capacity: "2.2 Million Litres (ML)",
    currentLevelOrPressure: "72% (1.58 ML) · 2.4 bar",
    status: "normal",
    tone: "normal",
    details: "Direct hydraulic supply hub for Ward 24: XYZ Colony, ABC Colony, DEF Colony, and GHI Colony.",
    scadaTelemetry: {
      pressureBar: 2.4,
      flowRateLps: 98,
      waterLevelPct: 72,
      ph: 7.1,
      chlorinePpm: 1.4,
      pumpStatus: "running",
    },
    connectedTo: ["pipe-feeder-4", "pipe-dist-4a", "pipe-dist-4b", "pipe-dist-4c", "pipe-dist-4d"],
  },
  {
    id: "fac-ps-xyz-1",
    name: "SCADA Pressure Sensor PS-XYZ-1 (3rd Cross)",
    code: "PS-XYZ-1",
    type: "pressure_sensor",
    location: [16.174, 77.368],
    capacity: "Sensor Range: 0–6 bar",
    currentLevelOrPressure: "0.4 bar (CRITICAL DROP) · Normal: 2.0 bar",
    status: "critical",
    tone: "critical",
    details: "CRITICAL ALERT: Severe depressurization detected during 07:00–08:00 window. Corresponds to Case XYZ-001 (78 citizen pressure shortage reports).",
    scadaTelemetry: {
      pressureBar: 0.4,
      flowRateLps: 18,
      pumpStatus: "tripped",
    },
    connectedTo: ["pipe-dist-4b"],
  },
  {
    id: "fac-ps-ghi-1",
    name: "SCADA Pressure Sensor PS-GHI-1 (Main Bazaar)",
    code: "PS-GHI-1",
    type: "pressure_sensor",
    location: [16.164, 77.383],
    capacity: "Sensor Range: 0–6 bar",
    currentLevelOrPressure: "1.1 bar (Moderate low pressure)",
    status: "moderate",
    tone: "moderate",
    details: "Sub-nominal pressure on tail-end line. Case GHI-001 active; Field Assistant Arif assigned.",
    scadaTelemetry: {
      pressureBar: 1.1,
      flowRateLps: 21,
      pumpStatus: "running",
    },
    connectedTo: ["pipe-dist-4d"],
  },
  {
    id: "fac-ps-abc-1",
    name: "SCADA Pressure Sensor PS-ABC-1 (Ring Road Junction)",
    code: "PS-ABC-1",
    type: "pressure_sensor",
    location: [16.176, 77.384],
    capacity: "Sensor Range: 0–6 bar",
    currentLevelOrPressure: "2.1 bar (Optimal)",
    status: "optimal",
    tone: "optimal",
    details: "Normal hydraulic gradient across ABC Colony feeder main.",
    scadaTelemetry: {
      pressureBar: 2.1,
      flowRateLps: 34,
      pumpStatus: "running",
    },
    connectedTo: ["pipe-dist-4a"],
  },
  {
    id: "fac-ps-def-1",
    name: "SCADA Pressure Sensor PS-DEF-1 (DEF 1st Cross)",
    code: "PS-DEF-1",
    type: "pressure_sensor",
    location: [16.165, 77.37],
    capacity: "Sensor Range: 0–6 bar",
    currentLevelOrPressure: "2.0 bar (Normal)",
    status: "normal",
    tone: "normal",
    details: "Stable baseline delivery across DEF Colony distribution branches.",
    scadaTelemetry: {
      pressureBar: 2.0,
      flowRateLps: 26,
      pumpStatus: "running",
    },
    connectedTo: ["pipe-dist-4c"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Water Pipelines
// ─────────────────────────────────────────────────────────────────────────────

export const WATER_PIPELINES: WaterPipelineSpec[] = [
  // 1. Bulk Raw & Treated Transmission Main
  {
    id: "pipe-bulk-transmission",
    name: "Krishna Bulk Transmission Main",
    code: "BTM-900",
    type: "bulk_transmission",
    diameterMm: 900,
    material: "Mild Steel (MS) Mortar Lined",
    coordinates: [
      [16.275, 77.315],
      [16.262, 77.324],
      [16.245, 77.335],
      [16.228, 77.342],
      [16.212, 77.35],
    ],
    status: "optimal",
    tone: "optimal",
    pressureBar: 3.8,
    nominalPressureBar: 3.8,
    flowMld: 38.5,
    lengthKm: 8.4,
    notes: "Primary bulk raw & treated water corridor from Krishna River intake to Fort Hill MBR.",
  },

  // 2. Primary Feeder 1 North
  {
    id: "pipe-feeder-1",
    name: "Primary Feeder 1 (North Trunk)",
    code: "PF-01",
    type: "primary_feeder",
    diameterMm: 600,
    material: "Ductile Iron (DI)",
    coordinates: [
      [16.212, 77.35],
      [16.225, 77.35],
      [16.238, 77.349],
      [16.25, 77.348],
    ],
    status: "optimal",
    tone: "optimal",
    pressureBar: 2.6,
    nominalPressureBar: 2.5,
    flowMld: 11.2,
    lengthKm: 4.3,
    notes: "Feeds northern municipal wards 03, 07, and 09.",
  },

  // 3. Primary Feeder 2 Central
  {
    id: "pipe-feeder-2",
    name: "Primary Feeder 2 (Central Commercial Trunk)",
    code: "PF-02",
    type: "primary_feeder",
    diameterMm: 500,
    material: "Ductile Iron (DI)",
    coordinates: [
      [16.212, 77.35],
      [16.211, 77.358],
      [16.21, 77.365],
    ],
    status: "normal",
    tone: "normal",
    pressureBar: 2.4,
    nominalPressureBar: 2.4,
    flowMld: 8.6,
    lengthKm: 2.1,
    notes: "Commercial corridor and administrative zone supply main.",
  },

  // 4. Primary Feeder 4 South (Feeds Ward 24)
  {
    id: "pipe-feeder-4",
    name: "Primary Feeder 4 (South Trunk / Ward 24 Main)",
    code: "PF-04",
    type: "primary_feeder",
    diameterMm: 600,
    material: "Ductile Iron (DI)",
    coordinates: [
      [16.212, 77.35],
      [16.2, 77.354],
      [16.185, 77.36],
      [16.178, 77.368],
      [16.175, 77.375],
    ],
    status: "normal",
    tone: "normal",
    pressureBar: 2.4,
    nominalPressureBar: 2.4,
    flowMld: 9.8,
    lengthKm: 4.8,
    notes: "Carries treated water from Fort Hill MBR through the Station Road booster station directly to Ward 24 OHT.",
  },

  // 5. Distribution Main 4A -> ABC Colony
  {
    id: "pipe-dist-4a",
    name: "Distribution Main 4A (ABC Colony Supply Line)",
    code: "DM-4A",
    type: "distribution_main",
    diameterMm: 300,
    material: "Ductile Iron (DI)",
    coordinates: [
      [16.175, 77.375],
      [16.176, 77.38],
      [16.176, 77.384],
    ],
    status: "optimal",
    tone: "optimal",
    pressureBar: 2.1,
    nominalPressureBar: 2.0,
    flowMld: 1.8,
    lengthKm: 1.1,
    notes: "Serves ABC Colony (780 households). Supply window operating normally.",
    servesAreaId: "area-abc",
  },

  // 6. Distribution Main 4B -> XYZ Colony (CRITICAL LEAKAGE / DEPRESSURIZATION)
  {
    id: "pipe-dist-4b",
    name: "Distribution Main 4B (XYZ Colony Supply Line)",
    code: "DM-4B",
    type: "distribution_main",
    diameterMm: 350,
    material: "Cast Iron (CI) Class LA",
    coordinates: [
      [16.175, 77.375],
      [16.176, 77.371],
      [16.174, 77.368],
      [16.172, 77.366],
    ],
    status: "critical",
    tone: "critical",
    pressureBar: 0.4,
    nominalPressureBar: 2.0,
    flowMld: 0.65,
    lengthKm: 1.4,
    notes: "CRITICAL: Severe depressurization (0.4 bar vs 2.0 bar normal) caused by ruptured joint between Junction 4B and 3rd Cross. Active incident Case XYZ-001 (78 complaints).",
    linkedCaseId: "case-xyz-001",
    servesAreaId: "area-xyz",
  },

  // 7. Distribution Main 4C -> DEF Colony
  {
    id: "pipe-dist-4c",
    name: "Distribution Main 4C (DEF Colony Supply Line)",
    code: "DM-4C",
    type: "distribution_main",
    diameterMm: 250,
    material: "Ductile Iron (DI)",
    coordinates: [
      [16.175, 77.375],
      [16.17, 77.372],
      [16.165, 77.37],
    ],
    status: "normal",
    tone: "normal",
    pressureBar: 2.0,
    nominalPressureBar: 2.0,
    flowMld: 1.2,
    lengthKm: 1.2,
    notes: "Serves DEF Colony (610 households). Pressure and scheduled flow within baseline thresholds.",
    servesAreaId: "area-def",
  },

  // 8. Distribution Main 4D -> GHI Colony (MODERATE DEPRESSURIZATION)
  {
    id: "pipe-dist-4d",
    name: "Distribution Main 4D (GHI Colony Supply Line)",
    code: "DM-4D",
    type: "distribution_main",
    diameterMm: 300,
    material: "Ductile Iron (DI)",
    coordinates: [
      [16.175, 77.375],
      [16.169, 77.379],
      [16.164, 77.383],
    ],
    status: "moderate",
    tone: "moderate",
    pressureBar: 1.1,
    nominalPressureBar: 2.0,
    flowMld: 1.1,
    lengthKm: 1.3,
    notes: "Sub-nominal pressure at tail end (1.1 bar). Under field verification by Assistant Arif (Case GHI-001).",
    linkedCaseId: "case-ghi-001",
    servesAreaId: "area-ghi",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Map Format Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns Leaflet-compatible polylines for the pipeline network.
 * Can filter to Ward 24 specific pipelines or whole city.
 */
export function getWaterPipelinePolylines(filterWard24Only = false): AreaMapPolyline[] {
  const list = filterWard24Only
    ? WATER_PIPELINES.filter((p) => p.id.startsWith("pipe-dist-") || p.id === "pipe-feeder-4")
    : WATER_PIPELINES;

  return list.map((p) => ({
    id: p.id,
    name: p.name,
    positions: p.coordinates,
    tone: p.tone,
    label: `${p.material} · Ø${p.diameterMm}mm`,
    value: `${p.pressureBar} bar (${p.flowMld} MLD)`,
    status: p.status,
    diameterMm: p.diameterMm,
    flowMld: p.flowMld,
    pressureBar: p.pressureBar,
    dashArray: p.tone === "critical" ? "6, 6" : p.tone === "moderate" ? "8, 4" : undefined,
    weight: p.tone === "critical" ? 4.5 : p.type === "bulk_transmission" ? 4 : 3,
  }));
}

/**
 * Returns Leaflet-compatible markers for water facilities and SCADA sensors.
 */
export function getWaterInfrastructureMarkers(filterWard24Only = false): AreaMapMarker[] {
  const list = filterWard24Only
    ? WATER_FACILITIES.filter(
        (f) =>
          f.id === "fac-oht-ward24" ||
          f.id === "fac-ps-xyz-1" ||
          f.id === "fac-ps-ghi-1" ||
          f.id === "fac-ps-abc-1" ||
          f.id === "fac-ps-def-1" ||
          f.id === "fac-booster-south"
      )
    : WATER_FACILITIES;

  return list.map((f) => ({
    id: f.id,
    position: f.location,
    tone: f.tone,
    label: `${f.name} [${f.code}]`,
    value: f.currentLevelOrPressure,
    type: f.type === "pressure_sensor" ? "sensor" : "facility",
    facilityType: f.type,
    details: f.details,
    radius: f.type === "wtp" || f.type === "mbr" ? 9 : f.type === "oht" ? 8 : 6,
  }));
}
