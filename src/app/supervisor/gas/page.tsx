"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarRange,
  ClipboardList,
  Flame,
  Gauge,
  Home,
  LayoutDashboard,
  LineChart,
  Map as MapIcon,
  PackageSearch,
  Send,
  Table2,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { aggStatusLabel, aggStatusTone, type MonthKey } from "@/types";
import { TrendAreaChart } from "@/components/charts/TrendAreaChart";
import { useChartTheme } from "@/components/charts/chartTheme";
import { useHasMounted } from "@/components/hooks/useHasMounted";
import { AreaMap } from "@/components/maps";
import { AlertBanner } from "@/components/savera/AlertBanner";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { KpiCard } from "@/components/savera/KpiCard";
import { LabelChip } from "@/components/savera/LabelChip";
import { PageHeader } from "@/components/savera/PageHeader";
import { SectionCard } from "@/components/savera/SectionCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LpgAlertCard } from "@/components/features/lpg/LpgAlertCard";
import { LpgAreaTable } from "@/components/features/lpg/LpgAreaTable";
import { LpgForecastPanel } from "@/components/features/lpg/LpgForecastPanel";
import { LpgSkeleton } from "@/components/features/lpg/LpgSkeleton";
import { LpgTrendsPanel } from "@/components/features/lpg/LpgTrendsPanel";
import { SectionRail, type RailItem } from "@/components/features/lpg/SectionRail";
import { useNotifications } from "@/lib/api/hooks";
import { useCityLpgIntel, useWardLpgIntel } from "@/lib/api/hooks/lpg";
import { lpgApi } from "@/lib/api/lpg";
import { cylinderRequirement } from "@/lib/engine/aggregate";
import { useDataStore } from "@/stores/data";
import { useLpgOpsStore } from "@/stores/lpgOps";
import { useSessionStore } from "@/stores/session";
import { formatDateTime, formatIN, formatMonth, formatPct } from "@/lib/format";

const RAIL: RailItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "overview", label: "Ward / Area Overview", icon: Table2 },
  { id: "heatmap", label: "Consumption Heatmap", icon: MapIcon },
  { id: "details", label: "Area Details", icon: PackageSearch },
  { id: "alerts", label: "AI Alerts", icon: AlertTriangle },
  { id: "forecast", label: "Demand Forecast", icon: TrendingUp },
  { id: "planning", label: "Requirement Planning", icon: ClipboardList },
  { id: "reports", label: "Reports & Trends", icon: LineChart },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const LEGEND = [
  { tone: "normal" as const, label: "Normal" },
  { tone: "moderate" as const, label: "Increasing" },
  { tone: "critical" as const, label: "High increase" },
];

export default function SupervisorLpgPage() {
  const mounted = useHasMounted();
  const theme = useChartTheme();
  const user = useSessionStore((s) => s.user);
  const wardId = user?.wardId ?? "ward-24";
  const ward = useWardLpgIntel(wardId);
  const city = useCityLpgIntel();
  const officialAlerts = useDataStore((s) => s.officialAlerts);
  const opsAreas = useLpgOpsStore((s) => s.areas);
  const { notifications } = useNotifications();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sharing, setSharing] = React.useState(false);

  if (!mounted) return <LpgSkeleton tiles={8} />;

  const { totals, rows, forecast } = ward;
  const selected = rows.find((r) => r.area.id === (selectedId ?? ward.alerts[0]?.area.id)) ?? rows[0];
  const lpgAlert = officialAlerts.find((a) => a.stream === "lpg" && a.status !== "resolved" && a.wardIds.includes(wardId));
  const openAlerts = ward.alerts.filter((r) => (opsAreas[r.area.id]?.status ?? "open") !== "resolved");
  const resolvedAlerts = ward.alerts.filter((r) => opsAreas[r.area.id]?.status === "resolved");
  const lpgNotifications = notifications.filter((n) => n.stream === "lpg");
  const inputs = [
    { label: "Areas", value: `${rows.length} in ${ward.wardName}` },
    { label: "Active tracking homes", value: formatIN(totals.active) },
    { label: "Method", value: "Sum of anonymised area aggregates" },
  ];

  const share = async () => {
    setSharing(true);
    const res = await lpgApi.shareRequirement(ward.wardName, forecast.cylinders, forecast.kg);
    setSharing(false);
    if (res.ok) toast.success("Requirement shared with the LPG Distribution Cell");
    else toast.error(res.error);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`LPG · ${ward.wardName}`}
        title={`${ward.wardName} LPG Intelligence`}
        description="Aggregated cylinder consumption, AI-grouped alerts, demand forecast and requirement planning for your ward. Counts and totals only — no household data."
        chips={
          <>
            <StatusBadge tone={aggStatusTone(totals.status)} label={`Ward status: ${aggStatusLabel(totals.status, "lpg")}`} />
            <span className="bg-secondary border-border text-soft rounded-full border px-3 py-1 font-mono text-xs">
              {formatMonth(ward.month)}
            </span>
          </>
        }
        actions={
          <Button asChild variant="outline" className="gap-2">
            <Link href="#alerts">
              <AlertTriangle className="size-4" />
              {openAlerts.length} open alert{openAlerts.length === 1 ? "" : "s"}
            </Link>
          </Button>
        }
      />

      {lpgAlert ? <AlertBanner alert={lpgAlert} /> : null}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <SectionRail items={RAIL} />

        <div className="min-w-0 space-y-8">
          {/* 1 · Dashboard */}
          <section id="dashboard" className="scroll-mt-28 space-y-4" aria-labelledby="lpg-dash-title">
            <h2 id="lpg-dash-title" className="eyebrow">
              01 · Dashboard
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <KpiCard label="Assigned wards" value="1" sub={`${ward.wardName} · ${rows.length} areas`} icon={MapIcon} tone="optimal" />
              <KpiCard label="Total LPG households" value={formatIN(totals.registered)} sub="Registered LPG connections" icon={Home} tone="normal" />
              <KpiCard
                label="Active (tracking)"
                value={formatIN(totals.active)}
                sub={`${Math.round((totals.active / Math.max(1, totals.registered)) * 100)} % of LPG homes`}
                icon={Users}
                tone="normal"
              />
              <KpiCard
                label="Consumed this month"
                value={`${formatIN(totals.consumption)} kg`}
                sub={`Baseline ${formatIN(totals.baseline)} kg (${formatPct(totals.pctVsBaseline, 1, true)})`}
                icon={Flame}
                tone={aggStatusTone(totals.status)}
                estimated
                confidence="Medium"
                inputs={inputs}
              />
              <KpiCard
                label="Average per household"
                value={`${totals.avgPerHousehold.toFixed(1)} kg`}
                sub="per active home / month"
                icon={Gauge}
                tone="normal"
                estimated
                confidence="Medium"
                inputs={inputs}
              />
              <KpiCard
                label="Abnormal-consumption homes"
                value={formatIN(totals.abnormal)}
                sub="Count only — above their own baseline"
                icon={AlertTriangle}
                tone="moderate"
              />
              <KpiCard
                label="Current demand"
                value={`${formatIN(totals.cylinders)} cyl.`}
                sub="14.2 kg cylinders / month (incl. 5 % buffer)"
                icon={PackageSearch}
                tone="normal"
                estimated
                confidence="Medium"
                inputs={inputs}
              />
              <KpiCard
                label="Predicted next month"
                value={`${formatIN(forecast.cylinders)} cyl.`}
                sub={`~${formatIN(forecast.kg)} kg in ${formatMonth(forecast.month)}`}
                icon={CalendarRange}
                tone="moderate"
                estimated
                confidence={forecast.confidence}
                inputs={[{ label: "Trend × seasonal factor", value: `× ${forecast.seasonal} (${forecast.seasonNote})` }]}
              />
            </div>
          </section>

          {/* 2 · Overview */}
          <SectionCard
            id="overview"
            className="scroll-mt-28"
            title="02 · Ward / Area Overview"
            description={`${formatMonth(ward.month)} consumption against each area's historical baseline. 🟢 ≤ +5 % · 🟡 +5–15 % · 🔴 > +15 %.`}
            icon={Table2}
            flush
          >
            <LpgAreaTable
              rows={rows}
              hrefFor={(id) => `/supervisor/gas/areas/${id}`}
              selectedId={selected?.area.id}
              onSelect={setSelectedId}
            />
          </SectionCard>

          {/* 3 · Heatmap */}
          <SectionCard
            id="heatmap"
            className="scroll-mt-28"
            title="03 · Consumption Heatmap"
            description="Click an area to see its details. Colours pair with labels; statuses compare this month with each area's historical baseline."
            icon={MapIcon}
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <AreaMap
                features={rows.map((r) => ({
                  id: r.area.id,
                  name: `${r.area.code ? `Area ${r.area.code} · ` : ""}${r.area.name}`,
                  polygon: r.area.polygon,
                  tone: aggStatusTone(r.agg.status),
                  label: aggStatusLabel(r.agg.status, "lpg"),
                  value: `${formatIN(r.agg.totalConsumption)} kg (${formatPct(r.pctVsBaseline, 1, true)})`,
                }))}
                onSelect={setSelectedId}
                selectedId={selected?.area.id}
                legend={LEGEND}
                height={380}
                ariaLabel={`${ward.wardName} LPG consumption heatmap`}
              />
              <ul className="space-y-2" aria-label="Areas">
                {rows.map((r) => {
                  const tone = aggStatusTone(r.agg.status);
                  const isSel = selected?.area.id === r.area.id;
                  return (
                    <li key={r.area.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.area.id)}
                        aria-pressed={isSel}
                        className={`w-full rounded-xl border p-3 text-left transition-colors ${isSel ? "border-primary bg-muted" : "border-border bg-card hover:bg-muted"}`}
                      >
                        <span className="text-foreground block text-sm font-semibold">
                          {r.area.code ? `Area ${r.area.code} · ` : ""}
                          {r.area.name}
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-2">
                          <StatusBadge tone={tone} label={aggStatusLabel(r.agg.status, "lpg")} size="sm" />
                          <span className="text-soft font-mono text-xs">{formatPct(r.pctVsBaseline, 1, true)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </SectionCard>

          {/* 4 · Area details */}
          {selected ? (
            <SectionCard
              id="details"
              className="scroll-mt-28"
              title={`04 · Area Consumption Details — ${selected.area.code ? `Area ${selected.area.code} · ` : ""}${selected.area.name}`}
              description="Selected on the heatmap. Six-month trend against this month's baseline."
              icon={PackageSearch}
              actions={
                <Button asChild size="sm" className="gap-2">
                  <Link href={`/supervisor/gas/areas/${selected.area.id}`}>
                    Investigate
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              }
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
                <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  <Mini label="This month" value={`${formatIN(selected.agg.totalConsumption)} kg`} />
                  <Mini label="Last month" value={`${formatIN(selected.lastMonthKg)} kg`} />
                  <Mini label="Baseline" value={`${formatIN(selected.agg.baseline)} kg`} />
                  <Mini label="vs baseline" value={formatPct(selected.pctVsBaseline, 1, true)} />
                </dl>
                <TrendAreaChart
                  data={selected.series.slice(-6).map((p) => ({ x: p.month, y: p.kg }))}
                  series={[{ key: "y", label: "Consumption", color: theme.stream.lpg }]}
                  unit="kg"
                  height={240}
                  formatX={(x) => formatMonth(x as MonthKey)}
                  referenceLines={[{ y: selected.agg.baseline, label: "Baseline", color: theme.secondary }]}
                  ariaLabel={`${selected.area.name} LPG consumption, last six months`}
                />
              </div>
            </SectionCard>
          ) : null}

          {/* 5 · AI Alerts */}
          <section id="alerts" className="scroll-mt-28 space-y-4" aria-labelledby="lpg-alerts-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="lpg-alerts-title" className="eyebrow">
                05 · AI Alerts
              </h2>
              <span className="text-muted-foreground text-sm">
                AI groups areas above baseline; the supervisor decides the next step.
              </span>
            </div>
            {openAlerts.length === 0 ? (
              <p className="glass text-soft rounded-2xl p-6 text-sm">No open LPG alerts in {ward.wardName}.</p>
            ) : (
              openAlerts.map((r) => <LpgAlertCard key={r.area.id} row={r} wardId={wardId} />)
            )}
            {resolvedAlerts.length > 0 ? (
              <details className="glass rounded-2xl p-5">
                <summary className="text-foreground cursor-pointer text-sm font-semibold">
                  Resolved alerts ({resolvedAlerts.length})
                </summary>
                <div className="mt-4 space-y-4">
                  {resolvedAlerts.map((r) => (
                    <LpgAlertCard key={r.area.id} row={r} wardId={wardId} />
                  ))}
                </div>
              </details>
            ) : null}
          </section>

          {/* 6 · Forecast */}
          <SectionCard
            id="forecast"
            className="scroll-mt-28"
            title="06 · Demand Forecast"
            description={`Next-month LPG demand for ${ward.wardName}: linear trend of the last months × seasonal factor.`}
            icon={TrendingUp}
          >
            <LpgForecastPanel
              scopeLabel={ward.wardName}
              series={ward.series}
              forecast={forecast}
              action={
                <Button size="sm" onClick={share} disabled={sharing} className="gap-2">
                  <Send className="size-4" />
                  {sharing ? "Sharing…" : "Share with LPG Distribution Cell"}
                </Button>
              }
            />
          </SectionCard>

          {/* 7 · Planning */}
          <SectionCard
            id="planning"
            className="scroll-mt-28"
            title="07 · LPG Requirement Planning"
            description="Area → Ward → City roll-up in 14.2 kg cylinders. Recommended stock = predicted requirement (includes the 5 % buffer)."
            icon={ClipboardList}
            actions={<EstimatedChip confidence="Medium" inputs={[{ label: "Cylinder rule", value: "kg ÷ 14.2 × 1.05, rounded up" }]} size="sm" />}
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Level</TableHead>
                  <TableHead className="text-right">This month</TableHead>
                  <TableHead className="text-right">Current cylinders</TableHead>
                  <TableHead className="text-right">Predicted</TableHead>
                  <TableHead className="text-right">Predicted cylinders</TableHead>
                  <TableHead className="pr-6 text-right">Recommended stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <PlanRow
                    key={r.area.id}
                    label={`${r.area.code ? `Area ${r.area.code} · ` : ""}${r.area.name}`}
                    kg={r.agg.totalConsumption}
                    forecastKg={r.forecast.kg}
                    forecastCyl={r.forecast.cylinders}
                  />
                ))}
                <PlanRow label={ward.wardName} kg={totals.consumption} forecastKg={forecast.kg} forecastCyl={forecast.cylinders} strong />
                <PlanRow label="City of Raichur" kg={city.totals.consumption} forecastKg={city.forecast.kg} forecastCyl={city.forecast.cylinders} strong />
              </TableBody>
            </Table>
            <p className="text-muted-foreground border-border border-t px-6 py-4 text-sm">
              Planning information — operational decisions remain with the LPG Distribution Cell.
            </p>
          </SectionCard>

          {/* 8 · Reports */}
          <SectionCard
            id="reports"
            className="scroll-mt-28"
            title="08 · Reports & Trends"
            description="Monthly consumption, area comparison and above-baseline counts. Export for offline review."
            icon={LineChart}
          >
            <LpgTrendsPanel
              entities={rows.map((r) => ({
                id: r.area.id,
                label: r.area.code ? `Area ${r.area.code}` : r.area.name,
                series: r.series,
                baseline: r.agg.baseline,
              }))}
              scopeLabel={ward.wardName}
              csvName={`savera-${wardId}-lpg-report.csv`}
            />
          </SectionCard>

          {/* 9 · Notifications */}
          <SectionCard
            id="notifications"
            className="scroll-mt-28"
            title="09 · Notifications"
            description="LPG updates for your ward."
            icon={Bell}
            actions={
              <Button asChild variant="outline" size="sm">
                <Link href="/supervisor/notifications">All notifications</Link>
              </Button>
            }
          >
            {lpgNotifications.length === 0 ? (
              <p className="text-soft text-sm">No LPG notifications yet.</p>
            ) : (
              <ul className="divide-border divide-y">
                {lpgNotifications.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-foreground flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {n.title}
                        {n.official ? <LabelChip kind="official" size="sm" /> : null}
                      </p>
                      <p className="text-soft mt-0.5 text-sm">{n.body}</p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">{formatDateTime(n.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted border-border rounded-xl border p-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-display text-foreground text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function PlanRow({
  label,
  kg,
  forecastKg,
  forecastCyl,
  strong,
}: {
  label: string;
  kg: number;
  forecastKg: number;
  forecastCyl: number;
  strong?: boolean;
}) {
  return (
    <TableRow className={strong ? "bg-muted/60" : undefined}>
      <TableCell className={`pl-6 ${strong ? "text-foreground font-bold" : "text-foreground font-semibold"}`}>{label}</TableCell>
      <TableCell className="text-right tabular-nums">{formatIN(kg)} kg</TableCell>
      <TableCell className="text-right tabular-nums">{formatIN(cylinderRequirement(kg))}</TableCell>
      <TableCell className="text-right tabular-nums">{formatIN(forecastKg)} kg</TableCell>
      <TableCell className="text-right tabular-nums">{formatIN(forecastCyl)}</TableCell>
      <TableCell className="text-foreground pr-6 text-right font-bold tabular-nums">{formatIN(forecastCyl)}</TableCell>
    </TableRow>
  );
}
