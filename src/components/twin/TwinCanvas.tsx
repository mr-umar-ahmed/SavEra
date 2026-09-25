"use client";

import { Box, Layers, Sparkles } from "lucide-react";
import { useUiStore } from "@/stores/ui";
import { Twin2DFallback } from "./Twin2DFallback";
import { IsometricHouse3D } from "./IsometricHouse3D";
import { WhatIfScenarios } from "./WhatIfScenarios";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

interface TwinCanvasProps {
  title?: string;
  subtitle?: string;
  householdId?: string;
}

export function TwinCanvas({
  title = "My Home — Digital Twin Prototype",
  subtitle = "Interactive real-time simulation model of household electrical appliances",
  householdId = "H-1024",
}: TwinCanvasProps) {
  const twinMode = useUiStore((s) => s.twinMode);
  const toggleTwinMode = useUiStore((s) => s.toggleTwinMode);

  return (
    <div className="space-y-6">
      {/* Simulation Banner & Mode Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-card backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            <StatusBadge tone="info" label="Simulation Prototype" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subtitle} · Active Household: <strong className="text-foreground">{householdId}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTwinMode}
            className="h-9 gap-2 border-border bg-muted hover:bg-secondary text-xs text-foreground rounded-xl"
          >
            {twinMode === "3d" ? (
              <>
                <Box className="h-4 w-4 text-positive" />
                <span>View: 3D Isometric Floorplan</span>
              </>
            ) : (
              <>
                <Layers className="h-4 w-4 text-teal-ink" />
                <span>View: 2D Schematic Grid</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Visualizer Area */}
      {twinMode === "3d" ? <IsometricHouse3D /> : <Twin2DFallback />}

      {/* Interactive What-If Scenarios Suite */}
      <WhatIfScenarios />

      {/* Simulation Technical Disclaimer */}
      <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 text-xs text-muted-foreground flex items-center gap-3 backdrop-blur-md">
        <Sparkles className="h-5 w-5 text-positive shrink-0" />
        <span>
          SavEra Digital Twin Simulation Engine · Recalibrates active kW load, monthly kWh projection, and ₹ bill impact in real-time. Compatible with Matter, Zigbee, and OpenADR 2.0b demand flexibility protocols.
        </span>
      </div>
    </div>
  );
}
