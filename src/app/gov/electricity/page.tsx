"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Plus,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";
import { toast } from "sonner";

export default function GovElectricityPage() {
  const drEvents = useDataStore((s) => s.drEvents);
  const createDrEvent = useDataStore((s) => s.createDrEvent);

  const [creating, setCreating] = useState(false);
  const [targetMw, setTargetMw] = useState(25);
  const [windowStr, setWindowStr] = useState("18:00 – 21:00");

  const handleCreateDr = (e: React.FormEvent) => {
    e.preventDefault();
    createDrEvent({
      title: `ADR Peak Shaving Event (${targetMw} MW)`,
      windowStart: "2026-09-25T18:00:00Z",
      windowEnd: "2026-09-25T21:00:00Z",
      targetMw,
      areaIds: ["area-xyz", "area-abc"],
      wardIds: ["ward-24", "ward-18"],
      status: "scheduled",
      createdBy: "u-gov-electricity",
      flexibleLoads: ["ac", "water_heater", "ev_charger"],
      protectedLoads: ["fridge", "medical"],
    });
    setCreating(false);
    toast.success(`Automated Demand Response dispatched for ${targetMw} MW!`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="City Grid Operations & Automated Demand Response (ADR)"
        subtitle="City-wide load management, smart meter telemetry, and automated peak shedding coordination."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="normal" label="City Grid Nominal" />
            <span className="text-xs font-mono text-emerald-400 font-bold">842 MW Peak</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/gov/alerts?type=power">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-amber-400">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Publish Disruption Alert</span>
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setCreating(true)}
              className="h-8 gap-1.5 bg-amber-500 text-black hover:bg-amber-400 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create ADR Event</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Current City Load"
          value="842 MW"
          subtitle="920 MW Sanctioned Capacity"
          badge={<StatusBadge status="warning" label="Peak Hours" />}
        />
        <KpiCard
          title="ADR Averted Demand"
          value="14.2 MW"
          subtitle="Opt-in load shed"
          badge={<StatusBadge status="normal" label="Active" />}
        />
        <KpiCard
          title="Opted-In Habitats"
          value="18,450"
          subtitle="Flexible smart cooling"
          badge={<StatusBadge status="normal" label="Synced" />}
        />
        <KpiCard
          title="Protected Critical Loads"
          value="100%"
          subtitle="Hospitals, pumps, emergency"
          badge={<StatusBadge status="complete" label="Guaranteed" />}
        />
      </div>

      {creating && (
        <form onSubmit={handleCreateDr} className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] space-y-4">
          <h3 className="text-sm font-bold text-white">Dispatch Automated Demand Response (ADR) Event</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1">Target Reduction (MW)</label>
              <input
                type="number"
                value={targetMw}
                onChange={(e) => setTargetMw(parseInt(e.target.value) || 10)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1">Time Window</label>
              <input
                type="text"
                value={windowStr}
                onChange={(e) => setWindowStr(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)} className="text-xs text-white/60">
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-amber-500 text-black hover:bg-amber-400 text-xs font-bold">
              Dispatch ADR Signal
            </Button>
          </div>
        </form>
      )}

      {/* Active ADR Events List */}
      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl">
        <h3 className="text-sm font-bold text-white mb-4">Active & Scheduled Demand Response Events</h3>

        <div className="divide-y divide-white/5">
          {drEvents.map((ev) => (
            <div key={ev.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white font-mono">{ev.id}</span>
                  <StatusBadge status={ev.status === "active" ? "warning" : "complete"} label={ev.status.toUpperCase()} />
                </div>
                <p className="text-white/60">
                  Window: <span className="font-mono text-white">{ev.windowStart ? `${ev.windowStart.slice(11, 16)}–${ev.windowEnd.slice(11, 16)} UTC` : "Peak Period"}</span> · Target: <span className="font-mono text-amber-400 font-bold">{ev.targetMw} MW</span> · Scope: {ev.wardIds.length ? ev.wardIds.join(", ") : "City-wide"}
                </p>
              </div>

              <div className="flex items-center gap-4 font-mono">
                <div>
                  <span className="text-[10px] text-white/40 block">OPTED IN</span>
                  <span className="text-white font-bold">{ev.optedInHouseholds.toLocaleString()} homes</span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block">AVERTED</span>
                  <span className="text-emerald-400 font-bold">{ev.avertedMw.toFixed(1)} MW</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
