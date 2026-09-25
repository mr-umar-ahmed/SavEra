"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { formatIN, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ChartTooltip } from "./ChartTooltip";
import { useChartTheme } from "./chartTheme";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: ReadonlyArray<DonutSlice>;
  centerLabel?: string;
  centerValue?: React.ReactNode;
  height?: number;
  unit?: string;
  /** Show the slice list with values and shares beside the ring. */
  showList?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** Donut breakdown (appliance share, category share) with a centre statistic. */
export function DonutChart({
  data,
  centerLabel,
  centerValue,
  height = 220,
  unit,
  showList = true,
  className,
  ariaLabel,
}: DonutChartProps) {
  const theme = useChartTheme();
  const reduced = useReducedMotion();
  const rows = data as DonutSlice[];
  const total = rows.reduce((acc, r) => acc + (Number.isFinite(r.value) ? r.value : 0), 0);

  return (
    <div className={cn("flex flex-col items-center gap-4 sm:flex-row sm:items-center", className)}>
      <div
        role="img"
        aria-label={ariaLabel ?? `Breakdown of ${rows.length} categories`}
        className="relative w-full shrink-0 sm:w-auto"
        style={{ height, minWidth: Math.min(height, 240) }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip unit={unit} />} />
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="88%"
              paddingAngle={2}
              cornerRadius={4}
              stroke={theme.surface}
              strokeWidth={2}
              isAnimationActive={!reduced}
              animationDuration={600}
            >
              {rows.map((r) => (
                <Cell key={r.name} fill={r.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {centerValue !== undefined || centerLabel ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue !== undefined ? (
              <span className="font-display text-foreground text-2xl leading-none font-black tracking-tight tabular-nums">
                {centerValue}
              </span>
            ) : null}
            {centerLabel ? (
              <span className="text-muted-foreground mt-1 text-2xs font-semibold tracking-wide uppercase">
                {centerLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {showList ? (
        <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm" aria-label="Breakdown">
          {rows.map((r) => {
            const share = total > 0 ? (r.value / total) * 100 : 0;
            return (
              <li key={r.name} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ background: r.color }}
                  />
                  <span className="text-foreground/90 truncate">{r.name}</span>
                </span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  <span className="text-foreground font-semibold">
                    {formatIN(r.value, Math.abs(r.value) < 10 ? 1 : 0)}
                    {unit ? ` ${unit}` : ""}
                  </span>
                  <span className="ml-2">{formatPct(share, 0)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
