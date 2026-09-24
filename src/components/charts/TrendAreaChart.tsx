"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { compactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ChartDefs } from "./ChartDefs";
import { ChartLegend } from "./ChartLegend";
import { ChartTooltip } from "./ChartTooltip";
import { gradientDefs, tickStyle, useChartTheme } from "./chartTheme";

export interface TrendPoint {
  x: string;
  y?: number;
  y2?: number;
  [key: string]: string | number | undefined;
}

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  /** Dashed stroke (e.g. area average). */
  dashed?: boolean;
}

export interface TrendReferenceLine {
  y: number;
  label: string;
  color?: string;
}

export interface TrendAreaChartProps {
  data: ReadonlyArray<TrendPoint>;
  xKey?: string;
  series: ReadonlyArray<TrendSeries>;
  height?: number;
  unit?: string;
  referenceLines?: ReadonlyArray<TrendReferenceLine>;
  /** Format x-axis ticks and the tooltip label (e.g. `formatMonth`). */
  formatX?: (x: string) => string;
  yAxisWidth?: number;
  className?: string;
  /** Accessible description of the chart. */
  ariaLabel?: string;
}

/** Gradient area trend for one or more series (monthly kWh, litres, kg). */
export function TrendAreaChart({
  data,
  xKey = "x",
  series,
  height = 260,
  unit,
  referenceLines = [],
  formatX,
  yAxisWidth = 44,
  className,
  ariaLabel,
}: TrendAreaChartProps) {
  const theme = useChartTheme();
  const reduced = useReducedMotion();
  const id = React.useId().replace(/:/g, "");
  const gradients = series.map((s) => gradientDefs(`trend-${id}-${s.key}`, s.color));
  const rows = data as TrendPoint[];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="img"
        aria-label={ariaLabel ?? `${series.map((s) => s.label).join(", ")} trend`}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
            <ChartDefs gradients={gradients} />
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={xKey}
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
                  unit={unit}
                  formatLabel={formatX ? (l) => formatX(String(l)) : undefined}
                />
              }
            />
            {referenceLines.map((r) => (
              <ReferenceLine
                key={`${r.label}-${r.y}`}
                y={r.y}
                stroke={r.color ?? theme.axis}
                strokeDasharray="4 4"
                label={{
                  value: r.label,
                  position: "insideTopRight",
                  fill: r.color ?? theme.axis,
                  fontSize: 11,
                  fontFamily: theme.fontFamily,
                }}
              />
            ))}
            {series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                fill={gradients[i].fill}
                fillOpacity={1}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface, fill: s.color }}
                isAnimationActive={!reduced}
                animationDuration={600}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {series.length > 1 ? (
        <ChartLegend
          items={series.map((s) => ({
            key: s.key,
            label: s.label,
            color: s.color,
            kind: s.dashed ? "dashed" : "area",
          }))}
        />
      ) : null}
    </div>
  );
}
