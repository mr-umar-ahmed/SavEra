"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AirVent,
  ArrowRight,
  BatteryCharging,
  Box,
  CheckCircle2,
  Cpu,
  Droplets,
  Fan,
  Flame,
  Layers,
  Leaf,
  Lightbulb,
  Moon,
  Power,
  Refrigerator,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Thermometer,
  Tv,
  Waves,
  Zap,
} from "lucide-react";
import { useTwinStore } from "@/stores/twinStore";
import { useUiStore } from "@/stores/ui";
import { ElectricityNetwork3D } from "./ElectricityNetwork3D";
import { IsometricHouse3D } from "./IsometricHouse3D";
import { Twin2DFallback } from "./Twin2DFallback";
import { EstimatedChip, SimulationPrototypeBadge } from "@/components/ui/Chips";
import { Button } from "@/components/ui/button";
import { formatIN } from "@/lib/format";

export interface ApplianceStrategy {
  id: string;
  applianceId: string;
  title: string;
  savingsRange: string;
  description: string;
  dutyCycleDetail: string;
  appliedCheck: (devices?: unknown) => boolean;
  apply: () => void;
  revert: () => void;
}

export default function DigitalTwinView() {
  const {
    devices,
    setAcTemp,
    toggleDevice,
    setDevice,
    applyApplianceStrategy,
    revertApplianceStrategy,
    appliedRecommendationIds,
    drReduced,
    setDrReduced,
    reset,
  } = useTwinStore();

  const twinMode = useUiStore((s) => s.twinMode);
  const toggleTwinMode = useUiStore((s) => s.toggleTwinMode);

  // Automation Policy Toggles
  const [autoOpenAdr, setAutoOpenAdr] = useState<boolean>(true);
  const [solarRouting, setSolarRouting] = useState<boolean>(true);
  const [vampireCutoff, setVampireCutoff] = useState<boolean>(true);
  const [geyserSchedule, setGeyserSchedule] = useState<boolean>(true);

  // Compute live micro-grid telemetry
  const activeLoadKw = devices.reduce(
    (acc, d) => acc + (d.on ? d.kw : 0),
    0
  );
  const dailyKwh = devices.reduce(
    (acc, d) => acc + (d.on ? d.kw * d.hoursPerDay : 0),
    0
  );
  const monthlyKwh = Math.round(dailyKwh * 30);
  // Estimate monthly ₹ under tiered slab (~₹7.2/kWh avg)
  const monthlyCostInr = Math.round(monthlyKwh * 7.2);
  const carbonMonthlyKg = Math.round(monthlyKwh * 0.82); // 0.82 kg CO2/kWh CEA factor
  const solarGenKw = solarRouting ? 2.4 : 0;
  const netGridKw = Math.max(0, activeLoadKw - solarGenKw);

  // Strategies for EVERY single appliance
  const strategies: ApplianceStrategy[] = [
    {
      id: "ac_26",
      applianceId: "ac",
      title: "Set Split AC setpoint to 26°C",
      savingsRange: "Save ₹280–₹340/mo",
      description:
        "Reduces duty cycle from 55% to 42%, lowering compressor workload by 38 kWh/mo.",
      dutyCycleDetail: "Active setpoint: 26°C · Baseline was 24°C",
      appliedCheck: () =>
        devices.ac?.tempC === 26 ||
        devices.ac?.setpointC === 26 ||
        appliedRecommendationIds.includes("ac_26"),
      apply: () => {
        setAcTemp(26);
        applyApplianceStrategy("ac_26");
      },
      revert: () => {
        setAcTemp(24);
        revertApplianceStrategy("ac_26");
      },
    },
    {
      id: "geyser_standby",
      applianceId: "geyser",
      title: "Deactivate Water Geyser daytime standby",
      savingsRange: "Save ₹190–₹230/mo",
      description:
        "2.0 kW heating element eliminated from daytime standby, preventing cyclic thermal loss.",
      dutyCycleDetail:
        "Standby power eliminated · Relays auto-fire at 06:30 & 19:00",
      appliedCheck: () =>
        !devices.geyser?.on || appliedRecommendationIds.includes("geyser_standby"),
      apply: () => {
        if (devices.geyser?.on) toggleDevice("geyser");
        applyApplianceStrategy("geyser_standby");
      },
      revert: () => {
        if (!devices.geyser?.on) toggleDevice("geyser");
        revertApplianceStrategy("geyser_standby");
      },
    },
    {
      id: "fridge_eco",
      applianceId: "fridge",
      title: "Activate Inverter Eco-Mode & Defrost Shift",
      savingsRange: "Save ₹130–₹170/mo",
      description:
        "Modulates compressor RPM to 1,100 during night hours and shifts cyclic defrost to 02:00 off-peak.",
      dutyCycleDetail: "Eco-inverter curve active · Draw lowered from 65W to 50W",
      appliedCheck: () =>
        devices.fridge?.kw <= 0.05 ||
        appliedRecommendationIds.includes("fridge_eco"),
      apply: () => applyApplianceStrategy("fridge_eco"),
      revert: () => revertApplianceStrategy("fridge_eco"),
    },
    {
      id: "fan_bldc",
      applianceId: "fan",
      title: "Simulate BLDC 28W Motor Conversion",
      savingsRange: "Save ₹220–₹270/mo",
      description:
        "Replaces 75W induction motors with 28W brushless DC motors, saving 47W per fan across 8h daily runtime.",
      dutyCycleDetail:
        "BLDC profile active · Total fan bank load reduced from 300W to 110W",
      appliedCheck: () =>
        devices.fan?.kw <= 0.15 || appliedRecommendationIds.includes("fan_bldc"),
      apply: () => applyApplianceStrategy("fan_bldc"),
      revert: () => revertApplianceStrategy("fan_bldc"),
    },
    {
      id: "lights_harvesting",
      applianceId: "lights",
      title: "Enable Daylight Harvesting & 40% Dimming",
      savingsRange: "Save ₹85–₹110/mo",
      description:
        "Auto-calibrates ambient perimeter lumens, dropping daytime ballast consumption from 80W to 45W.",
      dutyCycleDetail:
        "Photocell sensing enabled · Daylight window dimmed to 40%",
      appliedCheck: () =>
        devices.lights?.kw <= 0.05 ||
        appliedRecommendationIds.includes("lights_harvesting"),
      apply: () => applyApplianceStrategy("lights_harvesting"),
      revert: () => revertApplianceStrategy("lights_harvesting"),
    },
    {
      id: "tv_vampire",
      applianceId: "tv",
      title: "Smart Multi-Plug Vampire Power Cut",
      savingsRange: "Save ₹75–₹95/mo",
      description:
        "Cuts 18W phantom draw from soundbar, set-top box, and console when TV enters standby.",
      dutyCycleDetail:
        "Smart relay triggers deep sleep when media draw drops below 25W",
      appliedCheck: () => appliedRecommendationIds.includes("tv_vampire"),
      apply: () => applyApplianceStrategy("tv_vampire"),
      revert: () => revertApplianceStrategy("tv_vampire"),
    },
    {
      id: "washer_solar",
      applianceId: "washing_machine",
      title: "Shift Wash Cycle to Solar Generation Window",
      savingsRange: "Save ₹140–₹185/mo",
      description:
        "Schedules 45-minute 1.2 kW laundry runs to 12:30 PM peak solar curve instead of 19:30 evening grid peak.",
      dutyCycleDetail: "Scheduled for 12:30 PM solar window · 100% self-powered",
      appliedCheck: () => appliedRecommendationIds.includes("washer_solar"),
      apply: () => applyApplianceStrategy("washer_solar"),
      revert: () => revertApplianceStrategy("washer_solar"),
    },
    {
      id: "pump_automation",
      applianceId: "water_pump",
      title: "Hydro-Pneumatic Cutoff & Tank Level Automation",
      savingsRange: "Save ₹170–₹220/mo",
      description:
        "Stops 750W cavitation dry-runs; ultrasonic sensor cuts pump runtime to exactly 22 minutes per refill.",
      dutyCycleDetail:
        "OHT ultrasonic level sync · Cavitation protection enabled",
      appliedCheck: () => appliedRecommendationIds.includes("pump_automation"),
      apply: () => applyApplianceStrategy("pump_automation"),
      revert: () => revertApplianceStrategy("pump_automation"),
    },
    {
      id: "ev_offpeak",
      applianceId: "ev_charger",
      title: "Time-of-Day (ToD) Off-Peak Scheduled Charging",
      savingsRange: "Save ₹480–₹620/mo",
      description:
        "Locks 3.3 kW Level-2 charging to 01:00–05:00 ToD rebate tariff slot (₹4.10/kWh vs ₹8.20/kWh peak).",
      dutyCycleDetail: "Charging window locked to 01:00–05:00 AM off-peak ToD",
      appliedCheck: () => appliedRecommendationIds.includes("ev_offpeak"),
      apply: () => applyApplianceStrategy("ev_offpeak"),
      revert: () => revertApplianceStrategy("ev_offpeak"),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Simulation Controls Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl border border-border bg-card/80 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              Micro-Grid Simulation Stage
            </h2>
            <SimulationPrototypeBadge />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time physical telemetry sync · Household H-1024 · 3D Physical Micro-Grid SCADA
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTwinMode}
            className="h-9 gap-2 border-border bg-muted hover:bg-secondary text-xs text-foreground rounded-xl"
          >
            {twinMode === "3d" ? (
              <>
                <Box className="size-4 text-positive" />
                <span>3D Physical SCADA Twin</span>
              </>
            ) : (
              <>
                <Layers className="size-4 text-teal-ink" />
                <span>2D Schematic Grid</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="h-9 gap-1.5 border-border bg-muted hover:bg-secondary text-xs text-muted-foreground hover:text-foreground rounded-xl"
            title="Reset Simulation State"
          >
            <RefreshCw className="size-3.5" />
            <span>Reset Twin</span>
          </Button>
        </div>
      </div>

      {/* Main 3D / 2D View Stage */}
      <div className="rounded-3xl border border-border bg-card/60 overflow-hidden shadow-lg">
        {twinMode === "3d" ? <ElectricityNetwork3D /> : <Twin2DFallback />}
      </div>

      {/* Real-Time Micro-Grid Live Telemetry HUD */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">Active Load</span>
            <Zap className="size-3.5 text-amber-ink" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            {activeLoadKw.toFixed(2)}{" "}
            <span className="text-xs font-normal text-muted-foreground">kW</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Net Grid: <strong className="text-foreground">{netGridKw.toFixed(2)} kW</strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">Daily Simulated</span>
            <Sparkles className="size-3.5 text-teal-ink" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            {dailyKwh.toFixed(1)}{" "}
            <span className="text-xs font-normal text-muted-foreground">kWh/day</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Projected: <strong className="text-foreground">{monthlyKwh} kWh/mo</strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">Projected Bill</span>
            <span className="text-xs font-bold text-positive font-mono">₹</span>
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            ₹{formatIN(monthlyCostInr)}
          </div>
          <div className="text-[11px] text-positive font-medium">
            Tier-3 BESCOM Tariff
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">Rooftop Solar</span>
            <Sun className="size-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {solarGenKw.toFixed(1)}{" "}
            <span className="text-xs font-normal text-muted-foreground">kW</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Offsets <strong className="text-positive">38%</strong> of daytime load
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-1 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">Carbon Index</span>
            <Leaf className="size-3.5 text-positive" />
          </div>
          <div className="text-xl font-bold font-mono text-foreground">
            {carbonMonthlyKg}{" "}
            <span className="text-xs font-normal text-muted-foreground">kg CO₂e</span>
          </div>
          <div className="text-[11px] text-positive font-medium">
            Green Score Tier: Gold
          </div>
        </div>
      </div>

      {/* Connected Appliance Automation & Micro-Grid Policies */}
      <div className="p-6 rounded-3xl border border-border bg-card/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Cpu className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Automated Demand Response & Smart Rules
              </h3>
              <p className="text-xs text-muted-foreground">
                Autonomous micro-grid policy dispatching via Matter, Zigbee & OpenADR 2.0b
              </p>
            </div>
          </div>
          <EstimatedChip confidence="high" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div
            onClick={() => setAutoOpenAdr(!autoOpenAdr)}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              autoOpenAdr
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-muted/30 opacity-75"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-foreground">
                OpenADR Peak Shifting
              </span>
              <span
                className={`size-2 rounded-full ${
                  autoOpenAdr ? "bg-positive animate-pulse" : "bg-muted-foreground"
                }`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Auto-sheds flexible loads during DISCOM peak tariff hours (18:00–21:00).
            </p>
          </div>

          <div
            onClick={() => setSolarRouting(!solarRouting)}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              solarRouting
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-muted/30 opacity-75"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-foreground">
                Solar Self-Consumption
              </span>
              <span
                className={`size-2 rounded-full ${
                  solarRouting ? "bg-positive animate-pulse" : "bg-muted-foreground"
                }`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Channels rooftop surplus directly to washer and EV charger before export.
            </p>
          </div>

          <div
            onClick={() => setGeyserSchedule(!geyserSchedule)}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              geyserSchedule
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-muted/30 opacity-75"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-foreground">
                Geyser Standby Intercept
              </span>
              <span
                className={`size-2 rounded-full ${
                  geyserSchedule ? "bg-positive animate-pulse" : "bg-muted-foreground"
                }`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Disconnects heating element from midday standby; pre-heats at 06:00.
            </p>
          </div>

          <div
            onClick={() => setVampireCutoff(!vampireCutoff)}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              vampireCutoff
                ? "border-primary/40 bg-primary/5"
                : "border-border bg-muted/30 opacity-75"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-foreground">
                Vampire Load Auto-Kill
              </span>
              <span
                className={`size-2 rounded-full ${
                  vampireCutoff ? "bg-positive animate-pulse" : "bg-muted-foreground"
                }`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Cuts phantom standby draw on TV consoles, microwave, and chargers.
            </p>
          </div>
        </div>
      </div>

      {/* Actionable Strategy Bridge: Apply AI Recommendations to Simulation */}
      <div className="p-6 rounded-3xl border border-border bg-card/90 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-positive/10 border border-positive/30 flex items-center justify-center text-positive">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Apply AI Recommendations to Simulation
              </h3>
              <p className="text-xs text-muted-foreground">
                Simulate targeted efficiency interventions across every appliance and observe live micro-grid bill impact.
              </p>
            </div>
          </div>
          <EstimatedChip confidence="high" />
        </div>

        {/* Full Grid of Appliance Simulation Strategies */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {strategies.map((strat) => {
            const isApplied = strat.appliedCheck(devices);
            return (
              <div
                key={strat.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isApplied
                    ? "border-positive/50 bg-positive/5 shadow-sm"
                    : "border-border bg-muted/40 hover:border-border-strong hover:bg-card"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-foreground leading-snug">
                      {strat.title}
                    </h4>
                    <span className="text-[10px] text-positive font-mono font-bold bg-positive/10 px-2 py-0.5 rounded-full border border-positive/20 whitespace-nowrap shrink-0">
                      {strat.savingsRange}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {strat.description}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/80 pt-1">
                    {strat.dutyCycleDetail}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border/40">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    {strat.applianceId.replace("_", " ")}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (isApplied) {
                        strat.revert();
                      } else {
                        strat.apply();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isApplied
                        ? "bg-positive/20 text-positive border border-positive/40 hover:bg-positive/30"
                        : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle2 className="size-3.5" />
                        <span>Applied</span>
                      </>
                    ) : (
                      <>
                        <Zap className="size-3.5" />
                        <span>Simulate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
