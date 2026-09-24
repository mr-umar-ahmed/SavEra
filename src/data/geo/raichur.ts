/**
 * Demo geography for Raichur, Karnataka (MASTER_PROMPT §11, ARCHITECTURE §7).
 *
 * Three zones → eight wards → 3–4 areas (colonies) each. Polygons are hand-authored
 * approximations laid out on a grid around the city centre (16.20 N, 77.35 E):
 *   zone ≈ 0.04–0.10° across (chamfered rectangle) · ward ≈ 0.025° square · area ≈ 0.011° cell.
 * Zones contain their wards, wards contain their areas, and nothing overlaps.
 * Rings are `[lat, lng]` (react-leaflet order), first point not repeated.
 *
 * Household counts are aggregate demo values: city ≈ 5,000 households, ≈ 1,600 participating;
 * Ward 24 = 3,160 households / 700 participating (the leaderboard's 700 participants).
 */

import type { Area, AreaCode, LatLng, Polygon, Ward, Zone } from "@/types/geo";

// ---------------------------------------------------------------------------
// Fixed ids
// ---------------------------------------------------------------------------

export const ZONE_1_ID = "zone-1";
export const ZONE_2_ID = "zone-2";
export const ZONE_3_ID = "zone-3";

export const WARD_03_ID = "ward-03";
export const WARD_07_ID = "ward-07";
export const WARD_09_ID = "ward-09";
export const WARD_11_ID = "ward-11";
export const WARD_15_ID = "ward-15";
export const WARD_18_ID = "ward-18";
export const WARD_21_ID = "ward-21";
export const WARD_24_ID = "ward-24";

export const AREA_XYZ_ID = "area-xyz";
export const AREA_ABC_ID = "area-abc";
export const AREA_DEF_ID = "area-def";
export const AREA_GHI_ID = "area-ghi";

/** The four Ward 24 demo areas in code order A–D. */
export const WARD_24_AREA_IDS: string[] = [AREA_XYZ_ID, AREA_ABC_ID, AREA_DEF_ID, AREA_GHI_ID];

/** Map centre for city-level views. */
export const RAICHUR_CENTER: LatLng = [16.2, 77.35];

// ---------------------------------------------------------------------------
// Geometry helpers (pure)
// ---------------------------------------------------------------------------

/** `[south, west, north, east]` bounding box in degrees. */
type Box = [south: number, west: number, north: number, east: number];

const r4 = (n: number): number => Math.round(n * 10000) / 10000;

function rect([s, w, n, e]: Box): Polygon {
  return [
    [r4(s), r4(w)],
    [r4(n), r4(w)],
    [r4(n), r4(e)],
    [r4(s), r4(e)],
  ];
}

/** Rectangle with clipped corners (octagon) — used for zones so they read as districts, not tiles. */
function chamferedRect([s, w, n, e]: Box, c: number): Polygon {
  return [
    [r4(s + c), r4(w)],
    [r4(n - c), r4(w)],
    [r4(n), r4(w + c)],
    [r4(n), r4(e - c)],
    [r4(n - c), r4(e)],
    [r4(s + c), r4(e)],
    [r4(s), r4(e - c)],
    [r4(s), r4(w + c)],
  ];
}

function centroidOf(polygon: Polygon): LatLng {
  const lat = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
  const lng = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;
  return [r4(lat), r4(lng)];
}

/** Side of one ward square, degrees. */
const WARD_SIDE = 0.025;
/** Ward is split into a 2 × 2 grid of cells; each area is one cell inset by `AREA_GAP`. */
const CELL = WARD_SIDE / 2;
const AREA_GAP = 0.0008;

/** Area cell inside a ward box: row 0 = north, col 0 = west; spans allow a wide bottom row. */
function cell(ward: Box, row: number, col: number, rowSpan = 1, colSpan = 1): Box {
  const [, west, north] = ward;
  return [
    north - (row + rowSpan) * CELL + AREA_GAP,
    west + col * CELL + AREA_GAP,
    north - row * CELL - AREA_GAP,
    west + (col + colSpan) * CELL - AREA_GAP,
  ];
}

// ---------------------------------------------------------------------------
// Ward boxes — three rows of wards, one row per zone, laid out west → east
// ---------------------------------------------------------------------------

const WARD_BOX: Record<string, Box> = {
  // Zone 1 · North (lat 16.240–16.265)
  [WARD_03_ID]: [16.24, 77.31, 16.265, 77.335],
  [WARD_07_ID]: [16.24, 77.3375, 16.265, 77.3625],
  [WARD_09_ID]: [16.24, 77.365, 16.265, 77.39],
  // Zone 2 · Central (lat 16.200–16.225)
  [WARD_11_ID]: [16.2, 77.3225, 16.225, 77.3475],
  [WARD_15_ID]: [16.2, 77.3525, 16.225, 77.3775],
  // Zone 3 · South (lat 16.158–16.183)
  [WARD_18_ID]: [16.158, 77.31, 16.183, 77.335],
  [WARD_21_ID]: [16.158, 77.3375, 16.183, 77.3625],
  [WARD_24_ID]: [16.158, 77.365, 16.183, 77.39],
};

const ZONE_BOX: Record<string, Box> = {
  [ZONE_1_ID]: [16.232, 77.302, 16.273, 77.398],
  [ZONE_2_ID]: [16.192, 77.302, 16.23, 77.398],
  [ZONE_3_ID]: [16.15, 77.302, 16.19, 77.398],
};

const WARD_ZONE: Record<string, string> = {
  [WARD_03_ID]: ZONE_1_ID,
  [WARD_07_ID]: ZONE_1_ID,
  [WARD_09_ID]: ZONE_1_ID,
  [WARD_11_ID]: ZONE_2_ID,
  [WARD_15_ID]: ZONE_2_ID,
  [WARD_18_ID]: ZONE_3_ID,
  [WARD_21_ID]: ZONE_3_ID,
  [WARD_24_ID]: ZONE_3_ID,
};

// ---------------------------------------------------------------------------
// Areas
// ---------------------------------------------------------------------------

interface AreaSpec {
  id: string;
  name: string;
  wardId: string;
  code?: AreaCode;
  householdCount: number;
  participatingHouseholds: number;
  /** [row, col, rowSpan?, colSpan?] inside the ward's 2 × 2 grid. */
  cell: [number, number, number?, number?];
  streets: string[];
}

const AREA_SPECS: AreaSpec[] = [
  // ── Ward 03 · Zone 1 (245 / 120) ─────────────────────────────────────────
  {
    id: "area-w03-1",
    name: "Gandhi Nagar",
    wardId: WARD_03_ID,
    householdCount: 90,
    participatingHouseholds: 45,
    cell: [0, 0],
    streets: ["1st Cross", "2nd Cross", "Gandhi Nagar Main Road"],
  },
  {
    id: "area-w03-2",
    name: "Nehru Colony",
    wardId: WARD_03_ID,
    householdCount: 80,
    participatingHouseholds: 40,
    cell: [0, 1],
    streets: ["Nehru Colony 1st Main", "Nehru Colony 2nd Main", "Park Road"],
  },
  {
    id: "area-w03-3",
    name: "Station Road",
    wardId: WARD_03_ID,
    householdCount: 75,
    participatingHouseholds: 35,
    cell: [1, 0, 1, 2],
    streets: ["Station Road", "Railway Quarters Lane", "Goods Shed Road", "Bus Stand Cross"],
  },

  // ── Ward 07 · Zone 1 (265 / 130) ─────────────────────────────────────────
  {
    id: "area-w07-1",
    name: "Mantralayam Road",
    wardId: WARD_07_ID,
    householdCount: 70,
    participatingHouseholds: 35,
    cell: [0, 0],
    streets: ["Mantralayam Road", "Service Road", "Temple Street"],
  },
  {
    id: "area-w07-2",
    name: "Shakti Nagar",
    wardId: WARD_07_ID,
    householdCount: 65,
    participatingHouseholds: 30,
    cell: [0, 1],
    streets: ["Shakti Nagar 1st Cross", "Shakti Nagar 2nd Cross", "Colony Main Road"],
  },
  {
    id: "area-w07-3",
    name: "Jawahar Nagar",
    wardId: WARD_07_ID,
    householdCount: 60,
    participatingHouseholds: 30,
    cell: [1, 0],
    streets: ["Jawahar Nagar Main", "School Road", "3rd Cross"],
  },
  {
    id: "area-w07-4",
    name: "LBS Nagar",
    wardId: WARD_07_ID,
    householdCount: 70,
    participatingHouseholds: 35,
    cell: [1, 1],
    streets: ["LBS Nagar 1st Main", "LBS Nagar 2nd Main", "Water Tank Road", "4th Cross"],
  },

  // ── Ward 09 · Zone 1 (260 / 125) ─────────────────────────────────────────
  {
    id: "area-w09-1",
    name: "Ashok Nagar",
    wardId: WARD_09_ID,
    householdCount: 95,
    participatingHouseholds: 45,
    cell: [0, 0],
    streets: ["Ashok Nagar Main Road", "1st Cross", "2nd Cross"],
  },
  {
    id: "area-w09-2",
    name: "Basaveshwara Colony",
    wardId: WARD_09_ID,
    householdCount: 85,
    participatingHouseholds: 40,
    cell: [0, 1],
    streets: ["Basaveshwara Circle Road", "Colony 1st Main", "Colony 2nd Main"],
  },
  {
    id: "area-w09-3",
    name: "Vidya Nagar",
    wardId: WARD_09_ID,
    householdCount: 80,
    participatingHouseholds: 40,
    cell: [1, 0, 1, 2],
    streets: ["Vidya Nagar Main", "College Road", "Library Street", "5th Cross"],
  },

  // ── Ward 11 · Zone 2 (270 / 135) ─────────────────────────────────────────
  {
    id: "area-w11-1",
    name: "IDSMT Layout",
    wardId: WARD_11_ID,
    householdCount: 75,
    participatingHouseholds: 40,
    cell: [0, 0],
    streets: ["IDSMT 1st Main", "IDSMT 2nd Main", "Layout Ring Road"],
  },
  {
    id: "area-w11-2",
    name: "Yeramarus Camp",
    wardId: WARD_11_ID,
    householdCount: 70,
    participatingHouseholds: 35,
    cell: [0, 1],
    streets: ["Camp Main Road", "Quarters Lane", "Canal Road"],
  },
  {
    id: "area-w11-3",
    name: "Hutti Road",
    wardId: WARD_11_ID,
    householdCount: 65,
    participatingHouseholds: 30,
    cell: [1, 0],
    streets: ["Hutti Road", "Hutti Road 1st Cross", "Workshop Lane"],
  },
  {
    id: "area-w11-4",
    name: "Ambedkar Nagar",
    wardId: WARD_11_ID,
    householdCount: 60,
    participatingHouseholds: 30,
    cell: [1, 1],
    streets: ["Ambedkar Nagar Main", "Community Hall Road", "2nd Cross", "3rd Cross"],
  },

  // ── Ward 15 · Zone 2 (270 / 135) ─────────────────────────────────────────
  {
    id: "area-w15-1",
    name: "Brestwarpet",
    wardId: WARD_15_ID,
    householdCount: 100,
    participatingHouseholds: 50,
    cell: [0, 0],
    streets: ["Brestwarpet Main Road", "Market Lane", "Old Bazaar Street"],
  },
  {
    id: "area-w15-2",
    name: "Chandrabanda Road",
    wardId: WARD_15_ID,
    householdCount: 90,
    participatingHouseholds: 45,
    cell: [0, 1],
    streets: ["Chandrabanda Road", "Chandrabanda 1st Cross", "Nursery Lane"],
  },
  {
    id: "area-w15-3",
    name: "Sath Kacheri",
    wardId: WARD_15_ID,
    householdCount: 80,
    participatingHouseholds: 40,
    cell: [1, 0, 1, 2],
    streets: ["Sath Kacheri Road", "Court Street", "Fort Gate Lane", "Clock Tower Cross"],
  },

  // ── Ward 18 · Zone 3 (265 / 130) ─────────────────────────────────────────
  {
    id: "area-w18-1",
    name: "Askihal",
    wardId: WARD_18_ID,
    householdCount: 70,
    participatingHouseholds: 35,
    cell: [0, 0],
    streets: ["Askihal Main Road", "Askihal 1st Cross", "Tank Bund Road"],
  },
  {
    id: "area-w18-2",
    name: "Devi Nagar",
    wardId: WARD_18_ID,
    householdCount: 70,
    participatingHouseholds: 35,
    cell: [0, 1],
    streets: ["Devi Nagar 1st Main", "Devi Nagar 2nd Main", "Temple Road"],
  },
  {
    id: "area-w18-3",
    name: "Lingasugur Road",
    wardId: WARD_18_ID,
    householdCount: 65,
    participatingHouseholds: 30,
    cell: [1, 0],
    streets: ["Lingasugur Road", "Lingasugur Road 2nd Cross", "Petrol Bunk Lane"],
  },
  {
    id: "area-w18-4",
    name: "Siyatalab",
    wardId: WARD_18_ID,
    householdCount: 60,
    participatingHouseholds: 30,
    cell: [1, 1],
    streets: ["Siyatalab Main", "Lake View Road", "Masjid Street", "4th Cross"],
  },

  // ── Ward 21 · Zone 3 (270 / 130) ─────────────────────────────────────────
  {
    id: "area-w21-1",
    name: "Mangalwarpet",
    wardId: WARD_21_ID,
    householdCount: 95,
    participatingHouseholds: 45,
    cell: [0, 0],
    streets: ["Mangalwarpet Main Road", "Tuesday Market Lane", "1st Cross"],
  },
  {
    id: "area-w21-2",
    name: "Gunj Road",
    wardId: WARD_21_ID,
    householdCount: 90,
    participatingHouseholds: 45,
    cell: [0, 1],
    streets: ["Gunj Road", "APMC Gate Road", "Godown Lane"],
  },
  {
    id: "area-w21-3",
    name: "Ram Nagar",
    wardId: WARD_21_ID,
    householdCount: 85,
    participatingHouseholds: 40,
    cell: [1, 0, 1, 2],
    streets: ["Ram Nagar 1st Main", "Ram Nagar 2nd Main", "Ganesh Temple Street", "6th Cross"],
  },

  // ── Ward 24 · Zone 3 (3,160 / 700) — the demo ward ───────────────────────
  {
    id: AREA_XYZ_ID,
    name: "XYZ Colony",
    wardId: WARD_24_ID,
    code: "A",
    householdCount: 1050,
    participatingHouseholds: 260,
    cell: [0, 0],
    streets: ["Street A", "Street B", "Street C", "Main Road"],
  },
  {
    id: AREA_ABC_ID,
    name: "ABC Colony",
    wardId: WARD_24_ID,
    code: "B",
    householdCount: 780,
    participatingHouseholds: 180,
    cell: [0, 1],
    streets: ["ABC 1st Cross", "ABC 2nd Cross", "ABC 3rd Cross", "Ring Road"],
  },
  {
    id: AREA_DEF_ID,
    name: "DEF Colony",
    wardId: WARD_24_ID,
    code: "C",
    householdCount: 610,
    participatingHouseholds: 140,
    cell: [1, 0],
    streets: ["DEF Main Road", "DEF 1st Cross", "DEF 2nd Cross"],
  },
  {
    id: AREA_GHI_ID,
    name: "GHI Colony",
    wardId: WARD_24_ID,
    code: "D",
    householdCount: 720,
    participatingHouseholds: 120,
    cell: [1, 1],
    streets: ["GHI 1st Main", "GHI 2nd Main", "GHI Park Road", "Bypass Cross"],
  },
];

export const AREAS: Area[] = AREA_SPECS.map((spec) => {
  const [row, col, rowSpan, colSpan] = spec.cell;
  const polygon = rect(cell(WARD_BOX[spec.wardId], row, col, rowSpan, colSpan));
  return {
    id: spec.id,
    name: spec.name,
    wardId: spec.wardId,
    zoneId: WARD_ZONE[spec.wardId],
    code: spec.code,
    householdCount: spec.householdCount,
    participatingHouseholds: spec.participatingHouseholds,
    polygon,
    centroid: centroidOf(polygon),
    streets: spec.streets,
  };
});

// ---------------------------------------------------------------------------
// Wards (counts roll up from their areas)
// ---------------------------------------------------------------------------

const WARD_NUMBERS: Record<string, number> = {
  [WARD_03_ID]: 3,
  [WARD_07_ID]: 7,
  [WARD_09_ID]: 9,
  [WARD_11_ID]: 11,
  [WARD_15_ID]: 15,
  [WARD_18_ID]: 18,
  [WARD_21_ID]: 21,
  [WARD_24_ID]: 24,
};

export const WARDS: Ward[] = Object.keys(WARD_BOX).map((id) => {
  const areas = AREAS.filter((a) => a.wardId === id);
  const polygon = rect(WARD_BOX[id]);
  return {
    id,
    number: WARD_NUMBERS[id],
    name: `Ward ${WARD_NUMBERS[id]}`,
    zoneId: WARD_ZONE[id],
    areaIds: areas.map((a) => a.id),
    polygon,
    centroid: centroidOf(polygon),
    householdCount: areas.reduce((sum, a) => sum + a.householdCount, 0),
    participatingHouseholds: areas.reduce((sum, a) => sum + a.participatingHouseholds, 0),
  };
});

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

const ZONE_NAMES: Record<string, string> = {
  [ZONE_1_ID]: "Zone 1 · North",
  [ZONE_2_ID]: "Zone 2 · Central",
  [ZONE_3_ID]: "Zone 3 · South",
};

export const ZONES: Zone[] = Object.keys(ZONE_BOX).map((id) => {
  const polygon = chamferedRect(ZONE_BOX[id], 0.005);
  return {
    id,
    name: ZONE_NAMES[id],
    wardIds: WARDS.filter((w) => w.zoneId === id).map((w) => w.id),
    polygon,
    centroid: centroidOf(polygon),
  };
});

// ---------------------------------------------------------------------------
// City totals and bounds
// ---------------------------------------------------------------------------

/** ≈ 5,000 households city-wide (aggregate demo count). */
export const CITY_HOUSEHOLD_COUNT = AREAS.reduce((sum, a) => sum + a.householdCount, 0);
/** ≈ 1,600 participating households city-wide. */
export const CITY_PARTICIPATING_HOUSEHOLDS = AREAS.reduce(
  (sum, a) => sum + a.participatingHouseholds,
  0,
);

/** `[southWest, northEast]` bounds enclosing every zone, for `fitBounds`. */
export const CITY_BOUNDS: [LatLng, LatLng] = [
  [16.12, 77.27],
  [16.31, 77.44],
];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

const AREA_MAP = new Map(AREAS.map((a) => [a.id, a]));
const WARD_MAP = new Map(WARDS.map((w) => [w.id, w]));
const ZONE_MAP = new Map(ZONES.map((z) => [z.id, z]));

export function getArea(id: string): Area | undefined {
  return AREA_MAP.get(id);
}

export function getWard(id: string): Ward | undefined {
  return WARD_MAP.get(id);
}

export function getZone(id: string): Zone | undefined {
  return ZONE_MAP.get(id);
}

export function areasOfWard(wardId: string): Area[] {
  return AREAS.filter((a) => a.wardId === wardId);
}

export function wardsOfZone(zoneId: string): Ward[] {
  return WARDS.filter((w) => w.zoneId === zoneId);
}

/** Area label with its Ward 24 code when present, e.g. "Area A · XYZ Colony". */
export function areaDisplayName(area: Area): string {
  return area.code ? `Area ${area.code} · ${area.name}` : area.name;
}

// ---------------------------------------------------------------------------
// Industrial sites (emissions map, §8.15) — outside the residential ward grid
// ---------------------------------------------------------------------------

/** Static location of an industrial unit; readings/thresholds are seeded separately. */
export interface IndustrialSite {
  id: string;
  name: string;
  sector: string;
  location: LatLng;
  stackHeightM: number;
}

export const INDUSTRIAL_SITES: IndustrialSite[] = [
  {
    id: "ind-01",
    name: "Raichur Thermal Cluster Unit A",
    sector: "Thermal power",
    location: [16.298, 77.42],
    stackHeightM: 220,
  },
  {
    id: "ind-02",
    name: "Shakti Nagar Cement Works",
    sector: "Cement",
    location: [16.29, 77.405],
    stackHeightM: 90,
  },
  {
    id: "ind-03",
    name: "Yeramarus Power Block",
    sector: "Thermal power",
    location: [16.275, 77.3],
    stackHeightM: 275,
  },
  {
    id: "ind-04",
    name: "Deosugur Rice Mills",
    sector: "Agro processing",
    location: [16.135, 77.33],
    stackHeightM: 30,
  },
  {
    id: "ind-05",
    name: "Hutti Road Steel Rolling",
    sector: "Steel",
    location: [16.215, 77.29],
    stackHeightM: 45,
  },
  {
    id: "ind-06",
    name: "Manvi Road Chemicals",
    sector: "Chemicals",
    location: [16.14, 77.395],
    stackHeightM: 40,
  },
  {
    id: "ind-07",
    name: "IDSMT Foundry",
    sector: "Foundry",
    location: [16.205, 77.405],
    stackHeightM: 35,
  },
  {
    id: "ind-08",
    name: "Chandrabanda Textiles",
    sector: "Textiles",
    location: [16.24, 77.41],
    stackHeightM: 30,
  },
];
