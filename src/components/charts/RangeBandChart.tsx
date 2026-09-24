"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { compactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ChartLegend } from "./ChartLegend";
import { ChartTooltip, formatTooltipNumber, type ChartTooltipRow } from "./ChartTooltip";
import { tickStyle, useChartTheme } from "./chartTheme";

export interface RangeBandPoint {
  x: string;
  actual?: number;
  low: number;
  high: number;
}

export interface RangeBandChartProps {
  data: ReadonlyArray<RangeBandPoint>;
  unit?: string;
  height?: number;
  /** Colour of the actual line; defaults to the emerald primary. */
  color?: string;
  /** Legend / tooltip labels. */
  labels?: { actual?: string; band?: string };
  formatX?: (x: string) => string;
  yAxisWidth?: number;
  className?: string;
  ariaLabel?: string;
}

interface StackedRow {
  x: string;
  actual?: number;
  low: number;
  high: number;
  band: number;
}

/** Baseline band (low–high area) with the actual value plotted as a line. */
export function RangeBandChart({
  data,
  unit,
  height = 260,
  color,
  labels,
  formatX,
  yAxisWidth = 44,
  className,
  ariaLabel,
}: RangeBandChartProps) {
  const theme = useChartTheme();
  const reduced = useReducedMotion();
  const line = color ?? theme.primary;
  const actualLabel = labels?.actual ?? "Actual";
  const bandLabel = labels?.band ?? "Baseline band";

  const rows: StackedRow[] = data.map((d) => ({
    x: d.x,
    actual: d.actual,
    low: d.low,
    high: d.high,
    band: Math.max(d.high - d.low, 0),
  }));

  const tooltipRows = (payload: ReadonlyArray<{ payload?: unknown }>): ChartTooltipRow[] => {
    const row = payload[0]?.payload as StackedRow | undefined;
    if (!row) return [];
    const out: ChartTooltipRow[] = [];
    if (row.actual !== undefined) {
      out.push({
        key: "actual",
        label: actualLabel,
        value: formatTooltipNumber(row.actual, unit),
        color: line,
      });
    }
    out.push({
      key: "band",
      label: bandLabel,
      value: `${formatTooltipNumber(row.low, undefined)} – ${formatTooltipNumber(row.high, unit)}`,
      color: theme.band,
    });
    return out;
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="img"
        aria-label={ariaLabel ?? `${actualLabel} against ${bandLabel.toLowerCase()}`}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="x"
              tick={tickStyle(theme)}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatX}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              width={yAxisWidth}
              tick={tickStyle(theme)}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => compactNumber(v)}
            />
            <Tooltip
              cursor={{ stroke: theme.cursor, strokeDasharray: "3 3" }}
              content={
                <ChartTooltip
                  rows={tooltipRows}
                  formatLabel={formatX ? (l) => formatX(String(l)) : undefined}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="low"
              stackId="band"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
              dot={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="band"
              name={bandLabel}
              stackId="band"
              stroke="none"
              fill={theme.band}
              fillOpacity={1}
              isAnimationActive={!reduced}
              animationDuration={600}
              dot={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name={actualLabel}
              stroke={line}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2, stroke: theme.surface, fill: line }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: theme.surface, fill: line }}
              connectNulls
              isAnimationActive={!reduced}
              animationDuration={600}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { key: "actual", label: actualLabel, color: line, kind: "line" },
          { key: "band", label: bandLabel, color: theme.primary, kind: "band" },
        ]}
      />
    </div>
  );
}
