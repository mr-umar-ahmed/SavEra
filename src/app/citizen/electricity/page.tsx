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
  Clock,
  Coins,
  Copy,
  Cpu,
  Download,
  Info,
  Layers,
  Printer,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { DeltaPill } from "@/components/savera/DeltaPill";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEnergyAnalysis } from "@/lib/api/hooks";
import { formatKwh, formatINR } from "@/lib/format";
import { useTwinStore } from "@/stores/twin";
import { useDataStore } from "@/stores/data";
import { toast } from "sonner";

export default function CitizenElectricityDashboard() {
  const analysis = useEnergyAnalysis("H-1024");
  const officialAlerts = useDataStore((s) => s.officialAlerts);
  const applyRecommendation = useTwinStore((s) => s.applyRecommendation);

  const [activeTab, setActiveTab] = useState("overview");
  const [markedDone, setMarkedDone] = useState<Record<string, boolean>>({});

  if (!analysis) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const {
    current,
    baseline,
    recommendations,
    confidence,
  } = analysis;

  // Active electricity alert if any
  const electricityAlert = officialAlerts.find(
    (a) => a.stream === "electricity" && a.status === "active"
  );

  const handleApplyToTwin = (recId: string) => {
    applyRecommendation(recId);
    toast.success("Applied recommendation to Digital Twin simulation model!");
  };

  const toggleMarkDone = (id: string) => {
    setMarkedDone((prev) => {
      const next = !prev[id];
      if (next) {
        toast.success("Marked action as completed!");
      }
      return { ...prev, [id]: next };
    });
  };

  const handleCopySummary = () => {
    const summary = `SAVERA Monthly Electricity Report (H-1024 · Sep 2026)\n• Consumption: 390 kWh (Measured, ₹3,120)\n• Baseline: 320–350 kWh (Above Normal, +11.4% MoM)\n• Top Contributor: Air Conditioner 155 kWh (+35 kWh)\n• Forecast (Oct 2026): 405–430 kWh (₹3,250–3,500)\n• Top Opportunity: AC set-point 24°C→26°C (save ~30 kWh / ₹230)`;
    navigator.clipboard.writeText(summary);
    toast.success("Monthly report summary copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Electricity"
        eyebrow="ELECTRICITY"
        subtitle="Household meter reconciliation, personalized baselines, and predictive disaggregation."
        badge={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Sep 2026
            </span>
            <EstimatedChip
              confidence={confidence}
              inputs={["12 bills", "78% appliance detail"]}
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/citizen/twin">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-xs text-emerald-400 rounded-xl"
              >
                <Box className="h-3.5 w-3.5" />
                <span>Open Digital Twin</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Active Official Disruption Alert Banner if active */}
      {electricityAlert && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-white">{electricityAlert.title}</span>
              <p className="text-amber-200/80 mt-0.5">{electricityAlert.reason}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
            Official Advisory
          </span>
        </div>
      )}

      {/* 4.1 KPI Row matching §4.1 verbatim */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: This Month */}
        <div className="p-5 rounded-2xl bg-[#070D0A]/95 border border-white/10 backdrop-blur-xl flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 font-medium">This Month</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-bold uppercase">
                Measured
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">390 kWh</div>
            <span className="text-[11px] text-white/40 block mt-0.5">From bill (Sep 2026)</span>
          </div>
          <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between">
            <span className="text-[11px] text-white/50">MoM change:</span>
            <DeltaPill value={11.4} unit="%" invert={true} size="sm" />
          </div>
        </div>

        {/* KPI 2: Baseline */}
        <div className="p-5 rounded-2xl bg-[#070D0A]/95 border border-white/10 backdrop-blur-xl flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 font-medium">Personal Baseline</span>
              <EstimatedChip confidence="Medium" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
              320 – 350 kWh
            </div>
            <span className="text-[11px] text-white/40 block mt-0.5">Normal season band</span>
          </div>
          <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between">
            <span className="text-[11px] text-white/50">Peer group:</span>
            <span className="text-xs font-mono text-white/70">Ward 24 (4 residents)</span>
          </div>
        </div>

        {/* KPI 3: Status */}
        <div className="p-5 rounded-2xl bg-[#070D0A]/95 border border-white/10 backdrop-blur-xl flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 font-medium">Status Evaluation</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                ⚠️ Above normal
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
              +40 kWh
            </div>
            <span className="text-[11px] text-white/40 block mt-0.5">Above baseline band</span>
          </div>
          <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between">
            <span className="text-[11px] text-white/50">Primary driver:</span>
            <span className="text-xs font-mono text-amber-300">AC Cooling (+35 kWh)</span>
          </div>
        </div>

        {/* KPI 4: Next Month Forecast */}
        <div className="p-5 rounded-2xl bg-[#070D0A]/95 border border-white/10 backdrop-blur-xl flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 font-medium">Next Month Forecast</span>
              <EstimatedChip confidence="Medium" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
              405 – 430 kWh
            </div>
            <span className="text-[11px] text-emerald-400 font-mono block mt-0.5">
              Est. Bill: ₹3,250 – 3,500
            </span>
          </div>
          <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between">
            <span className="text-[11px] text-white/50">Current bill:</span>
            <span className="text-xs font-mono text-white/80 font-bold">₹3,120</span>
          </div>
        </div>
      </div>

      {/* Six Tabs Navigation matching §4 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#070D0A] border border-white/10 p-1 flex overflow-x-auto scrollbar-none w-full sm:w-auto rounded-2xl shadow-md">
          <TabsTrigger value="overview" className="text-xs rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="this-vs-last" className="text-xs rounded-xl">This vs Last Month</TabsTrigger>
          <TabsTrigger value="appliances" className="text-xs rounded-xl">Appliances</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs rounded-xl">Forecast</TabsTrigger>
          <TabsTrigger value="report" className="text-xs rounded-xl">Monthly Report</TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs rounded-xl">Recommendations</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Recommendation Hero Card */}
            <div className="lg:col-span-2 p-6 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider font-mono">
                    <Sparkles className="h-4 w-4" />
                    <span>Top Recommendation</span>
                  </div>
                  <EstimatedChip confidence="Medium" />
                </div>

                <h3 className="text-lg font-bold text-white mb-2">
                  Raise AC set-point from 24 °C to 26 °C
                </h3>
                <p className="text-xs text-white/70 leading-relaxed max-w-xl">
                  Raise AC set-point from 24 °C to 26 °C and activate sleep mode — may reduce{" "}
                  <strong className="text-emerald-400 font-mono">25–35 kWh (₹190–270)</strong> per month.
                </p>
              </div>

              <div className="pt-6 border-t border-white/5 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApplyToTwin("rec-ac-setpoint")}
                    className="bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-bold h-9 px-4 rounded-xl gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Box className="h-4 w-4" />
                    <span>Apply in Digital Twin</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMarkDone("rec-ac-setpoint")}
                    className={`text-xs h-9 px-4 rounded-xl border-white/15 ${
                      markedDone["rec-ac-setpoint"]
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-400" />
                    <span>{markedDone["rec-ac-setpoint"] ? "Completed" : "Mark as done"}</span>
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("recommendations")}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  <span>See all recommendations</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Completeness Nudge Card */}
            <div className="p-6 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-white/50 block mb-2">
                  Calibration Confidence
                </span>
                <h4 className="text-sm font-bold text-white mb-2">
                  Profile 78 % complete
                </h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  Add geyser and washing machine details to sharpen disaggregation and upgrade confidence to High.
                </p>

                <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between text-white/70">
                    <span>Bills connected:</span>
                    <span className="text-emerald-400 font-bold">12 months</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Appliance detail:</span>
                    <span className="text-amber-400 font-bold">78 % (Medium)</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Target for High:</span>
                    <span className="text-white">&ge; 80 % detail</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-4">
                <Link href="/citizen/setup/electricity">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold h-9 rounded-xl"
                  >
                    Sharpen Estimates &rarr;
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Seasonal Baseline Strip (12 bills >= 6) */}
          <div className="p-6 rounded-3xl border border-white/10 bg-[#070D0A]/90 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Seasonal Baseline Bands</h4>
                <p className="text-xs text-white/50">
                  Calibrated across 12 billing cycles with historical weather pattern reconciliation.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                Normal Band Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] font-mono text-white/40 block uppercase">
                  Summer (Mar – Jun)
                </span>
                <span className="text-lg font-bold font-mono text-white">380 – 420 kWh</span>
                <span className="text-[10px] text-white/40 block mt-1">High cooling duty cycle</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 shadow-inner">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase">
                    Normal (Jul – Oct) · CURRENT
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-xl font-bold font-mono text-white">320 – 350 kWh</span>
                <span className="text-[10px] text-emerald-300/80 block mt-1 font-mono">
                  September actual: 390 kWh (Above normal)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-[11px] font-mono text-white/40 block uppercase">
                  Winter (Nov – Feb)
                </span>
                <span className="text-lg font-bold font-mono text-white">290 – 320 kWh</span>
                <span className="text-[10px] text-white/40 block mt-1">Reduced cooling, higher geyser</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: THIS VS LAST MONTH */}
        <TabsContent value="this-vs-last" className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">Month-on-Month Variance Analysis</h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Comparative disaggregation between August 2026 and September 2026.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-white/40 uppercase block">Variance</span>
                  <span className="text-base font-bold font-mono text-amber-400">+40 kWh (+11.4 %)</span>
                </div>
                <DeltaPill value={11.4} unit="%" invert={true} size="md" />
              </div>
            </div>

            {/* Big Compare Card */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-[10px] font-mono text-white/40 uppercase block">Previous Month (Aug 2026)</span>
                <span className="text-2xl font-bold font-mono text-white">350 kWh</span>
                <span className="text-xs text-white/50 block font-mono">Billed: ₹2,850</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-xs">
                  &rarr;
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase block">Current Month (Sep 2026)</span>
                <span className="text-2xl font-bold font-mono text-amber-400">390 kWh</span>
                <span className="text-xs text-white/50 block font-mono">Billed: ₹3,120</span>
              </div>
            </div>

            {/* 6-Month Historical Series Bar/Line Representation */}
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-white/60 mb-3 block">
                Historical 6-Month Monthly Trend (kWh)
              </span>
              <div className="grid grid-cols-6 gap-2 text-center text-xs font-mono">
                {[
                  { month: "Apr", kwh: 410, cost: "₹3,320", color: "bg-white/10 text-white" },
                  { month: "May", kwh: 415, cost: "₹3,380", color: "bg-white/10 text-white" },
                  { month: "Jun", kwh: 378, cost: "₹3,050", color: "bg-white/10 text-white" },
                  { month: "Jul", kwh: 362, cost: "₹2,940", color: "bg-white/10 text-white" },
                  { month: "Aug", kwh: 350, cost: "₹2,850", color: "bg-teal-500/20 text-teal-300 border border-teal-500/30" },
                  { month: "Sep", kwh: 390, cost: "₹3,120", color: "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold" },
                ].map((m) => (
                  <div key={m.month} className={`p-3 rounded-xl ${m.color} flex flex-col justify-between`}>
                    <span className="text-[10px] text-white/50">{m.month}</span>
                    <span className="text-sm my-1">{m.kwh}</span>
                    <span className="text-[9px] text-white/40">{m.cost}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Possible Contributors (Worded as possibilities, never causes) */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white/70 block">
                Possible Contributors (Algorithmic Estimation)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { title: "Increased AC usage", desc: "Estimated +35 kWh due to higher afternoon duty cycles", impact: "+35 kWh" },
                  { title: "Higher cooling demand", desc: "Warmer days recorded in Raichur Ward 24 during this period", impact: "Ambient" },
                  { title: "Longer appliance operating hours", desc: "Extended fan and entertainment runtimes recorded", impact: "+5 kWh" },
                  { title: "A new appliance added this month", desc: "Inspection advised if a temporary heating device was introduced", impact: "Verify" },
                  { title: "Change in occupancy", desc: "Additional guests or residents increase baseline load", impact: "Variable" },
                  { title: "Appliance efficiency", desc: "Possible cause, further inspection may be required", impact: "Inspect" },
                ].map((c) => (
                  <div key={c.title} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white block">{c.title}</span>
                      <span className="text-[11px] text-white/50">{c.desc}</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-amber-400 shrink-0 ml-2">
                      {c.impact}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-white/40 italic pt-2">
                These are possible contributors based on your appliance profile and consumption history, not confirmed causes.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: APPLIANCES */}
        <TabsContent value="appliances" className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">Appliance-Level Disaggregation</h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Calibrated mathematical estimation for Household H-1024.
                </p>
              </div>
              <EstimatedChip confidence="Medium" inputs={["12 bills", "78% appliance detail"]} />
            </div>

            {/* Table matching §4.3 verbatim */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/80">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 font-mono text-[11px]">
                    <th className="pb-3 font-semibold">Appliance</th>
                    <th className="pb-3 text-right font-semibold">Aug (kWh)</th>
                    <th className="pb-3 text-right font-semibold">Sep (kWh)</th>
                    <th className="pb-3 text-right font-semibold">Change</th>
                    <th className="pb-3 text-right font-semibold">Detail Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 font-sans font-medium text-white">Air conditioner (1.5 T, 3★)</td>
                    <td className="py-3 text-right text-white/70">120</td>
                    <td className="py-3 text-right font-bold text-white">155</td>
                    <td className="py-3 text-right text-amber-400 font-bold">+35</td>
                    <td className="py-3 text-right">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">High</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 font-sans font-medium text-white">Ceiling fans (4)</td>
                    <td className="py-3 text-right text-white/70">65</td>
                    <td className="py-3 text-right font-bold text-white">70</td>
                    <td className="py-3 text-right text-amber-400 font-bold">+5</td>
                    <td className="py-3 text-right">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">High</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 font-sans font-medium text-white">Refrigerator (260 L)</td>
                    <td className="py-3 text-right text-white/70">46</td>
                    <td className="py-3 text-right font-bold text-white">46</td>
                    <td className="py-3 text-right text-white/40">0</td>
                    <td className="py-3 text-right">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">High</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 font-sans font-medium text-white">Lighting (8 LED + 2 tube)</td>
                    <td className="py-3 text-right text-white/70">29</td>
                    <td className="py-3 text-right font-bold text-white">29</td>
                    <td className="py-3 text-right text-white/40">0</td>
                    <td className="py-3 text-right">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">High</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 font-sans font-medium text-white">Television</td>
                    <td className="py-3 text-right text-white/70">20</td>
                    <td className="py-3 text-right font-bold text-white">20</td>
                    <td className="py-3 text-right text-white/40">0</td>
                    <td className="py-3 text-right">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">Medium</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 font-sans font-medium text-white">Other (kitchen, laptop, router, iron)</td>
                    <td className="py-3 text-right text-white/70">48</td>
                    <td className="py-3 text-right font-bold text-white">50</td>
                    <td className="py-3 text-right text-amber-400 font-bold">+2</td>
                    <td className="py-3 text-right">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">Medium</span>
                    </td>
                  </tr>
                  <tr className="border-t border-white/10 font-bold bg-white/[0.02]">
                    <td className="py-3 font-sans text-white">Estimated total (Appliance sum)</td>
                    <td className="py-3 text-right text-white">328</td>
                    <td className="py-3 text-right text-emerald-400">365</td>
                    <td className="py-3 text-right text-amber-400">+37</td>
                    <td className="py-3 text-right text-[10px] font-sans text-white/40">Estimated</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* What Changed Card & Meter Reconciliation Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* What Changed Card */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 block">
                  What Changed?
                </span>
                <p className="text-xs text-white/80 leading-relaxed">
                  Largest estimated contributor: <strong className="text-white">Air conditioner (+35 kWh)</strong>.
                  Possible reasons: more operating hours or higher cooling demand during warm periods.
                </p>
                <div className="pt-2">
                  <Link href="/citizen/setup/electricity?step=2">
                    <span className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                      Improve partial estimates (geyser &amp; washing machine) &rarr;
                    </span>
                  </Link>
                </div>
              </div>

              {/* Meter Reconciliation Card */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/80">
                    Meter Reconciliation
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                    Billed: Measured
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs py-1">
                  <div>
                    <span className="text-[10px] text-white/40 block font-sans">Actual Meter</span>
                    <span className="font-bold text-white">390 kWh</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 block font-sans">Appliance Sum</span>
                    <span className="font-bold text-emerald-400">365 kWh</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 block font-sans">Unallocated</span>
                    <span className="font-bold text-amber-400">25 kWh (6 %)</span>
                  </div>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed pt-1">
                  Unallocated units may come from appliances not yet added or usage variations. Estimates are never presented as measurements.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: FORECAST */}
        <TabsContent value="forecast" className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">October 2026 Demand &amp; Cost Forecast</h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Multi-variable autoregressive projection calibrated for Raichur LT-2 tariff slabs.
                </p>
              </div>
              <EstimatedChip confidence="Medium" inputs={["50% current weight", "Oct seasonal 1.02"]} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block font-bold">
                  Next Month Demand Range
                </span>
                <div className="text-3xl font-extrabold font-mono text-white">405 – 430 kWh</div>
                <div className="text-xs text-white/60 flex items-center gap-2">
                  <span>Point estimate: <strong className="font-mono text-white">418 kWh</strong></span>
                  <span>•</span>
                  <span className="text-amber-400 font-mono font-medium">Expected change: +4 % to +10 %</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block font-bold">
                  Financial Bill Projection
                </span>
                <div className="text-3xl font-extrabold font-mono text-emerald-400">
                  ₹3,250 – 3,500
                </div>
                <div className="text-xs text-white/60 flex items-center gap-2 font-mono">
                  <span>Prev: ₹2,850 (Aug)</span>
                  <span>&rarr;</span>
                  <span>Current: ₹3,120 (Sep)</span>
                </div>
              </div>
            </div>

            {/* Why Drivers matching §4.4 */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-white/70 font-bold block">
                Forecast Algorithm Drivers &amp; Weights
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-white/40 block font-sans">Current Month Weight</span>
                  <span className="font-bold text-white">50% (390 kWh)</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-white/40 block font-sans">Last 3 Months Avg</span>
                  <span className="font-bold text-white">372 kWh</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-white/40 block font-sans">Same Month Last Year</span>
                  <span className="font-bold text-white">398 kWh</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-white/40 block font-sans">October Seasonal Factor</span>
                  <span className="font-bold text-emerald-400">1.02</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-white/40 block font-sans">Ward 24 Area Trend</span>
                  <span className="font-bold text-amber-400">+1.0 %</span>
                </div>
              </div>
            </div>

            {/* Disclaimer Verbatim */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-white/50 flex items-start gap-2">
              <Info className="h-4 w-4 text-white/40 shrink-0 mt-0.5" />
              <span>
                Estimated — actual bill may differ based on tariff, fixed charges, taxes and other billing components.
              </span>
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: MONTHLY REPORT */}
        <TabsContent value="report" className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl space-y-6 printable-report">
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                  SAVERA Monthly Electricity Report
                </span>
                <h3 className="text-xl font-extrabold text-white mt-0.5">
                  Household H-1024 · Statement of Consumption
                </h3>
                <p className="text-xs text-white/50 font-mono mt-1">
                  XYZ Colony, Ward 24, Raichur · Period: September 2026 · Generated: 25 Sep 2026
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-9 gap-2 border-white/15 bg-white/5 hover:bg-white/10 text-xs text-white rounded-xl"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print / Save as PDF</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopySummary}
                  className="h-9 gap-1.5 text-xs text-white/60 hover:text-white rounded-xl"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Share Summary</span>
                </Button>
              </div>
            </div>

            {/* 1. Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase block font-sans">Total Consumption</span>
                <span className="text-xl font-bold text-white">390 kWh</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5 font-sans">Measured</span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase block font-sans">Billed Amount</span>
                <span className="text-xl font-bold text-white">₹3,120</span>
                <span className="text-[10px] text-white/40 block mt-0.5 font-sans">GESCOM LT-2</span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase block font-sans">vs Last Month</span>
                <span className="text-xl font-bold text-amber-400">+40 kWh</span>
                <span className="text-[10px] text-amber-400/80 block mt-0.5 font-sans">+11.4 %</span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-white/40 uppercase block font-sans">vs Last Year</span>
                <span className="text-xl font-bold text-white">+8 kWh</span>
                <span className="text-[10px] text-white/40 block mt-0.5 font-sans">+2.0 %</span>
              </div>
            </div>

            {/* 2. Baseline & Status */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-300 block">
                  Status: ⚠️ Above Normal Band (320–350 kWh)
                </span>
                <span className="text-white/70">
                  Consumption is above your baseline band. Primary estimated contributor is Air Conditioner.
                </span>
              </div>
              <span className="text-amber-400 font-mono font-bold text-sm">+40 kWh</span>
            </div>

            {/* 3. Disaggregated Breakdown Table in Report */}
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-white/60 mb-2 block font-bold">
                Appliance Disaggregation Breakdown (Estimated)
              </span>
              <div className="divide-y divide-white/5 text-xs font-mono">
                <div className="py-2 flex justify-between">
                  <span className="text-white/80 font-sans">Air conditioner (1.5 T, 3★)</span>
                  <span className="font-bold text-white">155 kWh (+35 kWh)</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-white/80 font-sans">Ceiling fans (4 units)</span>
                  <span className="text-white/80">70 kWh (+5 kWh)</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-white/80 font-sans">Refrigerator (260 L)</span>
                  <span className="text-white/80">46 kWh</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-white/80 font-sans">Lighting fixtures</span>
                  <span className="text-white/80">29 kWh</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-white/80 font-sans">Television &amp; Entertainment</span>
                  <span className="text-white/80">20 kWh</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-white/80 font-sans">Other (kitchen, laptop, router, iron)</span>
                  <span className="text-white/80">50 kWh (+2 kWh)</span>
                </div>
                <div className="py-2 flex justify-between text-amber-400 font-bold">
                  <span className="font-sans">Unallocated Meter Variance</span>
                  <span>25 kWh (6 %)</span>
                </div>
              </div>
            </div>

            {/* 4. Forecast & Top Recommendations */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2 text-xs">
              <span className="font-bold text-white block">October 2026 Forecast &amp; Key Recommendations:</span>
              <p className="text-white/70">
                Forecasted load: <strong className="text-white font-mono">405–430 kWh (₹3,250–3,500)</strong>
              </p>
              <ul className="space-y-1 text-white/60">
                <li>• 1. Raise AC set-point from 24 °C to 26 °C: save 25–35 kWh (₹190–270)</li>
                <li>• 2. Reduce fan hours by 2 h/day across 4 ceiling fans: save 15–20 kWh (₹110–150)</li>
                <li>• 3. Switch remaining tube lights to LED: save 6–9 kWh (₹45–70)</li>
              </ul>
            </div>

            {/* 5. Confidence Footer Verbatim */}
            <div className="pt-4 border-t border-white/10 text-[11px] text-white/40 leading-relaxed font-mono">
              Confidence: Medium — based on 12 bills and 78 % appliance detail. Appliance-level figures are estimates reconciled to your meter reading; they are not measurements.
            </div>
          </div>
        </TabsContent>

        {/* TAB 6: RECOMMENDATIONS */}
        <TabsContent value="recommendations" className="space-y-6">
          <div className="space-y-4">
            {/* Hero Card: Biggest Opportunity matching §4.6 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-[#070D0A] to-teal-950/20 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Your Biggest Opportunity</span>
                </span>
                <EstimatedChip confidence="Medium" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-white">
                  Air Conditioner: Raise set-point 24 °C &rarr; 26 °C and use sleep mode
                </h3>
                <p className="text-xs sm:text-sm text-white/70 mt-1 leading-relaxed max-w-2xl">
                  Adjusting cooling thermostat by 2 °C reduces compressor load by approximately 18%. Combined with automatic night sleep mode, this may reduce{" "}
                  <strong className="text-emerald-400 font-mono font-bold">25–35 kWh (₹190–270)</strong> per month.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  onClick={() => handleApplyToTwin("rec-ac-setpoint")}
                  className="w-full sm:w-auto bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs h-10 px-6 gap-2 rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  <Box className="h-4 w-4" />
                  <span>Apply in Digital Twin</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => toggleMarkDone("rec-ac-setpoint")}
                  className={`w-full sm:w-auto text-xs h-10 px-6 rounded-xl border-white/15 ${
                    markedDone["rec-ac-setpoint"]
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" />
                  <span>{markedDone["rec-ac-setpoint"] ? "Marked as Done" : "Mark as Done"}</span>
                </Button>
              </div>
            </div>

            {/* Ranked List matching §4.6 verbatim */}
            <div className="space-y-3">
              {[
                {
                  id: "rec-ac-setpoint",
                  rank: "1",
                  title: "AC set-point / sleep mode",
                  action: "Raise thermostat from 24 °C to 26 °C and activate sleep mode overnight.",
                  impact: "25–35 kWh · ₹190–270 / month",
                  twinParam: "rec-ac-setpoint",
                },
                {
                  id: "rec-fans-hours",
                  rank: "2",
                  title: "Reduce fan hours by 2 h/day across 4 ceiling fans",
                  action: "Turn off ceiling fans in unoccupied rooms; may reduce 15–20 kWh per month.",
                  impact: "15–20 kWh · ₹110–150 / month",
                  twinParam: "rec-fans",
                },
                {
                  id: "rec-led-lighting",
                  rank: "3",
                  title: "Switch tube lights to LED",
                  action: "Upgrade remaining 2 magnetic ballast tube lights to 18W high-efficiency LED tubes.",
                  impact: "6–9 kWh · ₹45–70 / month",
                  twinParam: "rec-lighting",
                },
                {
                  id: "rec-fridge-seal",
                  rank: "4",
                  title: "Fridge: check door seal, keep 2 in gap from wall",
                  action: "Clean condenser coils and maintain rear airflow clearance to enhance compressor efficiency.",
                  impact: "4–6 kWh · ₹30–45 / month",
                  twinParam: "rec-fridge",
                },
                {
                  id: "rec-standby-power",
                  rank: "5",
                  title: "Standby: switch off TV/set-top box at the wall",
                  action: "Eliminate phantom vampire drain from home entertainment adapters when not in use.",
                  impact: "3–5 kWh · ₹20–40 / month",
                  twinParam: "rec-standby",
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg hover:border-white/20 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-emerald-400 shrink-0 mt-0.5">
                      {item.rank}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{item.title}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {item.impact}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 max-w-xl">{item.action}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <Button
                      size="sm"
                      onClick={() => handleApplyToTwin(item.id)}
                      className="flex-1 sm:flex-initial bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-medium h-8 gap-1.5"
                    >
                      <Box className="h-3.5 w-3.5" />
                      <span>Simulate in Twin</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMarkDone(item.id)}
                      className={`text-xs h-8 px-3 ${
                        markedDone[item.id] ? "text-emerald-400" : "text-white/50 hover:text-white"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-white/40 italic pt-2">
              Note: Every recommendation uses &ldquo;may reduce&rdquo;; financial savings calculated via the marginal slab of the Raichur demo tariff; figures are illustrative estimates, never guaranteed.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
