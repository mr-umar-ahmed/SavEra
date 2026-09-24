"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { compactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ChartLegend } from "./ChartLegend";
import { ChartTooltip } from "./ChartTooltip";
import { tickStyle, useChartTheme } from "./chartTheme";

export interface ComparePoint {
  name: string;
  prev: number;
  curr: number;
}

export interface CompareBarChartProps {
  data: ReadonlyArray<ComparePoint>;
  /** Series labels, e.g. `{ prev: "Aug 2026", curr: "Sep 2026" }`. */
  labels: { prev: string; curr: string };
  unit?: string;
  /** Colour of the current series; the previous series is neutral. */
  color?: string;
  height?: number;
  /** Horizontal bars (long category names). */
  layout?: "vertical" | "horizontal";
  yAxisWidth?: number;
  className?: string;
  ariaLabel?: string;
}

/** Grouped bars comparing a previous and current period per category. */
export function CompareBarChart({
  data,
  labels,
  unit,
  color,
  height = 260,
  layout = "vertical",
  yAxisWidth,
  className,
  ariaLabel,
}: CompareBarChartProps) {
  const theme = useChartTheme();
  const reduced = useReducedMotion();
  const curr = color ?? theme.primary;
  const rows = data as ComparePoint[];
  const horizontal = layout === "horizontal";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="img"
        aria-label={ariaLabel ?? `${labels.prev} versus ${labels.curr} by category`}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            barGap={2}
            barCategoryGap="28%"
          >
            <CartesianGrid
              stroke={theme.grid}
              strokeDasharray="3 3"
              vertical={horizontal}
              horizontal={!horizontal}
            />
            {horizontal ? (
              <>
                <XAxis
                  type="number"
                  tick={tickStyle(theme)}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => compactNumber(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={yAxisWidth ?? 96}
                  tick={tickStyle(theme)}
                  tickLine={false}
                  axisLine={false}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  tick={tickStyle(theme)}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                />
                <YAxis
                  width={yAxisWidth ?? 44}
                  tick={tickStyle(theme)}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => compactNumber(v)}
                />
              </>
            )}
            <Tooltip cursor={{ fill: theme.grid }} content={<ChartTooltip unit={unit} />} />
            <Bar
              dataKey="prev"
              name={labels.prev}
              fill={theme.neutral}
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={500}
            />
            <Bar
              dataKey="curr"
              name={labels.curr}
              fill={curr}
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              isAnimationActive={!reduced}
              animationDuration={500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { key: "prev", label: labels.prev, color: theme.neutral, kind: "bar" },
          { key: "curr", label: labels.curr, color: curr, kind: "bar" },
        ]}
      />
    </div>
  );
}
