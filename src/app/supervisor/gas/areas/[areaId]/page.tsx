"use client";

import { use } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarRange, Flame, Gauge, Home, PackageSearch, Users } from "lucide-react";

import { aggStatusLabel, aggStatusTone, type MonthKey } from "@/types";
import { TrendAreaChart } from "@/components/charts/TrendAreaChart";
import { useChartTheme } from "@/components/charts/chartTheme";
import { useHasMounted } from "@/components/hooks/useHasMounted";
import { EmptyState } from "@/components/savera/EmptyState";
import { KpiCard } from "@/components/savera/KpiCard";
import { PageHeader } from "@/components/savera/PageHeader";
import { SectionCard } from "@/components/savera/SectionCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { LpgAlertCard, LPG_AREA_AI_NOTE } from "@/components/features/lpg/LpgAlertCard";
import { LpgSkeleton } from "@/components/features/lpg/LpgSkeleton";
import { useWardLpgIntel } from "@/lib/api/hooks/lpg";
import { useDataStore } from "@/stores/data";
import { formatIN, formatMonth, formatPct } from "@/lib/format";

export default function LpgAreaDetailsPage({ params }: { params: Promise<{ areaId: string }> }) {
  const { areaId } = use(params);
  const mounted = useHasMounted();
  const theme = useChartTheme();
  const area = useDataStore((s) => s.areas.find((a) => a.id === areaId));
  const ward = useWardLpgIntel(area?.wardId ?? "ward-24");

  if (!mounted) return <LpgSkeleton tiles={8} />;

  const row = ward.rows.find((r) => r.area.id === areaId);
  if (!area || !row) {
    return (
      <EmptyState
        icon={Flame}
        title="Area not found"
        description="This area has no LPG aggregate for the current month."
        action={{ label: "Back to LPG desk", href: "/supervisor/gas" }}
      />
    );
  }

  const tone = aggStatusTone(row.agg.status);
  const label = `${area.code ? `Area ${area.code} · ` : ""}${area.name}`;
  const inputs = [
    { label: "Active tracking homes", value: formatIN(row.agg.activeHouseholds) },
    { label: "Baseline", value: "Area historical average for the same month" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`LPG · ${ward.wardName}`}
        title={`${label} — LPG Consumption`}
        description="Area-level aggregates for the current month. Individual household data is never shown."
        breadcrumbs={[
          { label: "LPG desk", href: "/supervisor/gas" },
          { label: "Area details" },
        ]}
        chips={
          <>
            <StatusBadge
              tone={tone}
              label={`${aggStatusLabel(row.agg.status, "lpg")} (${formatPct(row.pctVsBaseline, 1, true)})`}
            />
            <span className="bg-secondary border-border text-soft rounded-full border px-3 py-1 font-mono text-xs">
              {formatMonth(ward.month)}
            </span>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="LPG households" value={formatIN(row.agg.totalHouseholds)} sub={`${formatIN(row.agg.activeHouseholds)} active`} icon={Home} tone="normal" />
        <KpiCard
          label="This month"
          value={`${formatIN(row.agg.totalConsumption)} kg`}
          sub={`Last month ${formatIN(row.lastMonthKg)} kg (${formatPct(row.trendPct, 1, true)})`}
          icon={Flame}
          tone={tone}
          estimated
          confidence="Medium"
          inputs={inputs}
        />
        <KpiCard
          label="Baseline"
          value={`${formatIN(row.agg.baseline)} kg`}
          sub={`Change ${formatPct(row.pctVsBaseline, 1, true)}`}
          icon={Gauge}
          tone="optimal"
          estimated
          confidence="Medium"
          inputs={inputs}
        />
        <KpiCard label="Abnormal households" value={formatIN(row.agg.aboveBaselineHouseholds)} sub="Count only" icon={AlertTriangle} tone="moderate" />
        <KpiCard
          label="Average per household"
          value={`${row.agg.avgPerHousehold.toFixed(1)} kg`}
          sub="per active home"
          icon={Users}
          tone="normal"
          estimated
          confidence="Medium"
          inputs={inputs}
        />
        <KpiCard label="Cylinders this month" value={formatIN(row.cylinders)} sub="14.2 kg incl. 5 % buffer" icon={PackageSearch} tone="normal" estimated confidence="Medium" inputs={inputs} />
        <KpiCard
          label="Predicted next month"
          value={`${formatIN(row.forecast.cylinders)} cyl.`}
          sub={`~${formatIN(row.forecast.kg)} kg in ${formatMonth(row.forecast.month)}`}
          icon={CalendarRange}
          tone="moderate"
          estimated
          confidence={row.forecast.confidence}
          inputs={[{ label: "Trend × seasonal factor", value: `× ${row.forecast.seasonal} (${row.forecast.seasonNote})` }]}
        />
        <KpiCard
          label="Trend"
          value={row.risingMonths > 0 ? "Increasing" : "Stable"}
          sub={row.risingMonths > 0 ? `${row.risingMonths} consecutive month${row.risingMonths === 1 ? "" : "s"} up` : "No sustained increase"}
          icon={CalendarRange}
          tone={row.risingMonths >= 3 ? "critical" : row.risingMonths > 0 ? "moderate" : "normal"}
        />
      </div>

      <SectionCard title="Six-month trend" description="Monthly kg against this month's historical baseline." icon={Flame}>
        <TrendAreaChart
          data={row.series.slice(-6).map((p) => ({ x: p.month, y: p.kg }))}
          series={[{ key: "y", label: "Consumption", color: theme.stream.lpg }]}
          unit="kg"
          height={280}
          formatX={(x) => formatMonth(x as MonthKey)}
          referenceLines={[{ y: row.agg.baseline, label: "Baseline", color: theme.secondary }]}
          ariaLabel={`${area.name} LPG consumption for the last six months`}
        />
      </SectionCard>

      {row.agg.status !== "normal" ? (
        <LpgAlertCard row={row} wardId={area.wardId} showLink={false} />
      ) : (
        <section className="glass rounded-2xl p-6">
          <p className="eyebrow">AI note</p>
          <p className="text-soft mt-2 text-sm leading-relaxed">
            Consumption in this area is within its historical baseline (≤ +5 %). No action is suggested. The
            supervisor can still review the trend above.
          </p>
          <p className="text-muted-foreground mt-3 text-xs">
            When an area rises above baseline the note reads: “{LPG_AREA_AI_NOTE}”
          </p>
        </section>
      )}

      <Link href="/supervisor/gas#heatmap" className="text-primary inline-flex text-sm font-semibold hover:underline">
        ← Back to the ward heatmap
      </Link>
    </div>
  );
}
