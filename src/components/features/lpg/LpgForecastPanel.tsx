"use client";

import * as React from "react";

import type { MonthKey } from "@/types";
import type { LpgDemandForecast } from "@/lib/engine/lpgDemand";
import { ForecastRangeChart } from "@/components/charts/ForecastRangeChart";
import { useChartTheme } from "@/components/charts/chartTheme";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { formatIN, formatMonth, formatPct } from "@/lib/format";

/** Demand forecast with range, cylinder requirement and basis (spec 03 §10.6 / §11). */
export function LpgForecastPanel({
  scopeLabel,
  series,
  forecast,
  historyMonths = 6,
  action,
}: {
  scopeLabel: string;
  series: { month: MonthKey; kg: number }[];
  forecast: LpgDemandForecast;
  historyMonths?: number;
  action?: React.ReactNode;
}) {
  const theme = useChartTheme();
  const history = series.slice(-historyMonths).map((p) => ({ x: p.month, y: p.kg }));
  const basis = series.slice(-forecast.basisMonths);
  const inputs = [
    { label: "Trend basis", value: basis.map((p) => `${formatMonth(p.month)} ${formatIN(p.kg)} kg`).join(" · ") },
    { label: "Seasonal factor", value: `${forecast.seasonal} (${forecast.seasonNote})` },
    { label: "Cylinder rule", value: "kg ÷ 14.2 × 1.05 (5 % buffer), rounded up" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={`${formatMonth(forecast.month)} demand`} value={`~${formatIN(forecast.kg)} kg`} hint={`${formatIN(forecast.low)}–${formatIN(forecast.high)} kg`} />
        <Tile label="Cylinder requirement" value={`≈ ${formatIN(forecast.cylinders)}`} hint="14.2 kg cylinders" />
        <Tile label="vs this month" value={formatPct(forecast.changePct, 1, true)} hint={scopeLabel} />
        <Tile label="Seasonal factor" value={`× ${forecast.seasonal}`} hint={forecast.seasonNote} />
      </div>
      <ForecastRangeChart
        history={history}
        forecast={{ x: forecast.month, low: forecast.low, point: forecast.kg, high: forecast.high }}
        unit="kg"
        color={theme.stream.lpg}
        formatX={(x) => formatMonth(x as MonthKey)}
        labels={{ history: "Consumption (kg)", forecast: "Forecast (est.)", range: "Forecast range" }}
        height={280}
        ariaLabel={`${scopeLabel} LPG consumption for the last ${history.length} months and next month's forecast`}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <EstimatedChip confidence={forecast.confidence} inputs={inputs} />
          <span className="text-muted-foreground text-xs">
            Based on {forecast.basisMonths} months of representative data · trend × seasonal factor
          </span>
        </div>
        {action}
      </div>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-muted border-border rounded-xl border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-display text-foreground mt-1 text-xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p> : null}
    </div>
  );
}
