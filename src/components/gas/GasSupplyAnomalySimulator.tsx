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
  Download,
  Flame,
  Gauge,
  HelpCircle,
  Info,
  Layers,
  Lock,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Unlock,
  Waves,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  GAS_HARDWARE_SPECS,
  GasNetwork3D,
} from "./GasNetwork3D";
import { EstimatedChip, SimulationPrototypeBadge } from "@/components/ui/Chips";
import { Button } from "@/components/ui/button";
import {
  calculateGasBalance,
  convertScmToLpgKg,
  evaluateGasAnomaly,
  formatMbar,
  formatPpm,
  formatScmh,
  runPressureDecayTest,
} from "@/lib/engine/gas";
import type {
  GasAnomalyVerdict,
  GasComponentSpec,
  GasMeterTelemetry,
  GasPressureDecayResult,
} from "@/types/gas";
import { toast } from "sonner";

interface GasSupplyAnomalySimulatorProps {
  mode?: "citizen" | "supervisor" | "gov";
  initialScenario?: string;
}

export function GasSupplyAnomalySimulator({
  mode = "citizen",
  initialScenario = "scenario_normal",
}: GasSupplyAnomalySimulatorProps) {
  // Scenario state
  const [activeScenario, setActiveScenario] = useState<string>(initialScenario);
  const [selectedComponent, setSelectedComponent] =
    useState<GasComponentSpec | null>(GAS_HARDWARE_SPECS.smart_meter_png);

  // Authority / Citizen Baseline Controls
  const [baselineMonthlyScm, setBaselineMonthlyScm] = useState<number>(24.0);
  const [baselinePressureMbar, setBaselinePressureMbar] = useState<number>(21.0);
  const [isBaselineCommitted, setIsBaselineCommitted] = useState<boolean>(true);

  // Smart Valve Interactive Control
  const [valveState, setValveState] = useState<
    "open" | "throttled" | "closed_manual" | "closed_auto"
  >("open");

  // Re-Arming 30s Pressure Decay Test Modal State
  const [isTestingPressure, setIsTestingPressure] = useState<boolean>(false);
  const [testCountdown, setTestCountdown] = useState<number>(30);
  const [testResult, setTestResult] = useState<GasPressureDecayResult | null>(null);

  // Simulated Telemetry based on active scenario and baseline
  let instantFlowScmh = 0.28;
  let linePressureMbar = baselinePressureMbar;
  let methanePpm = 18;
  let drsInflowScmh = 10.0;
  let downstreamSumScmh = 9.8;
  let isStandby = false;
  const unattendedDurationMins = 0;

  if (activeScenario === "scenario_normal") {
    instantFlowScmh = 0.28;
    linePressureMbar = baselinePressureMbar;
    methanePpm = 18;
    drsInflowScmh = 10.0;
    downstreamSumScmh = 9.78;
  } else if (activeScenario === "scenario_micro_leak") {
    instantFlowScmh = 0.022; // continuous trace flow
    linePressureMbar = Number((baselinePressureMbar - 0.4).toFixed(1));
    methanePpm = 240; // above warning threshold
    drsInflowScmh = 10.0;
    downstreamSumScmh = 9.45;
    isStandby = true;
  } else if (activeScenario === "scenario_rupture") {
    instantFlowScmh = 1.95; // rapid surge
    linePressureMbar = 8.4; // severe collapse
    methanePpm = 680; // critical explosion threshold
    drsInflowScmh = 14.5;
    downstreamSumScmh = 8.2;
  } else if (activeScenario === "scenario_tamper") {
    instantFlowScmh = 0.15;
    linePressureMbar = baselinePressureMbar;
    methanePpm = 24;
    drsInflowScmh = 10.0;
    downstreamSumScmh = 8.9;
  } else if (activeScenario === "scenario_resolved") {
    instantFlowScmh = 0.28;
    linePressureMbar = baselinePressureMbar;
    methanePpm = 12;
    drsInflowScmh = 10.0;
    downstreamSumScmh = 9.95;
  }

  // Override flow if valve is shut
  if (valveState === "closed_manual" || valveState === "closed_auto") {
    instantFlowScmh = 0.0;
  }

  const currentTelemetry: GasMeterTelemetry = {
    meterId: "GM-ITRON-ULTRASONIC-4410",
    householdId: "h-1024",
    instantFlowScmh,
    instantFlowKgH: Number((instantFlowScmh * 0.76).toFixed(2)),
    cumulativeVolumeScm: 142.85,
    linePressureMbar,
    gasTemperatureC: 24.2,
    ambientMethanePpm: methanePpm,
    valveState,
    batteryPct: 95,
    rssiDbm: -82,
    status:
      activeScenario === "scenario_rupture"
        ? "burst_rupture"
        : activeScenario === "scenario_micro_leak"
        ? "micro_leak"
        : activeScenario === "scenario_tamper"
        ? "sensor_offline"
        : "normal",
    lastHeartbeat: "Just now",
  };

  const anomalyVerdict: GasAnomalyVerdict = evaluateGasAnomaly(currentTelemetry, {
    applianceStandby: isStandby,
    unattendedDurationMins,
  });

  const gasBalance = calculateGasBalance(drsInflowScmh, downstreamSumScmh);

  // Handler for Remote Valve Cutoff
  const handleToggleValve = () => {
    if (valveState === "open" || valveState === "throttled") {
      setValveState("closed_manual");
      toast.warning("Smart Solenoid Valve Closed: Household gas supply isolated.");
    } else {
      // Re-opening requires pressure integrity check
      triggerPressureTest();
    }
  };

  // Automated 30-Second Pressure Decay Test Protocol
  const triggerPressureTest = () => {
    setIsTestingPressure(true);
    setTestCountdown(3); // shortened for immediate prototype testing responsiveness
    setTestResult(null);

    const interval = setInterval(() => {
      setTestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishPressureTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finishPressureTest = () => {
    setIsTestingPressure(false);
    // If active scenario is leak, test fails; otherwise passes
    const decay = activeScenario === "scenario_micro_leak" ? 2.4 : 0.05;
    const result = runPressureDecayTest(baselinePressureMbar, baselinePressureMbar - decay);
    setTestResult(result);

    if (result.passed) {
      setValveState("open");
      toast.success(
        "✅ Pressure Decay Test PASSED (0.05 mbar drop). Smart Solenoid Valve Safely Re-Armed!"
      );
    } else {
      setValveState("closed_auto");
      toast.error(
        "❌ Pressure Decay Test FAILED (2.4 mbar drop). Open burner or leak suspected. Valve remains latched shut."
      );
    }
  };

  const handleCommitBaseline = () => {
    setIsBaselineCommitted(true);
    toast.success(
      `Gas baseline quota committed: ${baselineMonthlyScm.toFixed(
        1
      )} SCM/month · ${baselinePressureMbar.toFixed(1)} mbar. Historical continuity preserved.`
    );
  };

  const handleExportAudit = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      scenario: activeScenario,
      householdId: "h-1024",
      meterSerial: "GM-ITRON-ULTRASONIC-4410",
      drsSkid: "DRS-W24-FE-004",
      inflowScmh: drsInflowScmh,
      downstreamSumScmh,
      discrepancyScmh: gasBalance.discrepancyScmh,
      discrepancyPct: gasBalance.discrepancyPct,
      householdFlowScmh: instantFlowScmh,
      linePressureMbar,
      ambientMethanePpm: methanePpm,
      valvePosition: valveState,
      verdict: anomalyVerdict,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SAVERA_GAS_AUDIT_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SCADA gas audit telemetry exported successfully.");
  };

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border border-border bg-card/85 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">
              Smart Gas & PNG/LPG Supply, Metering & Anomaly Intelligence
            </h2>
            <SimulationPrototypeBadge />
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            Continuously monitors gas telemetry from City Gas Distribution (DRS Skid) → PE-100 Underground Mains → Building Service Riser → Smart Ultrasonic Gas Meter → Kitchen Manifold & Burners. Detects trace micro-leaks, prevents burst catastrophes, and automates 30-second pressure integrity testing before valve re-arm.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAudit}
            className="text-xs font-semibold gap-1.5 bg-card"
          >
            <Download className="size-3.5" />
            <span>Export SCADA Log</span>
          </Button>

          <Button
            variant={
              valveState === "open"
                ? "destructive"
                : "default"
            }
            size="sm"
            onClick={handleToggleValve}
            className="text-xs font-bold gap-1.5 shadow-sm"
          >
            {valveState === "open" ? (
              <>
                <Lock className="size-3.5" />
                <span>Emergency Cut-Off</span>
              </>
            ) : (
              <>
                <Unlock className="size-3.5" />
                <span>Re-Arm Gas Valve</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Scenario Control Switcher Bar */}
      <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-amber-500" />
            <span className="text-xs font-bold text-foreground">
              Interactive Test Scenarios
            </span>
            <span className="text-2xs font-mono text-muted-foreground">
              (Live physical simulation)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <EstimatedChip confidence={anomalyVerdict.confidence} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setActiveScenario("scenario_normal");
              setValveState("open");
            }}
            className={`p-3 rounded-xl border text-left transition-all text-xs ${
              activeScenario === "scenario_normal"
                ? "border-positive bg-positive/10 text-positive font-bold shadow-sm"
                : "border-border bg-card/50 text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              <span>1. Normal Cooking</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-1 font-normal">
              21.0 mbar · 0.28 SCMH · Clean blue flame
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveScenario("scenario_micro_leak");
              setValveState("open");
            }}
            className={`p-3 rounded-xl border text-left transition-all text-xs ${
              activeScenario === "scenario_micro_leak"
                ? "border-amber-500 bg-amber-500/10 text-amber-ink font-bold shadow-sm"
                : "border-border bg-card/50 text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-amber-ink" />
              <span>2. Trace Micro-Leak</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-1 font-normal">
              Continuous trace flow · 240 PPM sniffer
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveScenario("scenario_rupture");
              setValveState("closed_auto");
            }}
            className={`p-3 rounded-xl border text-left transition-all text-xs ${
              activeScenario === "scenario_rupture"
                ? "border-destructive bg-destructive/10 text-destructive font-bold shadow-sm"
                : "border-border bg-card/50 text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-destructive" />
              <span>3. Line Rupture Auto-Trip</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-1 font-normal">
              Pressure drops to 8 mbar · 250ms shutoff
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveScenario("scenario_tamper")}
            className={`p-3 rounded-xl border text-left transition-all text-xs ${
              activeScenario === "scenario_tamper"
                ? "border-amber-500 bg-amber-500/10 text-amber-ink font-bold shadow-sm"
                : "border-border bg-card/50 text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Radio className="size-3.5" />
              <span>4. Tamper / Signal Delay</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-1 font-normal">
              Packet delay · Failsafe protection
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveScenario("scenario_resolved");
              setValveState("open");
            }}
            className={`p-3 rounded-xl border text-left transition-all text-xs ${
              activeScenario === "scenario_resolved"
                ? "border-positive bg-positive/10 text-positive font-bold shadow-sm"
                : "border-border bg-card/50 text-foreground hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              <span>5. Verified & Re-Armed</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-1 font-normal">
              30s decay test passed · Loss reduced 100%
            </p>
          </button>
        </div>
      </div>

      {/* Dynamic Status / Anomaly Alert Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
          anomalyVerdict.severity === "critical"
            ? "border-destructive/60 bg-destructive/10"
            : anomalyVerdict.severity === "high"
            ? "border-amber-500/60 bg-amber-500/10"
            : "border-positive/50 bg-positive/10"
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${
                anomalyVerdict.severity === "critical"
                  ? "bg-destructive animate-ping"
                  : anomalyVerdict.severity === "high"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-positive"
              }`}
            />
            <h3 className="text-sm font-bold text-foreground">
              {anomalyVerdict.headline}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {anomalyVerdict.explanation}
          </p>
          <div className="pt-1.5 flex flex-wrap items-center gap-3 text-2xs font-mono text-muted-foreground">
            <span>
              Action Required:{" "}
              <strong className="text-foreground">
                {anomalyVerdict.recommendedAction}
              </strong>
            </span>
            {anomalyVerdict.requiresVerification && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-ink font-bold">
                Requires Verification
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1 text-right font-mono text-xs">
          <span className="text-2xs text-muted-foreground">Solenoid State</span>
          <span
            className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded text-2xs ${
              valveState === "open"
                ? "bg-positive/20 text-positive"
                : "bg-destructive/20 text-destructive"
            }`}
          >
            {valveState}
          </span>
        </div>
      </div>

      {/* Main 3D Interactive Spatial Gas Network View */}
      <GasNetwork3D
        scenario={activeScenario}
        selectedComponentId={selectedComponent?.id}
        onSelectComponent={setSelectedComponent}
        valveState={valveState}
        linePressureMbar={linePressureMbar}
        instantFlowScmh={instantFlowScmh}
        methanePpm={methanePpm}
      />

      {/* Live SCADA Telemetry Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-2xs font-mono uppercase tracking-wider">
              Instant Flow
            </span>
            <Flame className="size-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-foreground font-mono">
            {formatScmh(instantFlowScmh)}
          </p>
          <span className="text-2xs text-muted-foreground block font-mono">
            ~{convertScmToLpgKg(instantFlowScmh)} kg/h LPG Eq.
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-2xs font-mono uppercase tracking-wider">
              Line Pressure
            </span>
            <Gauge className="size-4 text-positive" />
          </div>
          <p
            className={`text-xl font-black font-mono ${
              linePressureMbar < 16 ? "text-destructive" : "text-foreground"
            }`}
          >
            {formatMbar(linePressureMbar)}
          </p>
          <span className="text-2xs text-muted-foreground block font-mono">
            Target: 21.0 mbar ± 2.0
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-2xs font-mono uppercase tracking-wider">
              Methane PPM
            </span>
            <ShieldAlert className="size-4 text-amber-500" />
          </div>
          <p
            className={`text-xl font-black font-mono ${
              methanePpm > 400
                ? "text-destructive"
                : methanePpm > 100
                ? "text-amber-ink"
                : "text-positive"
            }`}
          >
            {formatPpm(methanePpm)}
          </p>
          <span className="text-2xs text-muted-foreground block font-mono">
            Threshold: 500 PPM Trip
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-2xs font-mono uppercase tracking-wider">
              Cumulative Volume
            </span>
            <Layers className="size-4 text-muted-foreground" />
          </div>
          <p className="text-xl font-black text-foreground font-mono">
            142.8 SCM
          </p>
          <span className="text-2xs text-muted-foreground block font-mono">
            Billing Month to Date
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-2xs font-mono uppercase tracking-wider">
              Solenoid Valve
            </span>
            <Lock className="size-4 text-positive" />
          </div>
          <p
            className={`text-base font-bold font-mono uppercase tracking-wider mt-1 ${
              valveState === "open" ? "text-positive" : "text-destructive"
            }`}
          >
            {valveState}
          </p>
          <span className="text-2xs text-muted-foreground block font-mono">
            250ms Latch Actuator
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-2xs font-mono uppercase tracking-wider">
              LoRaWAN Link
            </span>
            <Radio className="size-4 text-positive" />
          </div>
          <p className="text-xl font-black text-foreground font-mono">
            -82 dBm
          </p>
          <span className="text-2xs text-muted-foreground block font-mono">
            95% Li-SOCl2 Battery
          </span>
        </div>
      </div>

      {/* Water & Gas Balance / Authority Baseline Quota Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: District Gas Balance Engine (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Sliders className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  District Gas Balance & Supply Reconciliation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Compares DRS Station Feeder inflow against downstream smart meter consumer sum.
                </p>
              </div>
            </div>
            <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded bg-muted border border-border">
              Ward 24 Sector 2
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">
                DRS Station Supply Feeder:
              </span>
              <strong className="text-foreground">{drsInflowScmh.toFixed(1)} SCMH</strong>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">
                Downstream Smart Meters Sum:
              </span>
              <strong className="text-foreground">{downstreamSumScmh.toFixed(2)} SCMH</strong>
            </div>
            <div className="flex items-center justify-between text-xs font-mono border-t border-border pt-2">
              <span className="text-muted-foreground">Discrepancy (Potential Loss):</span>
              <strong
                className={
                  gasBalance.discrepancyPct > 10 ? "text-destructive" : "text-positive"
                }
              >
                {gasBalance.discrepancyScmh.toFixed(2)} SCMH ({gasBalance.discrepancyPct}%)
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border text-2xs text-muted-foreground leading-relaxed">
              {gasBalance.message}
            </div>
          </div>
        </div>

        {/* Right: Authority Baseline Setting (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl border border-border bg-card space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-positive/10 border border-positive/30 flex items-center justify-center text-positive">
              <Gauge className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Household Baseline Quota & Pressure
              </h3>
              <p className="text-xs text-muted-foreground">
                Maintains historical continuity without resetting verified data.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Monthly Baseline Quota:</span>
                <strong className="text-foreground">{baselineMonthlyScm} SCM</strong>
              </div>
              <input
                type="range"
                min="12"
                max="40"
                step="1"
                value={baselineMonthlyScm}
                onChange={(e) => {
                  setBaselineMonthlyScm(Number(e.target.value));
                  setIsBaselineCommitted(false);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Regulator Pressure Setpoint:</span>
                <strong className="text-foreground">{baselinePressureMbar.toFixed(1)} mbar</strong>
              </div>
              <input
                type="range"
                min="18"
                max="25"
                step="0.5"
                value={baselinePressureMbar}
                onChange={(e) => {
                  setBaselinePressureMbar(Number(e.target.value));
                  setIsBaselineCommitted(false);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <Button
              variant="default"
              size="sm"
              disabled={isBaselineCommitted}
              onClick={handleCommitBaseline}
              className="w-full text-xs font-bold gap-1.5"
            >
              <CheckCircle2 className="size-3.5" />
              <span>{isBaselineCommitted ? "Baseline Active" : "Commit Baseline Settings"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Pressure Integrity Test Modal Overlay (When triggered) */}
      {isTestingPressure && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl border border-border bg-card shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="size-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Gauge className="size-7 animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">
                30-Second Static Pressure Decay Test
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Mandatory safety verification before re-arming smart solenoid valve. Measuring static pressure drop across residential piping.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-muted/60 border border-border">
              <div className="text-4xl font-black font-mono text-amber-500">
                {testCountdown}s
              </div>
              <span className="text-2xs text-muted-foreground font-mono mt-1 block">
                Testing Line Integrity at 21.0 mbar
              </span>
            </div>

            <p className="text-2xs text-muted-foreground italic">
              Please ensure all stove knobs and appliance cocks remain closed during this test.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
