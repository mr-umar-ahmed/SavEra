"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Flame, Layers, Table2, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { Button } from "@/components/ui/button";
import { GasSupplyAnomalySimulator } from "@/components/gas/GasSupplyAnomalySimulator";

export default function GovGasPage() {
  const [govView, setGovView] = React.useState<"scada_3d" | "planning">("scada_3d");

  const trend = [
    { month: "Jan 2026", demand: "50,000 kg", cylinders: 3521 },
    { month: "Feb 2026", demand: "53,000 kg", cylinders: 3732 },
    { month: "Mar 2026", demand: "56,000 kg", cylinders: 3943 },
    { month: "Apr 2026", demand: "58,000 kg", cylinders: 4084 },
    { month: "May 2026", demand: "60,000 kg", cylinders: 4225, projected: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="City Gas & LPG Distribution Intelligence"
        subtitle="City Gate Station telemetry, PE-100 distribution network integrity, and cylinder buffer allocations."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="normal" label="Distribution Nominal" />
            <span className="text-xs font-mono text-rose-ink font-bold">56,000 kg Monthly</span>
          </div>
        }
      />

      {/* View Switcher: 3D SCADA vs Planning */}
      <div className="flex items-center p-1 rounded-2xl bg-muted/80 border border-border w-fit shadow-sm">
        <button
          type="button"
          onClick={() => setGovView("scada_3d")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            govView === "scada_3d"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Flame className="size-3.5 text-amber-500" />
          <span>City Gas SCADA & 3D Loss Intelligence</span>
        </button>
        <button
          type="button"
          onClick={() => setGovView("planning")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            govView === "planning"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Table2 className="size-3.5 text-soft" />
          <span>LPG Quotas & Multi-Month Planning</span>
        </button>
      </div>

      {govView === "scada_3d" ? (
        <GasSupplyAnomalySimulator mode="gov" />
      ) : (
        <>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Current Month Consumption"
          value="56,000 kg"
          subtitle="All 24 municipal wards"
          badge={<StatusBadge status="normal" label="Tracked" />}
        />
        <KpiCard
          title="Predicted Demand"
          value="60,000 kg"
          subtitle="Next month projection (+7.1%)"
          badge={<EstimatedChip confidence="High" />}
        />
        <KpiCard
          title="Cylinder Quota"
          value="~4,437 Units"
          subtitle="Standard 14.2 kg domestic size"
          badge={<StatusBadge status="normal" label="Allocated" />}
        />
        <KpiCard
          title="Authorized Distributors"
          value="8 Agencies"
          subtitle="IOCL, BPCL, HPCL cells"
          badge={<StatusBadge status="complete" label="Online" />}
        />
      </div>

      {/* Multi-Month Demand Trend */}
      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl">
        <h3 className="text-base font-bold text-foreground mb-4">Multi-Month Municipal LPG Demand Trend</h3>

        <div className="divide-y divide-border font-mono text-xs">
          {trend.map((t, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between">
              <span className="font-sans text-soft">{t.month} {t.projected && <span className="text-rose-ink font-mono text-2xs">(Forecast)</span>}</span>
              <div className="flex items-center gap-6">
                <span className="text-foreground font-bold">{t.demand}</span>
                <span className="text-muted-foreground">{t.cylinders.toLocaleString()} cylinders</span>
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
