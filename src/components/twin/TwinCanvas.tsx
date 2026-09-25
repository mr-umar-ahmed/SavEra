"use client";

import { useState } from "react";
import { Box, Layers, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { useUiStore } from "@/stores/ui";
import { Twin2DFallback } from "./Twin2DFallback";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

interface TwinCanvasProps {
  title?: string;
  subtitle?: string;
}

export function TwinCanvas({
  title = "My Home — Digital Twin Prototype",
  subtitle = "Interactive real-time simulation model of household electrical appliances",
}: TwinCanvasProps) {
  const twinMode = useUiStore((s) => s.twinMode);
  const toggleTwinMode = useUiStore((s) => s.toggleTwinMode);

  return (
    <div className="space-y-4">
      {/* Simulation Banner & Mode Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-inset backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            <StatusBadge tone="info" label="Simulation" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTwinMode}
            className="h-8 gap-2 border-border bg-muted hover:bg-secondary text-xs text-foreground"
          >
            {twinMode === "3d" ? <Box className="h-3.5 w-3.5 text-positive" /> : <Layers className="h-3.5 w-3.5 text-teal-ink" />}
            <span>Mode: {twinMode.toUpperCase()}</span>
          </Button>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <Twin2DFallback />

      {/* Simulation Legal/Technical Disclaimer */}
      <div className="rounded-xl border border-border/60 bg-muted/60 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-positive shrink-0" />
        <span>
          Digital Twin Prototype (Simulation). Changes here adjust projected kWh and ₹ models in real-time. Compatible with simulated smart loads and standard OpenADR / Matter control profiles.
        </span>
      </div>
    </div>
  );
}
