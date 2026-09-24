"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

import { ChartTooltip } from "./ChartTooltip";
import { tickStyle, useChartTheme } from "./chartTheme";

export interface HistogramBin {
  label: string;
  count: number;
  color?: string;
}

export interface HistogramChartProps {
  bins: ReadonlyArray<HistogramBin>;
  height?: number;
  /** Default bar colour when a bin has none. */
  color?: string;
  /** Label for the count in the tooltip (e.g. "Households"). */
  countLabel?: string;
  yAxisWidth?: number;
  className?: string;
  ariaLabel?: string;
}

/** Distribution bars (households per consumption band, cases per severity). */
export function HistogramChart({
  bins,
  height = 220,
  color,
  countLabel = "Count",
  yAxisWidth = 36,
  className,
  ariaLabel,
}: HistogramChartProps) {
  const theme = useChartTheme();
  const reduced = useReducedMotion();
  const fallback = color ?? theme.primary;
  const rows = bins as HistogramBin[];

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? `Distribution across ${rows.length} bins`}
      className={cn("w-full", className)}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          barCategoryGap="18%"
        >
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={tickStyle(theme)}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
          />
          <YAxis
            width={yAxisWidth}
            tick={tickStyle(theme)}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip cursor={{ fill: theme.grid }} content={<ChartTooltip decimals={0} />} />
          <Bar
            dataKey="count"
            name={countLabel}
            radius={[4, 4, 0, 0]}
            isAnimationActive={!reduced}
            animationDuration={500}
          >
            {rows.map((b) => (
              <Cell key={b.label} fill={b.color ?? fallback} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
