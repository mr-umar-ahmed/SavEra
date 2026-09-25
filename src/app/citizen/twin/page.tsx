"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DigitalTwinView from "@/components/twin/DigitalTwinView";
import { WaterSupplyLossSimulator } from "@/components/water/WaterSupplyLossSimulator";
import { GasSupplyAnomalySimulator } from "@/components/gas/GasSupplyAnomalySimulator";
import { SimulationPrototypeBadge, EstimatedChip } from "@/components/ui/Chips";
import { useTwinStore } from "@/stores/twinStore";
import {
  ArrowRight,
  CheckCircle2,
  Droplets,
  Flame,
  Layers,
  Sparkles,
  Waves,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CitizenTwinPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground font-mono text-xs">Loading Digital Twin...</div>}>
      <CitizenTwinContent />
    </Suspense>
  );
}

function CitizenTwinContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "electricity" | "water" | "gas") || "electricity";

  const { setAcTemp, toggleDevice, devices } = useTwinStore();
  const [twinPortalTab, setTwinPortalTab] = useState<"electricity" | "water" | "gas">(
    initialTab === "water" ? "water" : initialTab === "gas" ? "gas" : "electricity"
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "water" || tabParam === "gas" || tabParam === "electricity") {
      setTwinPortalTab(tabParam);
    }
  }, [searchParams]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 font-mono">
            <Link
              href="/citizen"
              className="hover:text-foreground transition-colors"
            >
              Citizen Portal
            </Link>
            <span>/</span>
            <span className="text-positive font-bold">Digital Twin</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              My Home — Connected Simulation
            </h1>
            <SimulationPrototypeBadge />
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Simulate your household micro-grid, municipal water supply, and piped gas distribution in real time. Adjust appliance setpoints, test peak-load shifting, monitor meter-to-meter hydraulic distribution, and manage pipeline safety.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Multi-Utility Twin Mode Tabs: Electricity, Water, Gas */}
          <div className="flex items-center p-1 rounded-2xl bg-muted/80 border border-border">
            <button
              type="button"
              onClick={() => setTwinPortalTab("electricity")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                twinPortalTab === "electricity"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="size-3.5 text-amber-ink" />
              <span>Electricity Micro-Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setTwinPortalTab("water")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                twinPortalTab === "water"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Waves className="size-3.5 text-stream-water" />
              <span>Water SCADA & Losses</span>
            </button>
            <button
              type="button"
              onClick={() => setTwinPortalTab("gas")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                twinPortalTab === "gas"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flame className="size-3.5 text-amber-500" />
              <span>Gas & LPG Network</span>
            </button>
          </div>

          <Link
            href={
              twinPortalTab === "electricity"
                ? "/citizen/electricity"
                : twinPortalTab === "water"
                ? "/citizen/water"
                : "/citizen/gas"
            }
            className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:border-border-strong hover:bg-muted/60 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>
              {twinPortalTab === "electricity"
                ? "Electricity Dashboard"
                : twinPortalTab === "water"
                ? "Water Portal"
                : "Gas & LPG Dashboard"}
            </span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Digital Twin Simulator Component */}
      {twinPortalTab === "electricity" ? (
        <DigitalTwinView />
      ) : twinPortalTab === "water" ? (
        <WaterSupplyLossSimulator mode="citizen" />
      ) : (
        <GasSupplyAnomalySimulator mode="citizen" />
      )}
    </div>
  );
}
