"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
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

export interface ForecastHistoryPoint {
  x: string;
  y: number;
}

export interface ForecastPoint {
  x: string;
  low: number;
  point: number;
  high: number;
}

export interface ForecastRangeChartProps {
  history: ReadonlyArray<ForecastHistoryPoint>;
  forecast: ForecastPoint;
  unit?: string;
  height?: number;
  color?: string;
  labels?: { history?: string; forecast?: string; range?: string };
  formatX?: (x: string) => string;
  yAxisWidth?: number;
  className?: string;
  ariaLabel?: string;
}

interface ForecastRow {
  x: string;
  y?: number;
  point?: number;
  low?: number;
  band?: number;
  high?: number;
  isForecast: boolean;
}

/**
 * Measured history as a solid line, then a dashed projection to the forecast
 * point with a low–high band. The forecast is an estimate: label the card with
 * `<EstimatedChip>`.
 */
export function ForecastRangeChart({
  history,
  forecast,
  unit,
  height = 260,
  color,
  labels,
  formatX,
  yAxisWidth = 44,
  className,
  ariaLabel,
}: ForecastRangeChartProps) {
  const theme = useChartTheme();
  const reduced = useReducedMotion();
  const line = color ?? theme.primary;
  const historyLabel = labels?.history ?? "Actual";
  const forecastLabel = labels?.forecast ?? "Forecast";
  const rangeLabel = labels?.range ?? "Forecast range";

  const rows: ForecastRow[] = history.map((h, i) => {
    const last = i === history.length - 1;
    return {
      x: h.x,
      y: h.y,
      // Seed the dashed projection and the band at the last measured point so they connect.
      point: last ? h.y : undefined,
      low: last ? h.y : undefined,
      band: last ? 0 : undefined,
      high: last ? h.y : undefined,
      isForecast: false,
    };
  });
  rows.push({
    x: forecast.x,
    point: forecast.point,
    low: forecast.low,
    band: Math.max(forecast.high - forecast.low, 0),
    high: forecast.high,
    isForecast: true,
  });

  const tooltipRows = (payload: ReadonlyArray<{ payload?: unknown }>): ChartTooltipRow[] => {
    const row = payload[0]?.payload as ForecastRow | undefined;
    if (!row) return [];
    if (row.isForecast) {
      return [
        {
          key: "point",
          label: forecastLabel,
          value: formatTooltipNumber(row.point ?? 0, unit),
          color: line,
        },
        {
          key: "range",
          label: rangeLabel,
          value: `${formatTooltipNumber(row.low ?? 0)} – ${formatTooltipNumber(row.high ?? 0, unit)}`,
          color: theme.band,
        },
      ];
    }
    return [
      {
        key: "y",
        label: historyLabel,
        value: formatTooltipNumber(row.y ?? 0, unit),
        color: line,
      },
    ];
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="img"
        aria-label={
          ariaLabel ??
          `${historyLabel} history and ${forecastLabel.toLowerCase()} for ${forecast.x}: ${formatTooltipNumber(forecast.point, unit)} (range ${formatTooltipNumber(forecast.low)} to ${formatTooltipNumber(forecast.high, unit)})`
        }
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
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
            {history.length > 0 ? (
              <ReferenceLine
                x={history[history.length - 1].x}
                stroke={theme.axis}
                strokeDasharray="2 4"
                label={{
                  value: "Today",
                  position: "insideTopLeft",
                  fill: theme.axis,
                  fontSize: 11,
                  fontFamily: theme.fontFamily,
                }}
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="low"
              stackId="range"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
              dot={false}
              activeDot={false}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="band"
              name={rangeLabel}
              stackId="range"
              stroke="none"
              fill={theme.band}
              fillOpacity={1}
              isAnimationActive={!reduced}
              animationDuration={600}
              dot={false}
              activeDot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="y"
              name={historyLabel}
              stroke={line}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2, stroke: theme.surface, fill: line }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: theme.surface, fill: line }}
              isAnimationActive={!reduced}
              animationDuration={600}
            />
            <Line
              type="monotone"
              dataKey="point"
              name={forecastLabel}
              stroke={line}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 4, strokeWidth: 2, stroke: line, fill: theme.surface }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: theme.surface, fill: line }}
              isAnimationActive={!reduced}
              animationDuration={600}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { key: "history", label: historyLabel, color: line, kind: "line" },
          { key: "forecast", label: forecastLabel, color: line, kind: "dashed" },
          { key: "range", label: rangeLabel, color: theme.primary, kind: "band" },
        ]}
      />
    </div>
  );
}
