"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Battery,
  CheckCircle2,
  Cpu,
  Droplet,
  ExternalLink,
  Gauge,
  HelpCircle,
  Info,
  Layers,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Waves,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  HARDWARE_SPECS,
  WaterComponentSpec,
  WaterNetwork3D,
} from "./WaterNetwork3D";
import { EstimatedChip, SimulationPrototypeBadge } from "@/components/ui/Chips";
import { Button } from "@/components/ui/button";
import { formatIN } from "@/lib/format";
import { toast } from "sonner";

interface WaterSupplyLossSimulatorProps {
  mode?: "citizen" | "supervisor" | "gov";
  initialScenario?: string;
}

export function WaterSupplyLossSimulator({
  mode = "supervisor",
  initialScenario = "scenario_normal",
}: WaterSupplyLossSimulatorProps) {
  // Scenario state
  const [activeScenario, setActiveScenario] = useState<string>(initialScenario);
  const [selectedComponent, setSelectedComponent] =
    useState<WaterComponentSpec | null>(HARDWARE_SPECS.smart_meter_1024);

  // Authority Baseline Controls
  // The water department can increase or decrease baseline quota / pressure setpoint
  // without losing baseline continuity or resetting verified historical records.
  const [baselineSupplyM3h, setBaselineSupplyM3h] = useState<number>(42.5);
  const [baselinePressureBar, setBaselinePressureBar] = useState<number>(3.4);
  const [tolerancePct, setTolerancePct] = useState<number>(5.0);
  const [isBaselineCommitted, setIsBaselineCommitted] = useState<boolean>(true);

  // Scenario telemetry computation
  let inflowRate = baselineSupplyM3h;
  let pressureReading = baselinePressureBar;
  let downstreamSum = 0;
  let lossDetected = false;
  let discrepancyState: "normal" | "possible_discrepancy" | "high_confidence_signal" =
    "normal";
  let discrepancyMsg = "✅ Water distribution appears normal.";
  let statusBannerTone: "positive" | "warning" | "critical" = "positive";

  if (activeScenario === "scenario_normal") {
    downstreamSum = Number((inflowRate * 0.965).toFixed(2));
    discrepancyState = "normal";
    discrepancyMsg = "✅ Water distribution appears normal.";
    statusBannerTone = "positive";
  } else if (activeScenario === "scenario_household_leak") {
    downstreamSum = Number((inflowRate * 0.955).toFixed(2));
    discrepancyState = "possible_discrepancy";
    discrepancyMsg =
      "⚠️ Water supply discrepancy detected. The measured water flow differs from the expected amount. Household H-1024 shows continuous night flow (18.5 L/min). Requires verification.";
    statusBannerTone = "warning";
  } else if (activeScenario === "scenario_pipeline_leak") {
    inflowRate = Number((baselineSupplyM3h * 1.08).toFixed(2));
    downstreamSum = Number((inflowRate * 0.707).toFixed(2)); // ~29.3% loss
    pressureReading = Number((baselinePressureBar * 0.62).toFixed(2)); // 2.1 bar drop
    lossDetected = true;
    discrepancyState = "high_confidence_signal";
    discrepancyMsg =
      "🚨 Repeated water loss signal detected. A repeated discrepancy (29.3%) has been detected on Branch A (XYZ Colony lateral). Pattern indicates possible pipeline/network water loss. Requires verification.";
    statusBannerTone = "critical";
  } else if (activeScenario === "scenario_sensor_offline") {
    downstreamSum = Number((inflowRate * 0.88).toFixed(2));
    discrepancyState = "possible_discrepancy";
    discrepancyMsg =
      "⚠️ Insufficient sensor data — Smart meter H-1026 has missed 3 LoRaWAN packets. Loss calculation suspended to prevent false alarm.";
    statusBannerTone = "warning";
  } else if (activeScenario === "scenario_resolved") {
    inflowRate = baselineSupplyM3h;
    downstreamSum = Number((inflowRate * 0.971).toFixed(2));
    discrepancyState = "normal";
    discrepancyMsg =
      "✅ Issue resolved. Post-resolution monitoring active: potential loss reduced by 90% (saving 13.5 m³/h). SAVERA is monitoring the network again.";
    statusBannerTone = "positive";
  }

  const discrepancyVolume = Math.max(0, Number((inflowRate - downstreamSum).toFixed(2)));
  const calculatedDiscrepancyPct = Number(
    ((discrepancyVolume / inflowRate) * 100).toFixed(1)
  );

  const handleCommitBaseline = () => {
    setIsBaselineCommitted(true);
    toast.success(
      `Water supply baseline updated: ${baselineSupplyM3h.toFixed(
        1
      )} m³/h · ${baselinePressureBar.toFixed(1)} bar. Historical continuity preserved.`
    );
  };

  return (
    <div className="space-y-8">
      {/* Header and Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border border-border bg-card/85 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">
              Smart Water Supply, Loss Detection & Leakage Intelligence
            </h2>
            <SimulationPrototypeBadge />
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            Measures water from Supplier Bulk Meter → Transmission Feeder → Branch Distribution → Household Smart Meters. Identifies possible water loss patterns and isolates pipeline or household issues without assuming unverified leaks.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <EstimatedChip confidence="high" />
        </div>
      </div>

      {/* 3D Meter-to-Meter Pipeline Network Stage */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Waves className="size-4 text-stream-water" />
            <span className="text-xs font-bold text-foreground font-mono">
              3D PHYSICAL SCADA TWIN · METER-TO-METER HYDRAULIC CONDUIT
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            Click any 3D node to inspect physical specifications & telemetry
          </span>
        </div>

        <WaterNetwork3D
          scenarioId={activeScenario}
          onSelectComponent={(spec) => setSelectedComponent(spec)}
          selectedComponentId={selectedComponent?.id}
          flowVelocityMultiplier={inflowRate / 38}
        />
      </div>

      {/* Water Balance Engine Comparison Card (Prompt Section 10 & 13) */}
      <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-stream-water/10 border border-stream-water/30 flex items-center justify-center text-stream-water">
              <Gauge className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Water Balance Engine — Comparative Analysis
              </h3>
              <p className="text-xs text-muted-foreground">
                Continuously balances zone inflow vs downstream metered sum over synchronized time windows.
              </p>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
              statusBannerTone === "positive"
                ? "bg-positive/10 border-positive/30 text-positive"
                : statusBannerTone === "warning"
                ? "bg-amber-ink/10 border-amber-ink/30 text-amber-ink"
                : "bg-destructive/10 border-destructive/30 text-destructive animate-pulse"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                statusBannerTone === "positive"
                  ? "bg-positive"
                  : statusBannerTone === "warning"
                  ? "bg-amber-ink"
                  : "bg-destructive"
              }`}
            />
            <span>
              {discrepancyState === "normal"
                ? "NORMAL DISTRIBUTION"
                : discrepancyState === "possible_discrepancy"
                ? "POSSIBLE DISCREPANCY"
                : "HIGH CONFIDENCE LOSS SIGNAL"}
            </span>
          </div>
        </div>

        {/* 4-KPI Comparative Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-border bg-muted/30 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Zone Bulk Inflow</span>
              <Activity className="size-3.5 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {inflowRate.toFixed(2)}{" "}
              <span className="text-xs font-normal text-muted-foreground">m³/h</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Siemens/ABB Electromagnetic Bulk Meter
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-muted/30 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Downstream Metered Sum</span>
              <CheckCircle2 className="size-3.5 text-positive" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {downstreamSum.toFixed(2)}{" "}
              <span className="text-xs font-normal text-muted-foreground">m³/h</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sum of 90 Smart Household Meters
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-muted/30 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Observed Discrepancy</span>
              <Droplet
                className={`size-3.5 ${
                  calculatedDiscrepancyPct > tolerancePct
                    ? "text-amber-ink"
                    : "text-positive"
                }`}
              />
            </div>
            <div
              className={`text-2xl font-bold font-mono ${
                calculatedDiscrepancyPct > tolerancePct
                  ? "text-amber-ink"
                  : "text-foreground"
              }`}
            >
              {discrepancyVolume.toFixed(2)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({calculatedDiscrepancyPct}%)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tolerance threshold: {tolerancePct}%
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-border bg-muted/30 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Supply Pressure</span>
              <Gauge className="size-3.5 text-stream-water" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {pressureReading.toFixed(2)}{" "}
              <span className="text-xs font-normal text-muted-foreground">bar</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Danfoss Piezoresistive Transmitter
            </p>
          </div>
        </div>

        {/* Explanatory Message Box adhering strictly to Prompt Section 13 */}
        <div
          className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
            statusBannerTone === "positive"
              ? "bg-positive/5 border-positive/30 text-foreground"
              : statusBannerTone === "warning"
              ? "bg-amber-ink/5 border-amber-ink/30 text-foreground"
              : "bg-destructive/5 border-destructive/30 text-foreground"
          }`}
        >
          <Info className="size-4 shrink-0 mt-0.5 text-primary" />
          <div className="space-y-1">
            <p className="font-bold">{discrepancyMsg}</p>
            <p className="text-muted-foreground text-[11px]">
              {statusBannerTone === "critical"
                ? "Status: Requires verification by municipal water field engineer. Automatic leak conclusions are forbidden until on-site pressure acoustic testing confirms physical pipe failure."
                : "Continuous flow, pressure, time alignment and network topology are combined to detect anomalies early without alarming citizens."}
            </p>
          </div>
        </div>
      </div>

      {/* Water Department Baseline Increase / Decrease Controls (Prompt Master Requirement) */}
      <div className="p-6 rounded-3xl border border-border bg-card/90 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sliders className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Water Department Baseline Management & Pressure Modulation
              </h3>
              <p className="text-xs text-muted-foreground">
                Increase or decrease the distribution baseline without losing historical continuity or resetting past consumption records.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleCommitBaseline}
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover text-xs rounded-xl shadow-sm"
          >
            <CheckCircle2 className="size-3.5" />
            <span>Commit Baseline to SCADA</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Baseline Supply Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Zone Inflow Quota (Baseline)
              </span>
              <span className="font-mono font-bold text-primary">
                {baselineSupplyM3h.toFixed(1)} m³/h
              </span>
            </div>
            <input
              type="range"
              min={32}
              max={56}
              step={0.5}
              value={baselineSupplyM3h}
              onChange={(e) => {
                setBaselineSupplyM3h(parseFloat(e.target.value));
                setIsBaselineCommitted(false);
              }}
              className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>32.0 m³/h (Rationing)</span>
              <span>42.5 m³/h (Standard)</span>
              <span>56.0 m³/h (Surge Peak)</span>
            </div>
          </div>

          {/* Baseline Pressure Setpoint */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Inlet Pressure Head Setpoint
              </span>
              <span className="font-mono font-bold text-primary">
                {baselinePressureBar.toFixed(2)} bar
              </span>
            </div>
            <input
              type="range"
              min={2.0}
              max={4.5}
              step={0.1}
              value={baselinePressureBar}
              onChange={(e) => {
                setBaselinePressureBar(parseFloat(e.target.value));
                setIsBaselineCommitted(false);
              }}
              className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>2.0 bar (Low gravity)</span>
              <span>3.4 bar (Design Head)</span>
              <span>4.5 bar (Booster High)</span>
            </div>
          </div>

          {/* Anomaly Tolerance Margin */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Permissible Loss Tolerance
              </span>
              <span className="font-mono font-bold text-primary">
                ±{tolerancePct.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min={3.0}
              max={10.0}
              step={0.5}
              value={tolerancePct}
              onChange={(e) => setTolerancePct(parseFloat(e.target.value))}
              className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>3% (Strict Acoustic DMA)</span>
              <span>5% (MoHUA Standard)</span>
              <span>10% (Legacy Network)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Scenario Demonstration Triggers (Prompt Section 45) */}
      <div className="p-6 rounded-3xl border border-border bg-card/85 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-teal-ink/10 border border-teal-ink/20 flex items-center justify-center text-teal-ink">
              <Activity className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Demonstration Simulation Scenarios (Master Prompt §45)
              </h3>
              <p className="text-xs text-muted-foreground">
                Trigger real-time network states to evaluate comparative analysis, localization and verification workflows.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setActiveScenario("scenario_normal")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeScenario === "scenario_normal"
                ? "border-positive bg-positive/10 shadow-sm"
                : "border-border bg-muted/40 hover:bg-card"
            }`}
          >
            <div className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-positive shrink-0" />
              <span>1. Normal Supply</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Inflow matches metered household consumption within 3.5% tolerance.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveScenario("scenario_household_leak")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeScenario === "scenario_household_leak"
                ? "border-amber-ink bg-amber-ink/10 shadow-sm"
                : "border-border bg-muted/40 hover:bg-card"
            }`}
          >
            <div className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-amber-ink shrink-0" />
              <span>2. Household Leak</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Household H-1024 registers continuous 18.5 L/min night draw.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveScenario("scenario_pipeline_leak")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeScenario === "scenario_pipeline_leak"
                ? "border-destructive bg-destructive/10 shadow-sm"
                : "border-border bg-muted/40 hover:bg-card"
            }`}
          >
            <div className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-destructive shrink-0" />
              <span>3. Pipeline Loss</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Branch A pressure drops to 2.1 bar with 29.3% network loss.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveScenario("scenario_sensor_offline")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeScenario === "scenario_sensor_offline"
                ? "border-muted-foreground bg-muted shadow-sm"
                : "border-border bg-muted/40 hover:bg-card"
            }`}
          >
            <div className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
              <Radio className="size-3.5 text-muted-foreground shrink-0" />
              <span>4. Sensor Delay</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              H-1026 LoRaWAN node offline; calculation safely suspended.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveScenario("scenario_resolved")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              activeScenario === "scenario_resolved"
                ? "border-positive bg-positive/10 shadow-sm"
                : "border-border bg-muted/40 hover:bg-card"
            }`}
          >
            <div className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-teal-ink shrink-0" />
              <span>5. Measure Again</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Repair verified; potential loss reduced by 90% (saving 13.5 m³/h).
            </p>
          </button>
        </div>
      </div>

      {/* Component Inspection Spec Sheet (Opens when any 3D node is clicked) */}
      {selectedComponent && (
        <div className="p-6 rounded-3xl border border-primary/30 bg-card shadow-md space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                  {selectedComponent.category.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  S/N: {selectedComponent.serialNumber}
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground mt-1">
                {selectedComponent.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {selectedComponent.manufacturer} · Model: {selectedComponent.model}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedComponent(null)}
              className="size-8 p-0 rounded-full"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <span className="text-muted-foreground font-mono text-[10px]">
                LOCATION
              </span>
              <div className="font-semibold text-foreground truncate">
                {selectedComponent.location}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <span className="text-muted-foreground font-mono text-[10px]">
                COMMUNICATION
              </span>
              <div className="font-semibold text-foreground flex items-center gap-1 truncate">
                <Radio className="size-3 text-positive shrink-0" />
                <span>{selectedComponent.communicationProtocol}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <span className="text-muted-foreground font-mono text-[10px]">
                CURRENT READING
              </span>
              <div className="font-mono font-bold text-foreground truncate">
                {selectedComponent.currentReading}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <span className="text-muted-foreground font-mono text-[10px]">
                STANDARDS
              </span>
              <div className="font-semibold text-foreground truncate">
                {selectedComponent.certification}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            {selectedComponent.description}
          </p>
        </div>
      )}

      {/* Named Hardware Component Directory Table / Cards */}
      <div className="p-6 rounded-3xl border border-border bg-card/80 space-y-4">
        <div className="flex items-center gap-2.5">
          <Cpu className="size-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">
            Physical Sensor & Metering Architecture (MoHUA Smart Water Standards)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {Object.values(HARDWARE_SPECS).map((comp) => (
            <div
              key={comp.id}
              onClick={() => setSelectedComponent(comp)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedComponent?.id === comp.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-muted/30 hover:border-border-strong hover:bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-foreground line-clamp-1">
                  {comp.name}
                </span>
                <span className="text-[10px] font-mono text-primary font-bold whitespace-nowrap">
                  {comp.flowRate}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                {comp.manufacturer} · {comp.model}
              </p>
              <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>{comp.communicationProtocol.split(" ")[0]}</span>
                <span>{comp.lastHeartbeat}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
