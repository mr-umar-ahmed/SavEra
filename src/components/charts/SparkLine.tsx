"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

import { ChartDefs } from "./ChartDefs";
import { gradientDefs, useChartTheme } from "./chartTheme";

export interface SparkLineProps {
  values: ReadonlyArray<number>;
  color?: string;
  height?: number;
  /** Fill under the line (default on). */
  fill?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** Tiny inline trend without axes (KPI tiles, table cells). */
export function SparkLine({
  values,
  color,
  height = 36,
  fill = true,
  className,
  ariaLabel,
}: SparkLineProps) {
  const theme = useChartTheme();
  const reduced = useReducedMotion();
  const stroke = color ?? theme.primary;
  const id = React.useId().replace(/:/g, "");
  const gradient = gradientDefs(`spark-${id}`, stroke, { from: 0.35 });
  const rows = values.map((v, i) => ({ i, v }));
  const first = values[0];
  const last = values[values.length - 1];

  return (
    <div
      role="img"
      aria-label={
        ariaLabel ??
        (values.length > 1
          ? `Trend from ${first} to ${last} over ${values.length} points`
          : "Trend")
      }
      className={cn("w-full", className)}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <ChartDefs gradients={[gradient]} />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={2}
            fill={fill ? gradient.fill : "transparent"}
            fillOpacity={1}
            dot={false}
            activeDot={false}
            isAnimationActive={!reduced}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
