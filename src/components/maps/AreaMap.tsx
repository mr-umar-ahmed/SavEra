"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { AreaMapProps } from "./types";

export interface MapSkeletonProps {
  height?: number | string;
  className?: string;
}

/** Placeholder shown while the Leaflet bundle loads (also usable before data is ready). */
export function MapSkeleton({ height = 360, className }: MapSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden rounded-2xl", className)}
      style={{ height }}
    >
      <Skeleton className="h-full w-full rounded-2xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Loading map
        </span>
      </div>
    </div>
  );
}

const AreaMapInner = dynamic(() => import("./AreaMapInner"), {
  ssr: false,
  loading: () => null,
});

/**
 * Area / ward status map (react-leaflet on OpenStreetMap tiles), loaded on the
 * client only. Polygons are coloured by status tone; always pair with a legend
 * and the tooltip label so colour is never the only cue.
 *
 * The skeleton sits underneath at the requested height until the map bundle
 * has loaded and painted over it, so there is no layout shift.
 */
export function AreaMap({ height = 360, className, ...props }: AreaMapProps) {
  return (
    <div className={cn("relative", className)} style={{ height }}>
      <MapSkeleton height="100%" className="absolute inset-0" />
      <div className="relative h-full w-full">
        <AreaMapInner {...props} height="100%" />
      </div>
    </div>
  );
}
