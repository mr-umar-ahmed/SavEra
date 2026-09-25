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
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-5 border-b border-border/80 pb-6 xl:flex-row xl:items-end">
        <div className="min-w-0">
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-3xl font-black text-foreground tracking-tight sm:text-4xl">
              My Home — Connected Simulation
            </h1>
            <SimulationPrototypeBadge />
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Simulate your household micro-grid, municipal water supply, and piped gas distribution in real time. Adjust appliance setpoints, test peak-load shifting, monitor meter-to-meter hydraulic distribution, and manage pipeline safety.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Multi-Utility Twin Mode Tabs: Electricity, Water, Gas */}
          <div
            role="tablist"
            aria-label="Twin utility"
            className="grid grid-cols-3 items-center gap-1 rounded-2xl border border-border bg-muted/80 p-1 sm:inline-flex sm:w-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={twinPortalTab === "electricity"}
              onClick={() => setTwinPortalTab("electricity")}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-all sm:px-3.5 sm:py-1.5 ${
                twinPortalTab === "electricity"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="size-3.5 shrink-0 text-amber-ink" />
              <span className="truncate sm:hidden">Electricity</span>
              <span className="hidden sm:inline">Electricity Micro-Grid</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={twinPortalTab === "water"}
              onClick={() => setTwinPortalTab("water")}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-all sm:px-3.5 sm:py-1.5 ${
                twinPortalTab === "water"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Waves className="size-3.5 shrink-0 text-stream-water" />
              <span className="truncate sm:hidden">Water</span>
              <span className="hidden sm:inline">Water SCADA & Losses</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={twinPortalTab === "gas"}
              onClick={() => setTwinPortalTab("gas")}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold transition-all sm:px-3.5 sm:py-1.5 ${
                twinPortalTab === "gas"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flame className="size-3.5 shrink-0 text-stream-lpg" />
              <span className="truncate sm:hidden">Gas</span>
              <span className="hidden sm:inline">Gas & LPG Network</span>
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
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-all hover:border-border-strong hover:bg-muted/60"
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
