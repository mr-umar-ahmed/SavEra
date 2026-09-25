"use client";

import "leaflet/dist/leaflet.css";
import "./map.css";

import * as React from "react";
import { useRouter } from "next/navigation";
import { latLngBounds, type LeafletMouseEvent, type Polygon as LeafletPolygon } from "leaflet";
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

import { useChartTheme } from "@/components/charts/chartTheme";
import { cn } from "@/lib/utils";
import { TONE_LABEL, type Tone } from "@/types/common";
import type { LatLng } from "@/types/geo";

import type { AreaMapFeature, AreaMapMarker, AreaMapPolyline, AreaMapProps } from "./types";

const TONE_DOT: Record<Tone, string> = {
  optimal: "bg-tone-optimal",
  normal: "bg-tone-normal",
  moderate: "bg-tone-moderate",
  critical: "bg-tone-critical",
  unknown: "bg-tone-unknown",
};

/** Raichur, Karnataka. */
const DEFAULT_CENTER: LatLng = [16.2076, 77.3463];

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

function FitBounds({
  features,
  markers,
  polylines,
}: {
  features: ReadonlyArray<AreaMapFeature>;
  markers: ReadonlyArray<AreaMapMarker>;
  polylines: ReadonlyArray<AreaMapPolyline>;
}) {
  const map = useMap();
  const key =
    features.map((f) => f.id).join("|") +
    "#" +
    markers.map((m) => m.id).join("|") +
    "#" +
    polylines.map((p) => p.id).join("|");

  const lastKey = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    const points: LatLng[] = [
      ...features.flatMap((f) => f.polygon),
      ...markers.map((m) => m.position),
      ...polylines.flatMap((p) => p.positions),
    ];
    if (points.length === 0) return;
    const bounds = latLngBounds(points);
    if (!bounds.isValid()) return;
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15, animate: false });
  }, [map, key, features, markers, polylines]);
  return null;
}

function TooltipBody({
  name,
  tone,
  label,
  value,
  details,
}: {
  name: string;
  tone: Tone;
  label: string;
  value?: string;
  details?: string;
}) {
  return (
    <div className="min-w-[9rem] max-w-[16rem]">
      <p className="font-semibold text-xs text-foreground">{name}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-2xs">
        <span
          aria-hidden="true"
          className={cn("inline-block size-2 rounded-full", TONE_DOT[tone])}
        />
        <span className="text-muted-foreground">{label}</span>
      </p>
      {value ? <p className="mt-1 font-mono font-bold text-xs tabular-nums text-foreground">{value}</p> : null}
      {details ? <p className="mt-1 text-2xs text-muted-foreground leading-snug border-t border-border/60 pt-1">{details}</p> : null}
    </div>
  );
}

/**
 * Leaflet map (client-only). Use `AreaMap`, which dynamic-imports this file
 * with `ssr: false`. Renders polygons (areas), polylines (pipelines & feeders),
 * and circle markers (SCADA sensors & facilities).
 */
export default function AreaMapInner({
  features = [],
  center,
  zoom = 13,
  height = 360,
  onSelect,
  selectedId,
  legend,
  markers = [],
  polylines = [],
  scrollWheelZoom = false,
  className,
  ariaLabel,
  showLayerToggle = false,
}: AreaMapProps) {
  const router = useRouter();
  const chart = useChartTheme();
  const TONE_HEX = chart.tone;

  const [showAreas, setShowAreas] = React.useState(true);
  const [showPipelines, setShowPipelines] = React.useState(true);
  const [showMarkers, setShowMarkers] = React.useState(true);

  const handleSelect = React.useCallback(
    (feature: AreaMapFeature) => {
      if (onSelect) {
        onSelect(feature.id);
        return;
      }
      if (feature.href) router.push(feature.href);
    },
    [onSelect, router],
  );

  return (
    <div
      className={cn("savera-map relative overflow-hidden rounded-2xl", className)}
      style={{ height }}
      role="region"
      aria-label={ariaLabel ?? "Area status map"}
    >
      <MapContainer
        center={center ?? DEFAULT_CENTER}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        style={{ height: "100%", width: "100%" }}
        attributionControl
      >
        <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
        <FitBounds features={features} markers={markers} polylines={polylines} />

        {/* Polygons (Area Wards / Colonies) */}
        {showAreas &&
          features.map((f) => {
            const selected = selectedId === f.id;
            const hex = TONE_HEX[f.tone];
            return (
              <Polygon
                key={f.id}
                positions={f.polygon}
                pathOptions={{
                  color: hex,
                  weight: selected ? 2.5 : 1.5,
                  opacity: selected ? 1 : 0.8,
                  fillColor: hex,
                  fillOpacity: selected ? 0.6 : 0.35,
                }}
                eventHandlers={{
                  click: () => handleSelect(f),
                  mouseover: (e: LeafletMouseEvent) =>
                    (e.target as LeafletPolygon).setStyle({ fillOpacity: selected ? 0.65 : 0.5 }),
                  mouseout: (e: LeafletMouseEvent) =>
                    (e.target as LeafletPolygon).setStyle({ fillOpacity: selected ? 0.6 : 0.35 }),
                }}
              >
                <Tooltip sticky direction="top" opacity={1}>
                  <TooltipBody name={f.name} tone={f.tone} label={f.label} value={f.value} />
                </Tooltip>
              </Polygon>
            );
          })}

        {/* Polylines (Water Supply Pipelines & Transmission Feeders) */}
        {showPipelines &&
          polylines.map((p) => {
            const hex = TONE_HEX[p.tone];
            const isCritical = p.tone === "critical";
            return (
              <Polyline
                key={p.id}
                positions={p.positions}
                pathOptions={{
                  color: hex,
                  weight: p.weight ?? (isCritical ? 4.5 : 3.5),
                  opacity: isCritical ? 1 : 0.88,
                  dashArray: p.dashArray,
                }}
              >
                <Tooltip sticky direction="top" opacity={1}>
                  <TooltipBody
                    name={p.name}
                    tone={p.tone}
                    label={p.label}
                    value={p.value}
                    details={
                      p.diameterMm
                        ? `Diameter: ${p.diameterMm}mm · Nominal: ${p.pressureBar ?? 2.0} bar`
                        : undefined
                    }
                  />
                </Tooltip>
              </Polyline>
            );
          })}

        {/* Markers (Facilities, Reservoirs, Pressure Sensors) */}
        {showMarkers &&
          markers.map((m) => {
            const hex = TONE_HEX[m.tone];
            const isCritical = m.tone === "critical";
            const radius = m.radius ?? (m.type === "facility" ? 8 : 6);
            return (
              <CircleMarker
                key={m.id}
                center={m.position}
                radius={radius}
                pathOptions={{
                  color: isCritical ? "#ef4444" : chart.surface,
                  weight: isCritical ? 3 : 2,
                  opacity: 0.95,
                  fillColor: hex,
                  fillOpacity: 0.95,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  <TooltipBody
                    name={m.label}
                    tone={m.tone}
                    label={TONE_LABEL[m.tone]}
                    value={m.value}
                    details={m.details}
                  />
                </Tooltip>
              </CircleMarker>
            );
          })}
      </MapContainer>

      {/* Layer Toggles Floating Control */}
      {showLayerToggle && (
        <div className="absolute top-3 right-3 z-[1000] bg-card/90 backdrop-blur-md border border-border rounded-xl p-2 shadow-lg space-y-1 text-2xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-foreground hover:text-positive">
            <input
              type="checkbox"
              checked={showAreas}
              onChange={(e) => setShowAreas(e.target.checked)}
              className="accent-primary"
            />
            <span>Area Wards</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-foreground hover:text-positive">
            <input
              type="checkbox"
              checked={showPipelines}
              onChange={(e) => setShowPipelines(e.target.checked)}
              className="accent-primary"
            />
            <span>Water Pipelines</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-foreground hover:text-positive">
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={(e) => setShowMarkers(e.target.checked)}
              className="accent-primary"
            />
            <span>SCADA &amp; Facilities</span>
          </label>
        </div>
      )}

      {/* Legend */}
      {legend && legend.length > 0 ? (
        <div
          className="glass pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-xl px-3 py-2 bg-card/90 backdrop-blur-md border border-border"
          aria-label="Map legend"
        >
          <ul className="flex flex-col gap-1 text-xs">
            {legend.map((item) => (
              <li key={`${item.tone}-${item.label}`} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn("inline-block size-2.5 rounded-sm", TONE_DOT[item.tone])}
                />
                <span className="text-foreground/90 text-2xs">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="sr-only" aria-label="Areas on the map">
        {features.map((f) => (
          <li key={f.id}>
            {f.name}: {f.label}
            {f.value ? ` (${f.value})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

