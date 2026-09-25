"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplet,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  Radio,
  Send,
  ShieldAlert,
  TrendingUp,
  Users,
  Waves,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { Button } from "@/components/ui/button";

export default function GovWaterPage() {
  const highDemandWards = [
    {
      ward: "Ward 24 (Zone 3 · South)",
      current: "3.2M L",
      baseline: "2.95M L",
      forecast: "3.5M L",
      change: "+8.3%",
      status: "Significantly Higher",
      tone: "danger" as const,
      households: 700,
    },
    {
      ward: "Ward 18 (Zone 1 · North)",
      current: "2.8M L",
      baseline: "2.71M L",
      forecast: "2.9M L",
      change: "+3.6%",
      status: "Higher than baseline",
      tone: "warning" as const,
      households: 650,
    },
    {
      ward: "Ward 11 (Zone 2 · Central)",
      current: "2.4M L",
      baseline: "2.40M L",
      forecast: "2.4M L",
      change: "+0.0%",
      status: "Normal",
      tone: "normal" as const,
      households: 620,
    },
    {
      ward: "Ward 07 (Zone 2 · Central)",
      current: "1.9M L",
      baseline: "1.88M L",
      forecast: "1.9M L",
      change: "+1.1%",
      status: "Normal",
      tone: "normal" as const,
      households: 540,
    },
    {
      ward: "Ward 03 (Zone 1 · North)",
      current: "1.5M L",
      baseline: "1.50M L",
      forecast: "1.5M L",
      change: "-0.2%",
      status: "Normal",
      tone: "normal" as const,
      households: 490,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="City Water Supply Board Command"
        subtitle="Bulk municipal water allocation, feeder manifold balancing, and ward distribution telemetry across Raichur."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-teal-ink">
              <MapPin className="h-3 w-3" />
              City of Raichur · Water Board
            </span>
            <StatusBadge status="normal" label="Pumping Stations Online" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/gov/heatmap">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-muted text-xs text-foreground hover:bg-secondary">
                <Layers className="h-3.5 w-3.5 text-teal-ink" />
                <span>GIS Heatmap</span>
              </Button>
            </Link>
            <Link href="/gov/cases">
              <Button size="sm" className="h-8 gap-1.5 bg-positive text-positive-foreground hover:bg-positive/90 text-xs font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Forwarded Cases (1 Action)</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Top 5 City-Scale KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Current Daily Demand"
          value="11.8M L"
          subtitle="All 24 municipal zones"
          badge={<StatusBadge status="normal" label="Delivered" />}
        />
        <KpiCard
          title="Historical Baseline"
          value="10.9M L"
          subtitle="Seasonal daily average"
          badge={<EstimatedChip confidence="High" />}
        />
        <KpiCard
          title="Forecast Demand"
          value="12.4M L"
          subtitle="Next 30-day projection"
          badge={<EstimatedChip confidence="Medium" />}
        />
        <KpiCard
          title="Participating Households"
          value="4,860"
          subtitle="86% telemetry coverage"
          badge={<StatusBadge status="normal" label="Connected" />}
        />
        <KpiCard
          title="Active Cases"
          value="5"
          subtitle="Community supply flags"
          badge={<StatusBadge status="warning" label="Active" />}
        />
      </div>

      {/* Middle Section: Supply Shortfall Planning Card & City Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supply Requirement & Shortfall Card (Verbatim spec text) */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-teal-ink" />
                <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider">
                  Bulk Supply Requirement & Capacity Balance
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                City storage reservoirs vs 30-day forecasted residential requirement
              </p>
            </div>
            <EstimatedChip confidence="Medium" />
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-inset border border-border/60 font-mono text-center">
            <div>
              <span className="text-2xs text-faint block">PLANNED CAPACITY</span>
              <span className="text-lg font-bold text-foreground">12.0M L/day</span>
            </div>
            <div>
              <span className="text-2xs text-faint block">FORECAST DEMAND</span>
              <span className="text-lg font-bold text-teal-ink">12.4M L/day</span>
            </div>
            <div>
              <span className="text-2xs text-faint block">ESTIMATED SHORTFALL</span>
              <span className="text-lg font-bold text-rose-ink">0.4M L/day</span>
            </div>
          </div>

          {/* Verbatim Planning Notice */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-ink/90 leading-relaxed font-sans">
            <span className="font-bold block mb-0.5 font-mono text-amber-ink">
              Department Planning Notice:
            </span>
            &quot;Estimated shortfall 0.4M L/day — planning information; operational decisions remain with the department.&quot;
          </div>

          <div className="text-xs text-soft space-y-1">
            <span className="font-semibold text-foreground">Suggested Municipal Operational Actions:</span>
            <p className="text-muted-foreground">
              Schedule review for Ward 24, tanker standby for XYZ/GHI Colony, and intermediate feeder pressure boosting.
            </p>
          </div>
        </div>

        {/* Board Alerts & Actions */}
        <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Radio className="h-4 w-4 text-rose-ink animate-pulse" />
              <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider">
                Department Bulletins
              </h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-ink">
                <span className="font-bold block mb-0.5">High Demand Warning:</span>
                Water demand higher than historical baseline in Ward 24 (+8.3%).
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-ink">
                <span className="font-bold block mb-0.5">Forecast Projection:</span>
                Forecasted water requirement increased across Zone 3 for the upcoming weekend.
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <Link href="/gov/alerts">
              <Button variant="outline" className="w-full border-border bg-muted text-xs text-foreground hover:bg-secondary h-9 gap-2">
                <Send className="h-3.5 w-3.5 text-teal-ink" />
                <span>Publish Water Advisory Notice</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Ward Comparison Table */}
      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider">
              Ward-Level Bulk Delivery & Stress Telemetry
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aggregated delivery volume, baseline divergence, and demand forecasting
            </p>
          </div>

          <Link href="/gov/heatmap" className="text-xs text-teal-ink hover:underline flex items-center gap-1 font-mono">
            <span>View on GIS Heatmap</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="divide-y divide-border">
          {highDemandWards.map((w, idx) => (
            <div
              key={idx}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/60 px-2 rounded-xl transition-all"
            >
              <div>
                <span className="font-bold text-foreground block text-sm font-mono">{w.ward}</span>
                <span className="text-faint text-xs">
                  {w.households} participating households · Baseline: {w.baseline}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono">
                <div>
                  <span className="text-2xs text-faint block">CURRENT</span>
                  <span className="text-foreground font-bold">{w.current}</span>
                </div>
                <div>
                  <span className="text-2xs text-faint block">FORECAST</span>
                  <span className="text-teal-ink font-bold">{w.forecast}</span>
                </div>
                <div>
                  <span className="text-2xs text-faint block">VARIANCE</span>
                  <span className={w.tone === "danger" ? "text-rose-ink font-bold" : w.tone === "warning" ? "text-amber-ink font-bold" : "text-positive"}>
                    {w.change}
                  </span>
                </div>
                <StatusBadge status={w.tone} label={w.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
