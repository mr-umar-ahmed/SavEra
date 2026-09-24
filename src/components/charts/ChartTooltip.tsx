"use client";

import * as React from "react";
import type { TooltipPayloadEntry } from "recharts";

import { formatIN } from "@/lib/format";

import { autoDecimals, useChartTheme } from "./chartTheme";

export interface ChartTooltipRow {
  key: string;
  label: string;
  value: string;
  color?: string;
}

export interface ChartTooltipProps {
  /** Injected by Recharts when passed as `content={<ChartTooltip />}`. */
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadEntry>;
  label?: string | number;
  /** Unit appended to numeric values (`kWh`, `L`, `%`). */
  unit?: string;
  decimals?: number;
  /** Override the numeric formatter. */
  formatValue?: (value: number, key: string) => string;
  /** Format the x label (e.g. `formatMonth`). */
  formatLabel?: (label: string | number) => string;
  /** Data keys to omit (helper series such as stacked band offsets). */
  hideKeys?: ReadonlyArray<string>;
  /** Fully custom rows derived from the hovered payload. */
  rows?: (
    payload: ReadonlyArray<TooltipPayloadEntry>,
    label?: string | number,
  ) => ChartTooltipRow[];
}

export function formatTooltipNumber(value: number, unit?: string, decimals?: number): string {
  const d = decimals ?? autoDecimals(value);
  const body = formatIN(value, d);
  if (!unit) return body;
  return unit === "%" ? `${body}%` : `${body} ${unit}`;
}

/** Themed tooltip content used by every SAVERA chart. */
export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  decimals,
  formatValue,
  formatLabel,
  hideKeys = [],
  rows,
}: ChartTooltipProps) {
  const theme = useChartTheme();
  if (!active || !payload || payload.length === 0) return null;

  const items: ChartTooltipRow[] = rows
    ? rows(payload, label)
    : payload
        .filter((p) => {
          const key = String(p.dataKey ?? p.name ?? "");
          return !hideKeys.includes(key) && p.value !== undefined && p.value !== null;
        })
        .map((p, i) => {
          const key = String(p.dataKey ?? p.name ?? i);
          const raw = p.value;
          const numeric = typeof raw === "number" ? raw : Number(raw);
          const value = Number.isFinite(numeric)
            ? formatValue
              ? formatValue(numeric, key)
              : formatTooltipNumber(numeric, unit, decimals)
            : String(raw ?? "—");
          return {
            key,
            label: String(p.name ?? key),
            value,
            color: p.color ?? p.stroke ?? p.fill,
          };
        });

  if (items.length === 0) return null;

  return (
    <div style={theme.tooltipStyle} className="min-w-[8rem]">
      {label !== undefined && label !== "" ? (
        <p
          style={{ color: theme.mutedText }}
          className="mb-1 text-[11px] font-semibold tracking-wide uppercase"
        >
          {formatLabel ? formatLabel(label) : String(label)}
        </p>
      ) : null}
      <ul className="space-y-1">
        {items.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              {row.color ? (
                <span
                  aria-hidden="true"
                  className="inline-block size-2 rounded-full"
                  style={{ background: row.color }}
                />
              ) : null}
              <span style={{ color: theme.mutedText }}>{row.label}</span>
            </span>
            <span className="font-semibold tabular-nums" style={{ color: theme.text }}>
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
