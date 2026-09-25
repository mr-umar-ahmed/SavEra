"use client";

import { useState } from "react";
import { Droplet, Flame, Layers, MapPin, Zap } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

export default function GovHeatmapPage() {
  const [activeLayer, setActiveLayer] = useState<"water" | "electricity" | "lpg">("water");

  const wardStatuses = [
    { ward: "Ward 24 (Central West)", water: "danger", el: "warning", lpg: "warning", desc: "78 pressure drops · Feeder Line 4B" },
    { ward: "Ward 18 (North Sector)", water: "warning", el: "normal", lpg: "normal", desc: "Moderate water demand surge" },
    { ward: "Ward 11 (Industrial Feeder)", water: "normal", el: "normal", lpg: "normal", desc: "Stable commercial allocation" },
    { ward: "Ward 07 (South Residential)", water: "normal", el: "normal", lpg: "normal", desc: "Within seasonal baseline" },
    { ward: "Ward 03 (East Transit)", water: "normal", el: "warning", lpg: "normal", desc: "Evening peak cooling stress" },
    { ward: "Ward 14 (Old City Core)", water: "warning", el: "normal", lpg: "danger", desc: "High density cylinder turnover" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Municipal Multi-Utility GIS Heatmap"
        subtitle="Geographic stress index mapping across Raichur's 24 municipal wards and industrial zones."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="normal" label="GIS Layers Active" />
            <span className="text-xs font-mono text-muted-foreground">Raichur Spatial Matrix</span>
          </div>
        }
      />

      {/* Layer Switcher Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveLayer("water")}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${
            activeLayer === "water"
              ? "bg-teal-500/20 border-teal-500/40 text-teal-ink font-bold"
              : "bg-muted border-border text-soft"
          }`}
        >
          <Droplet className="h-4 w-4" />
          <span>Water Pressure & Scarcity Layer</span>
        </button>

        <button
          onClick={() => setActiveLayer("electricity")}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${
            activeLayer === "electricity"
              ? "bg-amber-500/20 border-amber-500/40 text-amber-ink font-bold"
              : "bg-muted border-border text-soft"
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>Grid Feeder Load Layer</span>
        </button>

        <button
          onClick={() => setActiveLayer("lpg")}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${
            activeLayer === "lpg"
              ? "bg-rose-500/20 border-rose-500/40 text-rose-ink font-bold"
              : "bg-muted border-border text-soft"
          }`}
        >
          <Flame className="h-4 w-4" />
          <span>LPG Cylinder Burn Rate Layer</span>
        </button>
      </div>

      {/* Ward Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {wardStatuses.map((w, idx) => {
          const tone = activeLayer === "water" ? w.water : activeLayer === "electricity" ? w.el : w.lpg;
          return (
            <div key={idx} className="p-5 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">{w.ward}</span>
                <StatusBadge
                  status={tone as "normal" | "warning" | "danger"}
                  label={tone === "danger" ? "Critical Stress" : tone === "warning" ? "Elevated" : "Normal"}
                />
              </div>
              <p className="text-xs text-muted-foreground">{w.desc}</p>
              <div className="pt-2 border-t border-border/60 flex justify-between text-xs text-faint font-mono">
                <span>Active Layer: {activeLayer.toUpperCase()}</span>
                <span>Raichur Municipal GIS</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
