"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LpgAnalysis } from "@/types";
import { ChartLegend } from "@/components/charts/ChartLegend";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { tickStyle, useChartTheme } from "@/components/charts/chartTheme";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { formatDayMonth } from "@/lib/format";

interface CyclePoint {
  name: string;
  rate: number;
  days: number;
  projectedDays?: number;
  current: boolean;
}

/** kg/day per cylinder cycle with the typical band (spec 03 §4). */
export function LpgCycleChart({
  analysis,
  maxCycles = 6,
  height = 260,
}: {
  analysis: LpgAnalysis;
  maxCycles?: number;
  height?: number;
}) {
  const theme = useChartTheme();
  const reduced = useReducedMotion();
  const color = theme.stream.lpg;

  const data: CyclePoint[] = [
    ...analysis.cycles.slice(-maxCycles).map((c) => ({
      name: `${formatDayMonth(c.startDate)}–${formatDayMonth(c.finishDate)}`,
      rate: c.kgPerDay,
      days: c.days,
      current: false,
    })),
    ...(analysis.current
      ? [
          {
            name: `${formatDayMonth(analysis.current.startDate)}–now`,
            rate: analysis.current.projectedKgPerDay,
            days: analysis.current.daysUsed,
            projectedDays: analysis.current.daysUsed + analysis.current.estimatedRemainingDays,
            current: true,
          },
        ]
      : []),
  ];

  const typical = analysis.typicalKgPerDay;
  const band = analysis.typicalRange;
  const maxRate = Math.max(...data.map((d) => d.rate), typical ?? 0) * 1.25;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={`LPG consumption per cylinder in kg per day. Typical ${typical?.toFixed(2) ?? "unknown"} kg per day.`}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={tickStyle(theme)}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
            />
            <YAxis
              width={48}
              tick={tickStyle(theme)}
              tickLine={false}
              axisLine={false}
              domain={[0, Number(maxRate.toFixed(2))]}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            {band ? (
              <ReferenceArea y1={band.low} y2={band.high} fill={theme.band} fillOpacity={1} ifOverflow="extendDomain" />
            ) : null}
            {typical ? (
              <ReferenceLine
                y={typical}
                stroke={theme.secondary}
                strokeDasharray="6 4"
                label={{ value: "Typical", position: "insideTopRight", fill: theme.mutedText, fontSize: 12 }}
              />
            ) : null}
            <Tooltip
              cursor={{ fill: theme.grid }}
              content={
                <ChartTooltip
                  rows={(payload) => {
                    const p = payload[0]?.payload as CyclePoint | undefined;
                    if (!p) return [];
                    return [
                      { key: "rate", label: p.current ? "Projected rate (est.)" : "Rate", value: `${p.rate.toFixed(2)} kg/day`, color },
                      {
                        key: "days",
                        label: p.current ? "Days so far" : "Cylinder lasted",
                        value: p.current && p.projectedDays ? `${p.days} d · projected ${p.projectedDays} d` : `${p.days} days`,
                      },
                    ];
                  }}
                />
              }
            />
            <Bar dataKey="rate" name="kg/day" radius={[6, 6, 0, 0]} isAnimationActive={!reduced} animationDuration={500}>
              {data.map((d) => (
                <Cell key={d.name} fill={color} fillOpacity={d.current ? 0.45 : 0.9} stroke={d.current ? color : undefined} strokeDasharray={d.current ? "4 3" : undefined} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { key: "finished", label: "Finished cylinder (from dates)", color, kind: "bar" },
          { key: "current", label: "Current cylinder (projected, est.)", color: `${color}73`, kind: "bar" },
          { key: "typical", label: "Typical rate", color: theme.secondary, kind: "dashed" },
          { key: "band", label: "Typical band", color: theme.band, kind: "band" },
        ]}
      />
    </div>
  );
}
