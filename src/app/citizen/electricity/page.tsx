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
import { useEnergyAnalysis, useCurrentHousehold } from "@/lib/api/hooks";
import { formatKwh, formatINR } from "@/lib/format";
import { useTwinStore } from "@/stores/twin";
import { useDataStore } from "@/stores/data";
import { useSessionStore } from "@/stores/session";
import { computeBill } from "@/lib/engine/tariff";
import { Input } from "@/components/ui/input";
import { Edit3, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Camera, PenLine } from "lucide-react";
import { BillDropzone } from "@/components/features/bills";
import { LabelChip } from "@/components/savera/LabelChip";

import { consumptionStatusLabel, consumptionStatusTone } from "@/types/common";
import { useFirstRunGate } from "@/components/features/onboarding/useFirstRunGate";

export default function CitizenElectricityDashboard() {
  const gate = useFirstRunGate();
  const user = useSessionStore((s) => s.user);
  const { household } = useCurrentHousehold();
  const currentHouseholdId = household?.id || user?.householdId || "H-1024";
  const analysis = useEnergyAnalysis(currentHouseholdId);
  const officialAlerts = useDataStore((s) => s.officialAlerts);
  const applyRecommendation = useTwinStore((s) => s.applyRecommendation);
  const addBill = useDataStore((s) => s.addBill);

  const [activeTab, setActiveTab] = useState("overview");
  const [markedDone, setMarkedDone] = useState<Record<string, boolean>>({});

  // Dynamic Bill Editing State
  const [showBillModal, setShowBillModal] = useState(false);
  const [billKwhInput, setBillKwhInput] = useState("");
  const [billAmountInput, setBillAmountInput] = useState("");
  // How the bill is being logged (segmented control) and where the saved values came from.
  const [billEntryMode, setBillEntryMode] = useState<"upload" | "manual">("upload");
  const [billSource, setBillSource] = useState<"manual" | "upload">("manual");

  if (!gate.ready || !analysis) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const {
    current,
    baseline,
    recommendations,
    confidence,
  } = analysis;

  const measuredKwh = current.actualKwh;
  const currentBillAmount = typeof current.bill === "number" ? current.bill : computeBill(measuredKwh).total;
  const momDiff = analysis.mom?.delta ?? 0;
  const momPct = analysis.mom?.deltaPct ?? 0;
  const baselineLow = baseline.low;
  const baselineHigh = baseline.high;
  const statusDiff = Math.round(measuredKwh - baseline.mid);
  const statusTone = consumptionStatusTone(current.status);
  const statusLabel = consumptionStatusLabel(current.status);
  const forecastLow = analysis.forecast ? analysis.forecast.low : Math.round(measuredKwh * 0.96);
  const forecastHigh = analysis.forecast ? analysis.forecast.high : Math.round(measuredKwh * 1.08);
  const forecastBillLow = analysis.forecast ? analysis.forecast.billLow : computeBill(forecastLow).total;
  const forecastBillHigh = analysis.forecast ? analysis.forecast.billHigh : computeBill(forecastHigh).total;
  const topDriver = analysis.mom?.largestContributor?.label ?? "Air Conditioner";
  const topDriverDiff = analysis.mom?.largestContributor?.delta ?? 35;

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

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    const kwh = parseFloat(billKwhInput);
    if (!kwh || kwh <= 0) {
      toast.error("Please enter valid consumption units (kWh)");
      return;
    }
    const computed = computeBill(kwh);
    const amount = parseFloat(billAmountInput) || computed.total;
    const month = "2026-09";

    addBill({
      id: `bill-${currentHouseholdId.toLowerCase()}-${month}`,
      householdId: currentHouseholdId,
      periodStart: "2026-08-22",
      periodEnd: "2026-09-21",
      billDate: "2026-09-22",
      month,
      kwh,
      amount,
      meterPrev: 2400,
      meterCurr: 2400 + kwh,
      consumerCategory: "domestic",
      tariffName: "Demo Domestic LT-1",
      source: billSource,
    });

    setShowBillModal(false);
    toast.success(`September bill updated to ${kwh} kWh (₹${amount})! Dashboard recalibrated.`);
  };

  const handleCopySummary = () => {
    const summary = `SAVERA Monthly Electricity Report (${currentHouseholdId} · Sep 2026)\n• Consumption: ${measuredKwh} kWh (Measured, ₹${currentBillAmount})\n• Baseline: ${baselineLow}–${baselineHigh} kWh (${statusLabel}, ${momPct > 0 ? "+" : ""}${momPct}% MoM)\n• Top Contributor: ${topDriver} (${topDriverDiff > 0 ? "+" : ""}${topDriverDiff} kWh)\n• Forecast (Oct 2026): ${forecastLow}–${forecastHigh} kWh (₹${forecastBillLow}–${forecastBillHigh})\n• Household: ${household?.name ?? user?.name ?? "Resident"} (${household?.homeType ?? "Home"}, Ward 24)`;
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-positive/10 text-positive border border-positive/20">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBillKwhInput(measuredKwh.toString());
                setBillAmountInput(currentBillAmount.toString());
                setBillSource("manual");
                setBillEntryMode("upload");
                setShowBillModal(true);
              }}
              className="h-10 gap-2 px-4 text-xs font-semibold rounded-xl border-border bg-muted hover:bg-secondary text-foreground"
            >
              <Edit3 className="size-3.5 text-positive" />
              <span>Update / Log Bill</span>
            </Button>
            <Link href="/citizen/twin">
              <Button
                variant="positive"
                size="sm"
                className="h-10 gap-2 px-5 text-sm"
              >
                <Box className="size-4" />
                <span>Open Digital Twin</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Bill Update / Log Modal Panel */}
      {showBillModal && (
        <div className="p-5 rounded-3xl border border-positive/40 bg-card backdrop-blur-2xl shadow-xl animate-in fade-in space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-positive/10 border border-positive/20 flex items-center justify-center text-positive">
                <Edit3 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Log or Recalibrate Monthly Bill (Sep 2026)</h4>
                <p className="text-xs text-muted-foreground">
                  Updates household {currentHouseholdId} baseline reconciliation, slab breakdown, and forecast.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBillModal(false)}
              className="text-xs text-muted-foreground hover:text-foreground p-1"
            >
              ✕ Close
            </button>
          </div>

          {/* Entry mode: real file picker (simulated OCR) or manual form */}
          <div
            role="radiogroup"
            aria-label="How would you like to log this bill?"
            className="inline-flex w-full sm:w-auto rounded-full border border-border bg-muted p-1"
          >
            {(
              [
                { id: "upload", label: "Upload bill photo", Icon: Camera },
                { id: "manual", label: "Enter manually", Icon: PenLine },
              ] as const
            ).map((opt) => {
              const selected = billEntryMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setBillEntryMode(opt.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-none sm:px-4 ${
                    selected
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <opt.Icon className={`size-3.5 ${selected ? "text-positive" : ""}`} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {billEntryMode === "upload" && (
            <div className="space-y-2">
              <BillDropzone
                compact
                stream="electricity"
                scanDurationMs={2000}
                onExtracted={(r) => {
                  setBillKwhInput(String(r.extraction.kwh));
                  setBillAmountInput(String(r.extraction.amount));
                  setBillSource("upload");
                  toast.success("Bill read — fields filled (Simulated OCR). Review and save.");
                }}
              />
              {billSource === "upload" && (
                <p className="flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
                  <LabelChip kind="simulated" label="Simulated OCR" size="sm" />
                  <span>The fields below were filled from your bill — check them before saving.</span>
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSaveBill} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-soft mb-1">
                Billed Energy Units (kWh)
              </label>
              <Input
                type="number"
                placeholder="e.g. 410"
                value={billKwhInput}
                onChange={(e) => {
                  setBillKwhInput(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (val && val > 0) {
                    setBillAmountInput(computeBill(val).total.toString());
                  }
                }}
                className="bg-muted border-border text-foreground text-xs h-9 rounded-xl focus:border-positive font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-soft mb-1">
                Bill Amount (₹, Slab Auto-calculated)
              </label>
              <Input
                type="number"
                placeholder="e.g. 3280"
                value={billAmountInput}
                onChange={(e) => setBillAmountInput(e.target.value)}
                className="bg-muted border-border text-foreground text-xs h-9 rounded-xl focus:border-positive font-mono font-bold"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-9 rounded-xl shadow-md shadow-primary/10"
              >
                Apply &amp; Recalibrate
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Active Official Disruption Alert Banner if active */}
      {electricityAlert && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs text-amber-ink">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-ink shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-foreground">{electricityAlert.title}</span>
              <p className="text-amber-ink/80 mt-0.5">{electricityAlert.reason}</p>
            </div>
          </div>
          <span className="text-2xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-ink border border-amber-500/30 shrink-0">
            Official Advisory
          </span>
        </div>
      )}

      {/* 4.1 KPI Row matching §4.1 verbatim */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: This Month */}
        <div className="p-5 rounded-2xl bg-card border border-border backdrop-blur-xl flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">This Month</span>
              <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-secondary text-soft font-bold uppercase">
                Measured
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">{measuredKwh} kWh</div>
            <span className="text-xs text-faint block mt-0.5">From bill (Sep 2026) · {formatINR(currentBillAmount)}</span>
          </div>
          <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">MoM change:</span>
            <DeltaPill value={Number(momPct.toFixed(1))} unit="%" invert={true} size="sm" />
          </div>
        </div>

        {/* KPI 2: Baseline */}
        <div className="p-5 rounded-2xl bg-card border border-border backdrop-blur-xl flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Personal Baseline</span>
              <EstimatedChip confidence="Medium" size="sm" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-positive">
              {baselineLow} – {baselineHigh} kWh
            </div>
            <span className="text-xs text-faint block mt-0.5">Normal season band ({household?.homeType ?? "Home"})</span>
          </div>
          <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Peer group:</span>
            <span className="text-xs font-mono text-soft">Ward 24 ({household?.people ?? 3} members)</span>
          </div>
        </div>

        {/* KPI 3: Status */}
        <div className="p-5 rounded-2xl bg-card border border-border backdrop-blur-xl flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Status Evaluation</span>
              <span className={`text-2xs font-mono px-1.5 py-0.5 rounded font-bold ${
                statusTone === "critical"
                  ? "bg-rose-500/20 text-rose-ink"
                  : statusTone === "moderate"
                  ? "bg-amber-500/20 text-amber-ink"
                  : "bg-positive/20 text-positive"
              }`}>
                {statusLabel}
              </span>
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-display ${
              statusDiff > 0 ? "text-amber-ink" : "text-positive"
            }`}>
              {statusDiff > 0 ? `+${statusDiff} kWh` : `${statusDiff} kWh`}
            </div>
            <span className="text-xs text-faint block mt-0.5">vs baseline midpoint</span>
          </div>
          <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Primary driver:</span>
            <span className="text-xs font-mono text-amber-ink truncate max-w-[140px]">{topDriver} ({topDriverDiff > 0 ? `+${topDriverDiff}` : topDriverDiff} kWh)</span>
          </div>
        </div>

        {/* KPI 4: Next Month Forecast */}
        <div className="p-5 rounded-2xl bg-card border border-border backdrop-blur-xl flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Next Month Forecast</span>
              <EstimatedChip confidence="Medium" size="sm" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              {forecastLow} – {forecastHigh} kWh
            </div>
            <span className="text-xs text-positive font-mono block mt-0.5">
              Est. Bill: ₹{forecastBillLow.toLocaleString("en-IN")} – {forecastBillHigh.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Current bill:</span>
            <span className="text-xs font-mono text-soft font-bold">₹{currentBillAmount.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Six Tabs Navigation matching §4 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto" aria-label="Electricity dashboard sections">
          <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
          <TabsTrigger value="this-vs-last" className="text-sm">This vs Last Month</TabsTrigger>
          <TabsTrigger value="appliances" className="text-sm">Appliances</TabsTrigger>
          <TabsTrigger value="forecast" className="text-sm">Forecast</TabsTrigger>
          <TabsTrigger value="report" className="text-sm">Monthly Report</TabsTrigger>
          <TabsTrigger value="recommendations" className="text-sm">Recommendations</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Recommendation Hero Card */}
            <div className="lg:col-span-2 p-6 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2 text-positive font-bold text-xs uppercase tracking-wider font-mono">
                    <Sparkles className="h-4 w-4" />
                    <span>Top Recommendation</span>
                  </div>
                  <EstimatedChip confidence="Medium" />
                </div>

                <h3 className="text-lg font-bold text-foreground mb-2">
                  Raise AC set-point from 24 °C to 26 °C
                </h3>
                <p className="text-xs text-soft leading-relaxed max-w-xl">
                  Raise AC set-point from 24 °C to 26 °C and activate sleep mode — may reduce{" "}
                  <strong className="text-positive font-mono">25–35 kWh (₹190–270)</strong> per month.
                </p>
              </div>

              <div className="pt-6 border-t border-border/60 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApplyToTwin("rec-ac-setpoint")}
                    className="bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-bold h-9 px-4 rounded-xl gap-2 shadow-lg shadow-primary/10"
                  >
                    <Box className="h-4 w-4" />
                    <span>Apply in Digital Twin</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMarkDone("rec-ac-setpoint")}
                    className={`text-xs h-9 px-4 rounded-xl border-border-strong ${
                      markedDone["rec-ac-setpoint"]
                        ? "bg-positive/20 text-positive border-positive/30"
                        : "bg-muted text-soft hover:bg-secondary"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5 text-positive" />
                    <span>{markedDone["rec-ac-setpoint"] ? "Completed" : "Mark as done"}</span>
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("recommendations")}
                  className="text-xs text-positive hover:text-positive font-semibold flex items-center gap-1"
                >
                  <span>See all recommendations</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Completeness Nudge Card */}
            <div className="p-6 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                  Calibration Confidence
                </span>
                <h4 className="text-sm font-bold text-foreground mb-2">
                  Profile 78 % complete
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add geyser and washing machine details to sharpen disaggregation and upgrade confidence to High.
                </p>

                <div className="mt-4 p-3 rounded-xl bg-muted/60 border border-border/60 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-soft">
                    <span>Bills connected:</span>
                    <span className="text-positive font-bold">12 months</span>
                  </div>
                  <div className="flex justify-between text-soft">
                    <span>Appliance detail:</span>
                    <span className="text-amber-ink font-bold">78 % (Medium)</span>
                  </div>
                  <div className="flex justify-between text-soft">
                    <span>Target for High:</span>
                    <span className="text-foreground">&ge; 80 % detail</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60 mt-4">
                <Link href="/citizen/setup/electricity">
                  <Button size="sm" className="w-full h-11 text-sm">
                    Sharpen Estimates &rarr;
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Seasonal Baseline Strip (12 bills >= 6) */}
          <div className="p-6 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">Seasonal Baseline Bands</h4>
                <p className="text-xs text-muted-foreground">
                  Calibrated across 12 billing cycles with historical weather pattern reconciliation.
                </p>
              </div>
              <span className="text-xs font-mono text-positive bg-positive/10 border border-positive/20 px-2.5 py-0.5 rounded-full">
                Normal Band Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-muted/60 border border-border/60">
                <span className="text-xs font-mono text-faint block uppercase">
                  Summer (Mar – Jun)
                </span>
                <span className="text-lg font-bold font-mono text-foreground">380 – 420 kWh</span>
                <span className="text-2xs text-faint block mt-1">High cooling duty cycle</span>
              </div>

              <div className="p-4 rounded-2xl bg-positive/10 border border-positive/40 shadow-inner">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-mono text-positive font-bold uppercase">
                    Normal (Jul – Oct) · CURRENT
                  </span>
                  <span className="h-2 w-2 rounded-full bg-positive animate-pulse" />
                </div>
                <span className="text-xl font-bold font-display text-foreground">320 – 350 kWh</span>
                <span className="text-2xs text-positive/80 block mt-1 font-mono">
                  September actual: 390 kWh (Above normal)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/60 border border-border/60">
                <span className="text-xs font-mono text-faint block uppercase">
                  Winter (Nov – Feb)
                </span>
                <span className="text-lg font-bold font-mono text-foreground">290 – 320 kWh</span>
                <span className="text-2xs text-faint block mt-1">Reduced cooling, higher geyser</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: THIS VS LAST MONTH */}
        <TabsContent value="this-vs-last" className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">Month-on-Month Variance Analysis</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Comparative disaggregation between August 2026 and September 2026.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-2xs font-mono text-faint uppercase block">Variance</span>
                  <span className="text-base font-bold font-mono text-amber-ink">+40 kWh (+11.4 %)</span>
                </div>
                <DeltaPill value={11.4} unit="%" invert={true} size="md" />
              </div>
            </div>

            {/* Big Compare Card */}
            <div className="p-5 rounded-2xl bg-muted/60 border border-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-2xs font-mono text-faint uppercase block">Previous Month (Aug 2026)</span>
                <span className="text-2xl font-bold font-display text-foreground">350 kWh</span>
                <span className="text-xs text-muted-foreground block font-mono">Billed: ₹2,850</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-ink font-mono font-bold text-xs">
                  &rarr;
                </div>
              </div>
              <div>
                <span className="text-2xs font-mono text-amber-ink uppercase block">Current Month (Sep 2026)</span>
                <span className="text-2xl font-bold font-display text-amber-ink">390 kWh</span>
                <span className="text-xs text-muted-foreground block font-mono">Billed: ₹3,120</span>
              </div>
            </div>

            {/* 6-Month Historical Series Bar/Line Representation */}
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 block">
                Historical 6-Month Monthly Trend (kWh)
              </span>
              <div className="grid grid-cols-6 gap-2 text-center text-xs font-mono">
                {[
                  { month: "Apr", kwh: 410, cost: "₹3,320", color: "bg-secondary text-foreground" },
                  { month: "May", kwh: 415, cost: "₹3,380", color: "bg-secondary text-foreground" },
                  { month: "Jun", kwh: 378, cost: "₹3,050", color: "bg-secondary text-foreground" },
                  { month: "Jul", kwh: 362, cost: "₹2,940", color: "bg-secondary text-foreground" },
                  { month: "Aug", kwh: 350, cost: "₹2,850", color: "bg-teal-500/20 text-teal-ink border border-teal-500/30" },
                  { month: "Sep", kwh: 390, cost: "₹3,120", color: "bg-amber-500/20 text-amber-ink border border-amber-500/40 font-bold" },
                ].map((m) => (
                  <div key={m.month} className={`p-3 rounded-xl ${m.color} flex flex-col justify-between`}>
                    <span className="text-2xs text-muted-foreground">{m.month}</span>
                    <span className="text-sm my-1">{m.kwh}</span>
                    <span className="text-2xs text-faint">{m.cost}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Possible Contributors (Worded as possibilities, never causes) */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-soft block">
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
                  <div key={c.title} className="p-3.5 rounded-xl bg-muted/60 border border-border/60 flex items-start justify-between text-xs">
                    <div>
                      <span className="font-semibold text-foreground block">{c.title}</span>
                      <span className="text-xs text-muted-foreground">{c.desc}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-ink shrink-0 ml-2">
                      {c.impact}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-faint italic pt-2">
                These are possible contributors based on your appliance profile and consumption history, not confirmed causes.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: APPLIANCES */}
        <TabsContent value="appliances" className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">Appliance-Level Disaggregation</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Calibrated mathematical estimation for Household H-1024.
                </p>
              </div>
              <EstimatedChip confidence="Medium" inputs={["12 bills", "78% appliance detail"]} />
            </div>

            {/* Table matching §4.3 verbatim */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-soft">
                <thead>
                  <tr className="border-b border-border text-faint font-mono text-xs">
                    <th className="pb-3 font-semibold">Appliance</th>
                    <th className="pb-3 text-right font-semibold">Aug (kWh)</th>
                    <th className="pb-3 text-right font-semibold">Sep (kWh)</th>
                    <th className="pb-3 text-right font-semibold">Change</th>
                    <th className="pb-3 text-right font-semibold">Detail Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-xs">
                  <tr className="hover:bg-muted/60">
                    <td className="py-3 font-sans font-medium text-foreground">Air conditioner (1.5 T, 3★)</td>
                    <td className="py-3 text-right text-soft">120</td>
                    <td className="py-3 text-right font-bold text-foreground">155</td>
                    <td className="py-3 text-right text-amber-ink font-bold">+35</td>
                    <td className="py-3 text-right">
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-positive/20 text-positive">High</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/60">
                    <td className="py-3 font-sans font-medium text-foreground">Ceiling fans (4)</td>
                    <td className="py-3 text-right text-soft">65</td>
                    <td className="py-3 text-right font-bold text-foreground">70</td>
                    <td className="py-3 text-right text-amber-ink font-bold">+5</td>
                    <td className="py-3 text-right">
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-positive/20 text-positive">High</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/60">
                    <td className="py-3 font-sans font-medium text-foreground">Refrigerator (260 L)</td>
                    <td className="py-3 text-right text-soft">46</td>
                    <td className="py-3 text-right font-bold text-foreground">46</td>
                    <td className="py-3 text-right text-faint">0</td>
                    <td className="py-3 text-right">
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-positive/20 text-positive">High</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/60">
                    <td className="py-3 font-sans font-medium text-foreground">Lighting (8 LED + 2 tube)</td>
                    <td className="py-3 text-right text-soft">29</td>
                    <td className="py-3 text-right font-bold text-foreground">29</td>
                    <td className="py-3 text-right text-faint">0</td>
                    <td className="py-3 text-right">
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-positive/20 text-positive">High</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/60">
                    <td className="py-3 font-sans font-medium text-foreground">Television</td>
                    <td className="py-3 text-right text-soft">20</td>
                    <td className="py-3 text-right font-bold text-foreground">20</td>
                    <td className="py-3 text-right text-faint">0</td>
                    <td className="py-3 text-right">
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-ink">Medium</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/60">
                    <td className="py-3 font-sans font-medium text-foreground">Other (kitchen, laptop, router, iron)</td>
                    <td className="py-3 text-right text-soft">48</td>
                    <td className="py-3 text-right font-bold text-foreground">50</td>
                    <td className="py-3 text-right text-amber-ink font-bold">+2</td>
                    <td className="py-3 text-right">
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-ink">Medium</span>
                    </td>
                  </tr>
                  <tr className="border-t border-border font-bold bg-muted/60">
                    <td className="py-3 font-sans text-foreground">Estimated total (Appliance sum)</td>
                    <td className="py-3 text-right text-foreground">328</td>
                    <td className="py-3 text-right text-positive">365</td>
                    <td className="py-3 text-right text-amber-ink">+37</td>
                    <td className="py-3 text-right text-2xs font-sans text-faint">Estimated</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* What Changed Card & Meter Reconciliation Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* What Changed Card */}
              <div className="p-5 rounded-2xl bg-muted/60 border border-border space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-ink block">
                  What Changed?
                </span>
                <p className="text-xs text-soft leading-relaxed">
                  Largest estimated contributor: <strong className="text-foreground">{topDriver} ({topDriverDiff > 0 ? `+${topDriverDiff}` : topDriverDiff} kWh)</strong>.
                  Possible reasons: seasonal weather variation, operating hours, or occupancy demand.
                </p>
                <div className="pt-2">
                  <Link href="/citizen/setup/electricity?step=2">
                    <span className="text-xs text-positive hover:text-positive font-medium">
                      Improve partial estimates &amp; appliance inventory &rarr;
                    </span>
                  </Link>
                </div>
              </div>

              {/* Meter Reconciliation Card */}
              <div className="p-5 rounded-2xl bg-muted/60 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-soft">
                    Meter Reconciliation
                  </span>
                  <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-secondary text-soft">
                    Billed: Measured
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-center text-xs py-1">
                  <div>
                    <span className="text-2xs text-faint block font-sans">Actual Meter</span>
                    <span className="font-bold text-foreground">{measuredKwh} kWh</span>
                  </div>
                  <div>
                    <span className="text-2xs text-faint block font-sans">Appliance Sum</span>
                    <span className="font-bold text-positive">{analysis.current.reconciliation.estimatedTotal} kWh</span>
                  </div>
                  <div>
                    <span className="text-2xs text-faint block font-sans">Unallocated</span>
                    <span className="font-bold text-amber-ink">
                      {analysis.current.reconciliation.unallocatedKwh} kWh ({measuredKwh > 0 ? Math.round((analysis.current.reconciliation.unallocatedKwh / measuredKwh) * 100) : 0} %)
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  Unallocated units may come from standby/phantom loads or usage variations. Estimates are never presented as measurements.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: FORECAST */}
        <TabsContent value="forecast" className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">October 2026 Demand &amp; Cost Forecast</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Multi-variable autoregressive projection calibrated for Raichur LT-2 tariff slabs.
                </p>
              </div>
              <EstimatedChip confidence="Medium" inputs={["50% current weight", "Oct seasonal 1.02"]} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-inset border border-border/60 space-y-2">
                <span className="text-xs font-mono text-positive uppercase tracking-wider block font-bold">
                  Next Month Demand Range
                </span>
                <div className="text-3xl font-extrabold font-display text-foreground">{forecastLow} – {forecastHigh} kWh</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Point estimate: <strong className="font-mono text-foreground">{Math.round((forecastLow + forecastHigh) / 2)} kWh</strong></span>
                  <span>•</span>
                  <span className="text-amber-ink font-mono font-medium">Expected change: {forecastLow > measuredKwh ? "+" : ""}{Math.round(((forecastLow - measuredKwh) / measuredKwh) * 100)} % to +{Math.round(((forecastHigh - measuredKwh) / measuredKwh) * 100)} %</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-inset border border-border/60 space-y-2">
                <span className="text-xs font-mono text-positive uppercase tracking-wider block font-bold">
                  Financial Bill Projection
                </span>
                <div className="text-3xl font-extrabold font-display text-positive">
                  ₹{forecastBillLow.toLocaleString("en-IN")} – {forecastBillHigh.toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 font-mono">
                  <span>Prev: ₹{analysis.previous?.bill ?? Math.round(measuredKwh * 7.5)}</span>
                  <span>&rarr;</span>
                  <span>Current: ₹{currentBillAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Why Drivers matching §4.4 */}
            <div className="p-5 rounded-2xl bg-muted/60 border border-border space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-soft font-bold block">
                Forecast Algorithm Drivers &amp; Weights
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-muted/60 border border-border/60">
                  <span className="text-2xs text-faint block font-sans">Current Month Weight</span>
                  <span className="font-bold text-foreground">50% ({measuredKwh} kWh)</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/60 border border-border/60">
                  <span className="text-2xs text-faint block font-sans">Last 3 Months Avg</span>
                  <span className="font-bold text-foreground">{Math.round(measuredKwh * 0.95)} kWh</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/60 border border-border/60">
                  <span className="text-2xs text-faint block font-sans">Same Month Last Year</span>
                  <span className="font-bold text-foreground">{measuredKwh + 8} kWh</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/60 border border-border/60">
                  <span className="text-2xs text-faint block font-sans">October Seasonal Factor</span>
                  <span className="font-bold text-positive">1.02</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/60 border border-border/60">
                  <span className="text-2xs text-faint block font-sans">Ward 24 Area Trend</span>
                  <span className="font-bold text-amber-ink">+1.0 %</span>
                </div>
              </div>
            </div>

            {/* Disclaimer Verbatim */}
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border/60 text-xs text-muted-foreground flex items-start gap-2">
              <Info className="h-4 w-4 text-faint shrink-0 mt-0.5" />
              <span>
                Estimated — actual bill may differ based on tariff, fixed charges, taxes and other billing components.
              </span>
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: MONTHLY REPORT */}
        <TabsContent value="report" className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl space-y-6 printable-report">
            {/* Report Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-positive font-bold block">
                  SAVERA Monthly Electricity Report
                </span>
                <h3 className="text-xl font-extrabold text-foreground mt-0.5">
                  Household {currentHouseholdId} · Statement of Consumption
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {household?.name ?? user?.name ?? "Resident"}, Ward 24, Raichur · Period: September 2026 · Generated: 25 Sep 2026
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-9 gap-2 border-border-strong bg-muted hover:bg-secondary text-xs text-foreground rounded-xl"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print / Save as PDF</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopySummary}
                  className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Share Summary</span>
                </Button>
              </div>
            </div>

            {/* 1. Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div className="p-4 rounded-xl bg-muted/60 border border-border/60">
                <span className="text-2xs text-faint uppercase block font-sans">Total Consumption</span>
                <span className="text-xl font-bold text-foreground">{measuredKwh} kWh</span>
                <span className="text-2xs text-positive block mt-0.5 font-sans">Measured</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/60 border border-border/60">
                <span className="text-2xs text-faint uppercase block font-sans">Billed Amount</span>
                <span className="text-xl font-bold text-foreground">₹{currentBillAmount.toLocaleString("en-IN")}</span>
                <span className="text-2xs text-faint block mt-0.5 font-sans">Domestic LT-2 · Demo tariff</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/60 border border-border/60">
                <span className="text-2xs text-faint uppercase block font-sans">vs Last Month</span>
                <span className="text-xl font-bold text-amber-ink">{momDiff > 0 ? `+${momDiff}` : momDiff} kWh</span>
                <span className="text-2xs text-amber-ink/80 block mt-0.5 font-sans">{momPct > 0 ? `+${momPct.toFixed(1)}` : momPct.toFixed(1)} %</span>
              </div>
              <div className="p-4 rounded-xl bg-muted/60 border border-border/60">
                <span className="text-2xs text-faint uppercase block font-sans">Baseline Range</span>
                <span className="text-xl font-bold text-foreground">{baselineLow}–{baselineHigh}</span>
                <span className="text-2xs text-positive block mt-0.5 font-sans">Normal Band</span>
              </div>
            </div>

            {/* 2. Baseline & Status */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-ink block">
                  Status: ⚠️ Above Normal Band (320–350 kWh)
                </span>
                <span className="text-soft">
                  Consumption is above your baseline band. Primary estimated contributor is Air Conditioner.
                </span>
              </div>
              <span className="text-amber-ink font-mono font-bold text-sm">+40 kWh</span>
            </div>

            {/* 3. Disaggregated Breakdown Table in Report */}
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 block font-bold">
                Appliance Disaggregation Breakdown (Estimated)
              </span>
              <div className="divide-y divide-border text-xs font-mono">
                <div className="py-2 flex justify-between">
                  <span className="text-soft font-sans">Air conditioner (1.5 T, 3★)</span>
                  <span className="font-bold text-foreground">155 kWh (+35 kWh)</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-soft font-sans">Ceiling fans (4 units)</span>
                  <span className="text-soft">70 kWh (+5 kWh)</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-soft font-sans">Refrigerator (260 L)</span>
                  <span className="text-soft">46 kWh</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-soft font-sans">Lighting fixtures</span>
                  <span className="text-soft">29 kWh</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-soft font-sans">Television &amp; Entertainment</span>
                  <span className="text-soft">20 kWh</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-soft font-sans">Other (kitchen, laptop, router, iron)</span>
                  <span className="text-soft">50 kWh (+2 kWh)</span>
                </div>
                <div className="py-2 flex justify-between text-amber-ink font-bold">
                  <span className="font-sans">Unallocated Meter Variance</span>
                  <span>25 kWh (6 %)</span>
                </div>
              </div>
            </div>

            {/* 4. Forecast & Top Recommendations */}
            <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-2 text-xs">
              <span className="font-bold text-foreground block">October 2026 Forecast &amp; Key Recommendations:</span>
              <p className="text-soft">
                Forecasted load: <strong className="text-foreground font-mono">405–430 kWh (₹3,250–3,500)</strong>
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 1. Raise AC set-point from 24 °C to 26 °C: save 25–35 kWh (₹190–270)</li>
                <li>• 2. Reduce fan hours by 2 h/day across 4 ceiling fans: save 15–20 kWh (₹110–150)</li>
                <li>• 3. Switch remaining tube lights to LED: save 6–9 kWh (₹45–70)</li>
              </ul>
            </div>

            {/* 5. Confidence Footer Verbatim */}
            <div className="pt-4 border-t border-border text-xs text-faint leading-relaxed font-mono">
              Confidence: Medium — based on 12 bills and 78 % appliance detail. Appliance-level figures are estimates reconciled to your meter reading; they are not measurements.
            </div>
          </div>
        </TabsContent>

        {/* TAB 6: RECOMMENDATIONS */}
        <TabsContent value="recommendations" className="space-y-6">
          <div className="space-y-4">
            {/* Hero Card: Biggest Opportunity matching §4.6 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-positive/30 bg-gradient-to-br from-positive/10 via-card to-teal-500/5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-positive uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Your Biggest Opportunity</span>
                </span>
                <EstimatedChip confidence="Medium" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-foreground">
                  Air Conditioner: Raise set-point 24 °C &rarr; 26 °C and use sleep mode
                </h3>
                <p className="text-xs sm:text-sm text-soft mt-1 leading-relaxed max-w-2xl">
                  Adjusting cooling thermostat by 2 °C reduces compressor load by approximately 18%. Combined with automatic night sleep mode, this may reduce{" "}
                  <strong className="text-positive font-mono font-bold">25–35 kWh (₹190–270)</strong> per month.
                </p>
              </div>

              <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-3">
                <Button
                  onClick={() => handleApplyToTwin("rec-ac-setpoint")}
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-10 px-6 gap-2 rounded-xl shadow-lg shadow-primary/10"
                >
                  <Box className="h-4 w-4" />
                  <span>Apply in Digital Twin</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => toggleMarkDone("rec-ac-setpoint")}
                  className={`w-full sm:w-auto text-xs h-10 px-6 rounded-xl border-border-strong ${
                    markedDone["rec-ac-setpoint"]
                      ? "bg-positive/20 text-positive border-positive/30"
                      : "bg-muted text-foreground hover:bg-secondary"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2 text-positive" />
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
                  className="p-5 rounded-2xl border border-border bg-card backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg hover:border-border-strong transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-8 w-8 rounded-xl bg-muted border border-border flex items-center justify-center font-mono font-bold text-xs text-positive shrink-0 mt-0.5">
                      {item.rank}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                        <span className="text-2xs font-mono px-2 py-0.5 rounded bg-positive/10 text-positive border border-positive/20">
                          {item.impact}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground max-w-xl">{item.action}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <Button
                      size="sm"
                      onClick={() => handleApplyToTwin(item.id)}
                      className="flex-1 sm:flex-initial bg-positive/15 hover:bg-positive/25 text-positive border border-positive/30 text-xs font-medium h-8 gap-1.5"
                    >
                      <Box className="h-3.5 w-3.5" />
                      <span>Simulate in Twin</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMarkDone(item.id)}
                      className={`text-xs h-8 px-3 ${
                        markedDone[item.id] ? "text-positive" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-faint italic pt-2">
              Note: Every recommendation uses &ldquo;may reduce&rdquo;; financial savings calculated via the marginal slab of the Raichur demo tariff; figures are illustrative estimates, never guaranteed.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
