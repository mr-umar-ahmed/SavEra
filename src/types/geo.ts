/**
 * Geography of the demo city (Raichur): zones → wards → areas (colonies).
 * Polygons are approximate, hand-authored GeoJSON-style rings in [lat, lng] order
 * (the order react-leaflet expects), not the GeoJSON [lng, lat] order.
 */

/** A point as a `[latitude, longitude]` tuple. */
export type LatLng = [lat: number, lng: number];

/** A closed ring of points (first point need not be repeated). */
export type Polygon = LatLng[];

/** Administrative zone containing several wards (e.g. "Zone 3 · South"). */
export interface Zone {
  id: string;
  name: string;
  wardIds: string[];
  polygon: Polygon;
  centroid: LatLng;
}

/** Municipal ward (e.g. `ward-24`, number 24, "Ward 24"). */
export interface Ward {
  id: string;
  number: number;
  name: string;
  zoneId: string;
  areaIds: string[];
  polygon: Polygon;
  centroid: LatLng;
  /** Total households in the ward (aggregate count). */
  householdCount: number;
  /** Households participating in SAVERA (aggregate count). */
  participatingHouseholds: number;
}

/** Short area code used on supervisor LPG screens ("Area A–D"). */
export type AreaCode = "A" | "B" | "C" | "D";

/** Colony / locality inside a ward (e.g. `area-xyz`, "XYZ Colony"). */
export interface Area {
  id: string;
  name: string;
  wardId: string;
  zoneId: string;
  /** Present only for the four Ward 24 demo areas. */
  code?: AreaCode;
  householdCount: number;
  participatingHouseholds: number;
  polygon: Polygon;
  centroid: LatLng;
  /** Street names used by water field verification ("affected streets"). */
  streets: string[];
}
