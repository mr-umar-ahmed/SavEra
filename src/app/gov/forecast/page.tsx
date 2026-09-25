"use client";

import { Droplet, Flame, Info, Sparkles, TrendingUp, Zap } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";

export default function GovForecastPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="City-Wide AI Demand Forecasting"
        subtitle="Predictive resource models across Electricity, Water, and LPG for municipal forward-planning."
        badge={
          <div className="flex items-center gap-2">
            <EstimatedChip confidence="High" inputs={["6 Months Historical Telemetry", "Seasonal Weather Models", "Occupancy Sensors"]} />
            <StatusBadge status="simulation" label="Simulation Model" />
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Stream 1: Electricity */}
        <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2 text-amber-ink font-bold text-xs uppercase tracking-wider">
            <Zap className="h-4 w-4" />
            <span>Electricity Demand (Next Month)</span>
          </div>

          <div className="text-3xl font-extrabold font-display text-foreground">880 – 910 MW</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Projected peak demand during anticipated October heatwave transition. Recommending pre-dispatch of 25 MW automated DR.
          </p>

          <div className="pt-3 border-t border-border/60 flex justify-between text-xs font-mono">
            <span className="text-faint">Confidence:</span>
            <span className="text-positive font-bold">92% (High)</span>
          </div>
        </div>

        {/* Stream 2: Water */}
        <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2 text-teal-ink font-bold text-xs uppercase tracking-wider">
            <Droplet className="h-4 w-4" />
            <span>Water Supply (Next Month)</span>
          </div>

          <div className="text-3xl font-extrabold font-display text-foreground">12.4M L / day</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Daily municipal requirement across 24 wards. Buffer of 600,000 L recommended for Central West wards.
          </p>

          <div className="pt-3 border-t border-border/60 flex justify-between text-xs font-mono">
            <span className="text-faint">Confidence:</span>
            <span className="text-positive font-bold">88% (High)</span>
          </div>
        </div>

        {/* Stream 3: LPG */}
        <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2 text-rose-ink font-bold text-xs uppercase tracking-wider">
            <Flame className="h-4 w-4" />
            <span>LPG Requirement (Next Month)</span>
          </div>

          <div className="text-3xl font-extrabold font-display text-foreground">60,000 kg</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Equates to 4,437 standard 14.2 kg domestic cylinders. Distributor allocations set to +7% seasonal uplift.
          </p>

          <div className="pt-3 border-t border-border/60 flex justify-between text-xs font-mono">
            <span className="text-faint">Confidence:</span>
            <span className="text-positive font-bold">94% (High)</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border/60 bg-muted/60 text-xs text-muted-foreground flex items-center gap-2">
        <Info className="h-4 w-4 text-faint shrink-0" />
        <span>
          Planning caveat: Forecasts are purely computational projections based on representative historical data. Operational and regulatory dispatch decisions remain with the respective government departments.
        </span>
      </div>
    </div>
  );
}
