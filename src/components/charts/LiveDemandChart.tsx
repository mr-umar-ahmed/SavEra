"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { formatIN } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ChartDefs } from "./ChartDefs";
import { ChartTooltip } from "./ChartTooltip";
import { gradientDefs, tickStyle, useChartTheme } from "./chartTheme";

export interface DemandPoint {
  /** Time label, e.g. `14:05`. */
  t: string;
  mw: number;
}

export interface LiveDemandChartProps {
  series: ReadonlyArray<DemandPoint>;
  height?: number;
  color?: string;
  /** Series name shown in the tooltip. */
  label?: string;
  unit?: string;
  yAxisWidth?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Animated area for a rolling grid-demand feed (simulated). The y domain
 * hugs the data so small movements stay visible; no point markers.
 */
export function LiveDemandChart({
  series,
  height = 220,
  color,
  label = "Demand",
  unit = "MW",
  yAxisWidth = 44,
  className,
  ariaLabel,
}: LiveDemandChartProps) {
  const theme = useChartTheme();
  const reduced = useReducedMotion();
  const stroke = color ?? theme.stream.electricity;
  const id = React.useId().replace(/:/g, "");
  const gradient = gradientDefs(`live-${id}`, stroke, { from: 0.4 });
  const rows = series as DemandPoint[];
  const last = rows.length > 0 ? rows[rows.length - 1] : null;

  return (
    <div
      role="img"
      aria-label={
        ariaLabel ?? `${label}, latest ${last ? `${formatIN(last.mw)} ${unit}` : "unavailable"}`
      }
      className={cn("w-full", className)}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <ChartDefs gradients={[gradient]} />
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tick={tickStyle(theme)}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            width={yAxisWidth}
            tick={tickStyle(theme)}
            tickLine={false}
            axisLine={false}
            domain={[
              (min: number) => Math.floor(min * 0.97),
              (max: number) => Math.ceil(max * 1.03),
            ]}
            tickFormatter={(v: number) => formatIN(v)}
          />
          <Tooltip
            cursor={{ stroke: theme.cursor, strokeDasharray: "3 3" }}
            content={<ChartTooltip unit={unit} decimals={0} />}
          />
          <Area
            type="monotone"
            dataKey="mw"
            name={label}
            stroke={stroke}
            strokeWidth={2}
            fill={gradient.fill}
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface, fill: stroke }}
            isAnimationActive={!reduced}
            animationDuration={500}
            animationEasing="ease-out"
          />
          {last ? (
            <ReferenceDot
              x={last.t}
              y={last.mw}
              r={4}
              fill={stroke}
              stroke={theme.surface}
              strokeWidth={2}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
