"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import type { MonthKey } from "@/types";
import { CompareBarChart } from "@/components/charts/CompareBarChart";
import { TrendAreaChart } from "@/components/charts/TrendAreaChart";
import { useChartTheme } from "@/components/charts/chartTheme";
import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface LpgTrendEntity {
  id: string;
  label: string;
  series: { month: MonthKey; kg: number }[];
  /** Historical baseline for the current month (kg). */
  baseline: number;
}

const PERIODS = [3, 6, 12] as const;

/** Reports & Trends (spec 03 §10.8): period picker, monthly trend, comparison, CSV export. */
export function LpgTrendsPanel({
  entities,
  scopeLabel,
  csvName,
}: {
  entities: LpgTrendEntity[];
  scopeLabel: string;
  csvName: string;
}) {
  const theme = useChartTheme();
  const [period, setPeriod] = React.useState<(typeof PERIODS)[number]>(6);
  const months = entities[0]?.series.slice(-period).map((p) => p.month) ?? [];
  const totalBaseline = entities.reduce((s, e) => s + e.baseline, 0);

  const trend = months.map((m) => ({
    x: m,
    y: entities.reduce((s, e) => s + (e.series.find((p) => p.month === m)?.kg ?? 0), 0),
  }));
  const compare = entities.map((e) => ({
    name: e.label,
    prev: e.series.at(-2)?.kg ?? 0,
    curr: e.series.at(-1)?.kg ?? 0,
  }));
  const aboveBaseline = months.map((m) => ({
    month: m,
    count: entities.filter((e) => (e.series.find((p) => p.month === m)?.kg ?? 0) > e.baseline * 1.05).length,
  }));
  const lastMonth = months.at(-2);
  const thisMonth = months.at(-1);

  const exportCsv = () => {
    const csv = toCsv(entities, [
      { header: "Area", value: (e) => e.label },
      ...months.map((m) => ({ header: `${formatMonth(m)} (kg)`, value: (e: LpgTrendEntity) => e.series.find((p) => p.month === m)?.kg })),
      { header: "Baseline this month (kg)", value: (e) => e.baseline },
    ]);
    downloadCsv(csvName, csv);
    toast.success(`Exported ${entities.length} rows × ${months.length} months`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Report period">
          <span className="text-muted-foreground mr-1 text-sm">Period</span>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => setPeriod(p)}
              className={cn(
                "h-9 rounded-full border px-4 text-sm font-semibold transition-colors",
                period === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border-strong bg-card text-soft hover:bg-muted",
              )}
            >
              {p} months
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <p className="text-foreground mb-2 text-sm font-semibold">Monthly consumption — {scopeLabel}</p>
          <TrendAreaChart
            data={trend}
            series={[{ key: "y", label: "Consumption", color: theme.stream.lpg }]}
            unit="kg"
            height={240}
            formatX={(x) => formatMonth(x as MonthKey)}
            referenceLines={[{ y: totalBaseline, label: "This month's baseline", color: theme.secondary }]}
            ariaLabel={`Monthly LPG consumption for ${scopeLabel}`}
          />
        </div>
        <div>
          <p className="text-foreground mb-2 text-sm font-semibold">This month vs last month</p>
          <CompareBarChart
            data={compare}
            labels={{
              prev: lastMonth ? formatMonth(lastMonth) : "Last month",
              curr: thisMonth ? formatMonth(thisMonth) : "This month",
            }}
            unit="kg"
            color={theme.stream.lpg}
            height={240}
            layout={compare.length > 5 ? "horizontal" : "vertical"}
            ariaLabel="LPG consumption by area, this month versus last month"
          />
        </div>
      </div>

      <div>
        <p className="text-foreground mb-3 text-sm font-semibold">
          Areas more than 5 % above this month&apos;s baseline, by month
        </p>
        <ol className="flex flex-wrap gap-2">
          {aboveBaseline.map((a) => (
            <li
              key={a.month}
              className="bg-muted border-border flex min-w-24 flex-col items-center rounded-xl border px-3 py-2"
            >
              <span className="text-muted-foreground font-mono text-2xs uppercase">{formatMonth(a.month)}</span>
              <span className="font-display text-foreground text-lg font-bold">
                {a.count}
                <span className="text-muted-foreground text-xs font-medium"> / {entities.length}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
