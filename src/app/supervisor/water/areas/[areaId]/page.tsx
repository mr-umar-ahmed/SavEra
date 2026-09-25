"use client";

import { use } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Droplet,
  History,
  Info,
  MapPin,
  TrendingUp,
  Users,
  Waves,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";
import { AI_ASSESSMENT } from "@/lib/engine/water";

export default function AreaWaterReportPage({
  params,
}: {
  params: Promise<{ areaId: string }>;
}) {
  const { areaId } = use(params);
  const areas = useDataStore((s) => s.areas);
  const waterCases = useDataStore((s) => s.waterCases);
  const waterSchedules = useDataStore((s) => s.waterSchedules);

  // Match area by ID or slug
  const cleanId = areaId.startsWith("area-") ? areaId : `area-${areaId}`;
  const currentArea = areas.find((a) => a.id === cleanId || a.id === areaId) ?? {
    id: "area-xyz",
    name: "XYZ Colony",
    wardId: "ward-24",
    zoneId: "zone-3",
    householdCount: 340,
    participatingCount: 260,
  };

  const schedule = waterSchedules.find((s) => s.areaId === currentArea.id) ?? {
    id: "sched-xyz",
    areaId: currentArea.id,
    start: "07:00",
    end: "08:00",
    frequency: "daily" as const,
    plannedLitres: 450000,
  };

  const currentCase = waterCases.find((c) => c.areaId === currentArea.id) ?? waterCases[0];

  // Spec numbers: 78 reports, Insufficient 61, Low pressure 11, Short duration 6
  const totalReports = 78;
  const insufficientCount = 61;
  const lowPressureCount = 11;
  const shortDurationCount = 6;
  const householdsInArea = currentArea.householdCount || 340;
  const reportingShare = Math.round((totalReports / householdsInArea) * 100);

  // 14-day history baseline data for the chart: average 9/day, today spikes to 78
  const historyData = [
    { day: "D-13", count: 8 },
    { day: "D-12", count: 10 },
    { day: "D-11", count: 7 },
    { day: "D-10", count: 9 },
    { day: "D-09", count: 11 },
    { day: "D-08", count: 8 },
    { day: "D-07", count: 12 },
    { day: "D-06", count: 9 },
    { day: "D-05", count: 10 },
    { day: "D-04", count: 8 },
    { day: "D-03", count: 11 },
    { day: "D-02", count: 9 },
    { day: "Yesterday", count: 10 },
    { day: "Today", count: 78, isAnomaly: true },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <PageHeader
        title={`${currentArea.name} Area Water Report`}
        subtitle="Detailed telemetry breakdown, citizen feedback split, and feeder manifold analysis."
        breadcrumbs={[
          { label: "Water Operations", href: "/supervisor/water" },
          { label: currentArea.name },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-teal-ink">
              <MapPin className="h-3 w-3" />
              Ward 24 · Zone 3
            </span>
            <StatusBadge status="danger" label="Supply-Demand Gap Flagged" />
          </div>
        }
        actions={
          <Link href="/supervisor/water">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-muted text-xs text-foreground hover:bg-secondary">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Water Desk</span>
            </Button>
          </Link>
        }
      />

      {/* Grid: 4 Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card backdrop-blur-xl">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Planned Window</span>
            <Clock className="h-3.5 w-3.5 text-teal-ink" />
          </div>
          <div className="text-xl font-bold font-display text-foreground">
            {schedule.start} – {schedule.end}
          </div>
          <div className="text-xs text-faint mt-1">Daily scheduled distribution</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card backdrop-blur-xl">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Planned Capacity</span>
            <Waves className="h-3.5 w-3.5 text-teal-ink" />
          </div>
          <div className="text-xl font-bold font-display text-foreground">
            {schedule.plannedLitres.toLocaleString("en-IN")} L
          </div>
          <div className="text-xs text-faint mt-1">Allocated for {currentArea.name}</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card backdrop-blur-xl">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>Citizen Reports Today</span>
            <Users className="h-3.5 w-3.5 text-rose-ink" />
          </div>
          <div className="text-xl font-bold font-display text-rose-ink">
            {totalReports} reports
          </div>
          <div className="text-xs text-faint mt-1">
            {reportingShare}% of {householdsInArea} households
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card backdrop-blur-xl">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
            <span>30-Day Baseline</span>
            <TrendingUp className="h-3.5 w-3.5 text-amber-ink" />
          </div>
          <div className="text-xl font-bold font-display text-foreground">
            9 <span className="text-xs font-normal text-faint">reports/day</span>
          </div>
          <div className="text-xs text-amber-ink/90 font-medium mt-1">
            Today: 8.6x above average
          </div>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Feedback Split & Historical Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Citizen Feedback Split */}
          <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
                  Citizen Experience Feedback Split
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Breakdown across {totalReports} verified citizen logs for today&apos;s morning supply window
                </p>
              </div>
              <span className="text-xs font-mono text-faint">Total: {totalReports}</span>
            </div>

            {/* Visual Breakdown Bar */}
            <div className="space-y-2">
              <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex p-0.5 gap-0.5">
                <div
                  className="bg-tone-moderate rounded-l-full h-full transition-all"
                  style={{ width: `${(insufficientCount / totalReports) * 100}%` }}
                  title={`Insufficient: ${insufficientCount}`}
                />
                <div
                  className="bg-stream-water h-full transition-all"
                  style={{ width: `${(lowPressureCount / totalReports) * 100}%` }}
                  title={`Low Pressure: ${lowPressureCount}`}
                />
                <div
                  className="bg-tone-critical rounded-r-full h-full transition-all"
                  style={{ width: `${(shortDurationCount / totalReports) * 100}%` }}
                  title={`Short Duration: ${shortDurationCount}`}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-tone-moderate" />
                  Insufficient (61) · 78%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-stream-water" />
                  Low Pressure (11) · 14%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-tone-critical" />
                  Short Duration (6) · 8%
                </span>
              </div>
            </div>

            {/* Detailed Cards for Each Category */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="text-2xl font-bold font-display text-amber-ink block">
                  {insufficientCount}
                </span>
                <span className="text-xs font-semibold text-soft block mt-0.5">Insufficient Water</span>
                <span className="text-2xs text-faint block mt-0.5">Below expected volume</span>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center">
                <span className="text-2xl font-bold font-display text-teal-ink block">
                  {lowPressureCount}
                </span>
                <span className="text-xs font-semibold text-soft block mt-0.5">Low Pressure</span>
                <span className="text-2xs text-faint block mt-0.5">Tap flow inadequate</span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                <span className="text-2xl font-bold font-display text-rose-ink block">
                  {shortDurationCount}
                </span>
                <span className="text-xs font-semibold text-soft block mt-0.5">Short Duration</span>
                <span className="text-2xs text-faint block mt-0.5">Supply cut off early</span>
              </div>
            </div>
          </div>

          {/* Historical Comparison Chart (30-day baseline vs today) */}
          <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
                  Historical Comparison (Last 14 Days Telemetry)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Normal daily baseline: ~9 reports/day. Today shows a severe anomalous spike to 78 reports.
                </p>
              </div>
              <EstimatedChip confidence="Medium" />
            </div>

            {/* CSS / SVG Bar Chart */}
            <div className="pt-4">
              <div className="h-44 w-full flex items-end justify-between gap-1.5 px-2 pb-2 border-b border-border">
                {historyData.map((d, idx) => {
                  const maxVal = 80;
                  const heightPct = Math.max(8, (d.count / maxVal) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-overlay text-foreground text-2xs font-mono px-1.5 py-0.5 rounded border border-border-strong pointer-events-none whitespace-nowrap z-10">
                        {d.day}: {d.count} reports
                      </div>

                      <div
                        className={`w-full rounded-t transition-all ${
                          d.isAnomaly
                            ? "bg-gradient-to-t from-rose-500 to-amber-400 shadow-lg shadow-rose-500/10"
                            : "bg-secondary hover:bg-secondary"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      <span
                        className={`text-2xs font-mono truncate max-w-full ${
                          d.isAnomaly ? "text-amber-ink font-bold" : "text-faint"
                        }`}
                      >
                        {d.day === "Today" ? "Today" : d.day === "Yesterday" ? "Yday" : d.day.slice(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-faint pt-2 font-mono">
                <span>30-Day Baseline Avg: 9 reports/day</span>
                <span className="text-rose-ink font-semibold">Today: 78 reports (+766% anomaly)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Assessment & Linked Case CTA */}
        <div className="space-y-6">
          {/* Verbatim AI Assessment */}
          <div className="p-6 rounded-2xl border border-teal-500/30 bg-teal-500/[0.04] backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-teal-ink flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                AI Diagnostic Telemetry
              </span>
              <span className="text-2xs font-mono bg-teal-500/20 text-teal-ink px-2 py-0.5 rounded-full border border-teal-500/30">
                Automated Detection
              </span>
            </div>

            <p className="text-xs text-soft leading-relaxed font-sans">
              {AI_ASSESSMENT}
            </p>

            <div className="p-3 rounded-xl bg-inset border border-border/60 text-xs text-muted-foreground space-y-1.5">
              <div className="flex justify-between">
                <span>Localization:</span>
                <span className="text-foreground font-medium">Sector 2 – 4 Feeder Junction</span>
              </div>
              <div className="flex justify-between">
                <span>Anomaly Threshold:</span>
                <span className="text-rose-ink font-mono font-medium">Exceeded (23% vs 5%)</span>
              </div>
              <div className="flex justify-between">
                <span>Action Recommended:</span>
                <span className="text-amber-ink font-medium">Field Verification Required</span>
              </div>
            </div>
          </div>

          {/* Active Case Workspace Card */}
          <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-faint uppercase tracking-wider font-mono">
                  Linked Incident Case
                </span>
                <StatusBadge
                  status={currentCase.severity === "high" ? "danger" : "warning"}
                  label={currentCase.state.toUpperCase().replace("_", " ")}
                />
              </div>

              <h4 className="text-base font-bold text-foreground font-mono">{currentCase.id.toUpperCase()}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Grouped 78 reports during the morning distribution cycle. Supervisor verification decision required.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-muted/60 border border-border/60 text-xs space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Assigned Stage:</span>
                  <span className="text-foreground font-medium capitalize">{currentCase.state.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Priority:</span>
                  <span className="text-rose-ink font-medium">High</span>
                </div>
              </div>
            </div>

            <Link href={`/supervisor/water/cases/${currentCase.id}`}>
              <Button className="w-full bg-positive text-positive-foreground hover:bg-positive/90 font-semibold text-xs h-10 gap-2 shadow-lg shadow-positive/10">
                <span>Go to Verification Decision</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
