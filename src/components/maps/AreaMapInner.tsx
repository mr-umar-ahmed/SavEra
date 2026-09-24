"use client";

import "leaflet/dist/leaflet.css";
import "./map.css";

import * as React from "react";
import { useRouter } from "next/navigation";
import { latLngBounds, type LeafletMouseEvent, type Polygon as LeafletPolygon } from "leaflet";
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";

import { cn } from "@/lib/utils";
import { TONE_LABEL, type Tone } from "@/types/common";
import type { LatLng } from "@/types/geo";

import type { AreaMapFeature, AreaMapMarker, AreaMapProps } from "./types";

const TONE_HEX: Record<Tone, string> = {
  optimal: "#22D3EE",
  normal: "#10B981",
  moderate: "#F59E0B",
  critical: "#EF4444",
  unknown: "#6B7280",
};

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
}: {
  features: ReadonlyArray<AreaMapFeature>;
  markers: ReadonlyArray<AreaMapMarker>;
}) {
  const map = useMap();
  const key = features.map((f) => f.id).join("|") + "#" + markers.map((m) => m.id).join("|");
  const lastKey = React.useRef<string | null>(null);
  React.useEffect(() => {
    // Re-fit only when the set of features / markers changes, not on every re-render.
    if (lastKey.current === key) return;
    lastKey.current = key;
    const points: LatLng[] = [
      ...features.flatMap((f) => f.polygon),
      ...markers.map((m) => m.position),
    ];
    if (points.length === 0) return;
    const bounds = latLngBounds(points);
    if (!bounds.isValid()) return;
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15, animate: false });
  }, [map, key, features, markers]);
  return null;
}

function TooltipBody({
  name,
  tone,
  label,
  value,
}: {
  name: string;
  tone: Tone;
  label: string;
  value?: string;
}) {
  return (
    <div className="min-w-[8rem]">
      <p className="font-semibold">{name}</p>
      <p className="mt-0.5 flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn("inline-block size-2 rounded-full", TONE_DOT[tone])}
        />
        <span className="text-muted-foreground">{label}</span>
      </p>
      {value ? <p className="mt-0.5 font-semibold tabular-nums">{value}</p> : null}
    </div>
  );
}

/**
 * Leaflet map (client-only). Use `AreaMap`, which dynamic-imports this file
 * with `ssr: false`. Uses CircleMarker for point markers so the default
 * Leaflet marker icons (broken under bundlers) are never needed.
 */
export default function AreaMapInner({
  features,
  center,
  zoom = 13,
  height = 360,
  onSelect,
  selectedId,
  legend,
  markers = [],
  scrollWheelZoom = false,
  className,
  ariaLabel,
}: AreaMapProps) {
  const router = useRouter();

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
        <FitBounds features={features} markers={markers} />

        {features.map((f) => {
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

        {markers.map((m) => {
          const hex = TONE_HEX[m.tone];
          return (
            <CircleMarker
              key={m.id}
              center={m.position}
              radius={7}
              pathOptions={{
                color: "#FFFFFF",
                weight: 2,
                opacity: 0.9,
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
                />
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {legend && legend.length > 0 ? (
        <div
          className="glass pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-xl px-3 py-2"
          aria-label="Map legend"
        >
          <ul className="flex flex-col gap-1 text-xs">
            {legend.map((item) => (
              <li key={`${item.tone}-${item.label}`} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn("inline-block size-2.5 rounded-sm", TONE_DOT[item.tone])}
                />
                <span className="text-foreground/90">{item.label}</span>
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
