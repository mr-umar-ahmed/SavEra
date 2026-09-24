"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Box,
  CheckCircle2,
  ChevronRight,
  Coins,
  Cpu,
  Download,
  Info,
  Layers,
  Printer,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEnergyAnalysis } from "@/lib/api/hooks";
import { formatKwh, formatIN, formatINR } from "@/lib/format";
import { useTwinStore } from "@/stores/twin";
import { toast } from "sonner";

export default function CitizenElectricityDashboard() {
  const analysis = useEnergyAnalysis("H-1024");
  const applyRecommendation = useTwinStore((s) => s.applyRecommendation);

  const [activeTab, setActiveTab] = useState("overview");

  if (!analysis) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const {
    current,
    previous,
    baseline,
    mom,
    forecast,
    recommendations,
    confidence,
  } = analysis;
  const currentKwh = current.actualKwh;
  const previousKwh = previous?.actualKwh ?? 350;
  const reconciliation = current.reconciliation;

  const handleApplyToTwin = (recId: string) => {
    applyRecommendation(recId);
    toast.success("Recommendation applied to Digital Twin simulation model!");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Electricity Intelligence"
        subtitle="Household meter reconciliation, personalized baselines, and predictive disaggregation."
        badge={
          <div className="flex items-center gap-2">
            <EstimatedChip confidence={confidence} inputs={["2 previous bills", "5 appliances"]} />
            <StatusBadge status={current.status === "normal" ? "normal" : "moderate"} label={current.status === "normal" ? "Normal Range" : "Above Normal"} />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/citizen/twin">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-emerald-400">
                <Box className="h-3.5 w-3.5" />
                <span>Open Digital Twin</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Current Month Consumption"
          value={formatKwh(currentKwh)}
          subtitle="September 2026 meter reading"
          delta={
            mom
              ? {
                  value: mom.delta,
                  formatted: `+${mom.delta} kWh (+${mom.deltaPct.toFixed(1)}%)`,
                  direction: "up",
                  isGood: false,
                }
              : undefined
          }
          badge={<StatusBadge status="moderate" label="Above Baseline" />}
        />

        <KpiCard
          title="Personal Baseline Band"
          value={`${baseline.low} – ${baseline.high} kWh`}
          subtitle="Calibrated 3BHK peer norm"
          badge={<EstimatedChip confidence="Medium" />}
        />

        <KpiCard
          title="Next Month Forecast"
          value={`${forecast.low} – ${forecast.high} kWh`}
          subtitle="October 2026 expected load"
          badge={<EstimatedChip confidence="Medium" />}
        />

        <KpiCard
          title="Estimated Bill Range"
          value={`${formatINR(forecast.billLow)} – ${formatINR(forecast.billHigh)}`}
          subtitle="Current bill: ₹3,120"
          badge={<EstimatedChip confidence="Medium" />}
        />
      </div>

      {/* Six Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-black/40 border border-white/10 p-1 flex overflow-x-auto scrollbar-none w-full sm:w-auto">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="this-vs-last" className="text-xs">This vs Last Month</TabsTrigger>
          <TabsTrigger value="appliances" className="text-xs">Appliance Breakdown</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs">Forecast & Cost</TabsTrigger>
          <TabsTrigger value="report" className="text-xs">Monthly Report</TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs">Recommendations</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Recommendation Highlight */}
            <div className="lg:col-span-2 p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  <span>Top Energy Saving Opportunity</span>
                </div>
                <EstimatedChip confidence="Medium" />
              </div>

              {recommendations[0] && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">{recommendations[0].title}</h3>
                    <p className="text-xs text-white/60 leading-relaxed">{recommendations[0].action}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-white/40 uppercase tracking-wider block">Estimated Monthly Impact</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        Save {recommendations[0].kwhSavingLow}–{recommendations[0].kwhSavingHigh} kWh ({formatINR(recommendations[0].rupeeLow)}–{formatINR(recommendations[0].rupeeHigh)})
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleApplyToTwin(recommendations[0].id)}
                      className="bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-semibold h-8 gap-1.5"
                    >
                      <Box className="h-3.5 w-3.5" />
                      <span>Apply in Twin</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Reconciliation Summary Card */}
            <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white mb-2">Meter Reconciliation</h3>
                <p className="text-xs text-white/60 mb-4">
                  Actual meter read reconciled against appliance disaggregation algorithms.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/60">Actual Meter Read:</span>
                    <span className="font-bold font-mono text-white">{reconciliation.actualKwh} kWh</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-white/60">Sum of Disaggregated:</span>
                    <span className="font-medium font-mono text-emerald-400">{reconciliation.estimatedTotal} kWh</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-white/60">Unallocated Variance:</span>
                    <span className="font-mono text-amber-400">{reconciliation.unallocatedKwh} kWh</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 text-[11px] text-white/40">
                Disaggregated estimates match within 6.4% of total billed units.
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: This vs Last Month */}
        <TabsContent value="this-vs-last" className="space-y-6">
          <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Month-on-Month Variance Analysis</h3>
              <p className="text-xs text-white/60">
                Comparing August 2026 ({previousKwh} kWh) vs September 2026 ({currentKwh} kWh).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-1">Consumption increased by {mom?.delta ?? 40} kWh (+{mom?.deltaPct?.toFixed(1) ?? "11.4"}%)</span>
                <p className="text-white/70">
                  Possible contributors identified by disaggregation model: Higher ambient temperature increased cooling duty cycles on your Split AC, contributing approximately 35 kWh to the delta.
                </p>
              </div>
            </div>

            {/* Possible Contributors List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3">
                Possible Contributors (Algorithmic Estimation)
              </h4>
              <div className="space-y-2">
                {[
                  { title: "Air Conditioner Cooling Duty", impact: "+35 kWh", desc: "Estimated increase in operating hours during peak afternoon temperatures." },
                  { title: "Refrigeration Thermal Load", impact: "+4 kWh", desc: "Higher external ambient temperatures raise compressor runtime." },
                  { title: "Unallocated Habitual Variance", impact: "+1 kWh", desc: "Minor variations in lighting and small standby appliances." },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white block">{item.title}</span>
                      <span className="text-[11px] text-white/50">{item.desc}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400">{item.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Appliances */}
        <TabsContent value="appliances" className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Disaggregated Appliance Breakdown</h3>
                <p className="text-xs text-white/60">Estimated individual appliance consumption for September 2026.</p>
              </div>
              <EstimatedChip confidence="Medium" />
            </div>

            <div className="divide-y divide-white/5">
              {[
                { name: "Split AC 1.5 T (3 Star)", aug: "120 kWh", sep: "155 kWh", delta: "+35 kWh", pct: "42.5%" },
                { name: "Ceiling Fans (4 units)", aug: "70 kWh", sep: "70 kWh", delta: "0 kWh", pct: "19.2%" },
                { name: "Refrigerator 260 L", aug: "42 kWh", sep: "46 kWh", delta: "+4 kWh", pct: "12.6%" },
                { name: "LED Lighting Fixtures", aug: "29 kWh", sep: "29 kWh", delta: "0 kWh", pct: "7.9%" },
                { name: "Smart TV & Entertainment", aug: "20 kWh", sep: "20 kWh", delta: "0 kWh", pct: "5.5%" },
                { name: "Storage Geyser 15 L", aug: "45 kWh", sep: "45 kWh", delta: "0 kWh", pct: "12.3%" },
              ].map((row, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-4">
                    <span className="font-semibold text-white block truncate">{row.name}</span>
                    <span className="text-[11px] text-white/40">Share of estimated load: {row.pct}</span>
                  </div>
                  <div className="flex items-center gap-6 font-mono text-right">
                    <div>
                      <span className="text-[10px] text-white/40 block">Aug</span>
                      <span className="text-white/70">{row.aug}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40 block">Sep</span>
                      <span className="font-bold text-white">{row.sep}</span>
                    </div>
                    <div className="w-16">
                      <span className="text-[10px] text-white/40 block">Change</span>
                      <span className={row.delta.startsWith("+") ? "text-amber-400 font-bold" : "text-white/50"}>{row.delta}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Forecast & Cost */}
        <TabsContent value="forecast" className="space-y-6">
          <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Financial & Demand Projection (October 2026)</h3>
              <p className="text-xs text-white/60">
                Forward-looking demand projection based on multi-month historical trends and seasonal temperature shifts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Projected Units (kWh)</span>
                <div className="text-2xl font-bold font-mono text-white">{forecast.low} – {forecast.high} kWh</div>
                <p className="text-xs text-white/50">Point estimate: {forecast.point} kWh (+5.1% seasonal transition)</p>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Projected Utility Cost</span>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {formatINR(forecast.billLow)} – {formatINR(forecast.billHigh)}
                </div>
                <p className="text-xs text-white/50">Based on Karnataka GESCOM domestic LT-2 slab tariff structure</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/50 flex items-start gap-2">
              <Info className="h-4 w-4 text-white/40 shrink-0 mt-0.5" />
              <span>
                Estimated bill disclaimer: Actual bill may differ based on exact slab consumption, fixed meter charges, fuel adjustment costs (FAC), and municipal electricity duties.
              </span>
            </div>
          </div>
        </TabsContent>

        {/* Tab 5: Monthly Report */}
        <TabsContent value="report" className="space-y-6">
          <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Monthly Habitat Resource Summary</h3>
                <p className="text-xs text-white/50 font-mono">Statement Period: 01 Sep 2026 – 30 Sep 2026 · H-1024</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 gap-1.5 border-white/15 bg-white/5 text-xs text-white"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Statement</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-white/40 text-[10px] block">TOTAL UNITS</span>
                <span className="text-base font-bold text-white">390 kWh</span>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-white/40 text-[10px] block">TOTAL AMOUNT</span>
                <span className="text-base font-bold text-white">₹3,120</span>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-white/40 text-[10px] block">PEER RANK</span>
                <span className="text-base font-bold text-emerald-400">#84 / 700</span>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                <span className="text-white/40 text-[10px] block">STATUS</span>
                <span className="text-base font-bold text-amber-400">Above Normal</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 6: Recommendations */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-5 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                    <EstimatedChip confidence="Medium" />
                  </div>
                  <p className="text-xs text-white/60 max-w-xl">{rec.action}</p>
                  <div className="text-xs font-mono font-medium text-emerald-400 pt-1">
                    Potential Savings: {rec.kwhSavingLow}–{rec.kwhSavingHigh} kWh/mo ({formatINR(rec.rupeeLow)}–{formatINR(rec.rupeeHigh)})
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleApplyToTwin(rec.id)}
                  className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium h-8 shrink-0 gap-1.5"
                >
                  <Box className="h-3.5 w-3.5" />
                  <span>Simulate in Twin</span>
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
