"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface ChartLegendItem {
  key: string;
  label: string;
  color: string;
  /** Swatch style. */
  kind?: "line" | "dashed" | "area" | "bar" | "band" | "dot";
}

export interface ChartLegendProps extends React.ComponentProps<"ul"> {
  items: ReadonlyArray<ChartLegendItem>;
}

/** HTML legend rendered under a chart (always present for two or more series). */
export function ChartLegend({ items, className, ...props }: ChartLegendProps) {
  return (
    <ul
      data-slot="chart-legend"
      aria-label="Legend"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs",
        className,
      )}
      {...props}
    >
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <Swatch color={item.color} kind={item.kind ?? "line"} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Swatch({ color, kind }: { color: string; kind: NonNullable<ChartLegendItem["kind"]> }) {
  switch (kind) {
    case "dot":
      return (
        <span
          aria-hidden="true"
          className="inline-block size-2.5 rounded-full"
          style={{ background: color }}
        />
      );
    case "bar":
      return (
        <span
          aria-hidden="true"
          className="inline-block h-3 w-2.5 rounded-sm"
          style={{ background: color }}
        />
      );
    case "area":
      return (
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-4 rounded-sm"
          style={{ background: color, opacity: 0.45, boxShadow: `inset 0 2px 0 ${color}` }}
        />
      );
    case "band":
      return (
        <span
          aria-hidden="true"
          className="inline-block h-2.5 w-4 rounded-sm border"
          style={{ background: color, opacity: 0.6, borderColor: color }}
        />
      );
    case "dashed":
      return (
        <span
          aria-hidden="true"
          className="inline-block h-0 w-4 border-t-2 border-dashed"
          style={{ borderColor: color }}
        />
      );
    case "line":
    default:
      return (
        <span
          aria-hidden="true"
          className="inline-block h-0.5 w-4 rounded-full"
          style={{ background: color }}
        />
      );
  }
}
