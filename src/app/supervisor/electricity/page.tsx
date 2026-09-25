"use client";

import { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataStore } from "@/stores/data";
import { toast } from "sonner";

export default function SupervisorElectricityPage() {
  const pushBroadcast = useDataStore((s) => s.pushBroadcast);
  const [activeTab, setActiveTab] = useState("grid-ops");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastType, setBroadcastType] = useState("Standard Advisory (Push)");
  const [sending, setSending] = useState(false);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;

    setSending(true);
    setTimeout(() => {
      pushBroadcast({
        channel: "push",
        type: broadcastType,
        message: broadcastMsg,
        areaIds: ["area-xyz", "area-abc"],
        wardIds: ["ward-24"],
        by: "u-supervisor-24",
      });
      setSending(false);
      setBroadcastMsg("");
      toast.success("Push broadcast dispatched to Ward 24 residents!");
    }, 800);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grid Operations & Ward Electricity Management"
        subtitle="Live telemetry from Raichur power grid sub-stations, feeder sensor matrices, and demand response."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-positive animate-ping" />
            <span className="text-xs font-mono text-positive font-bold">LIVE TELEMETRY FEED</span>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="grid-ops">Grid Operations & Sub-Stations</TabsTrigger>
          <TabsTrigger value="ward-households">Ward 24 Aggregate & Heatmap</TabsTrigger>
        </TabsList>

        {/* Tab 1: Grid Operations */}
        <TabsContent value="grid-ops" className="space-y-6">
          {/* Exact KPI values from spec */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Active Smart Meters"
              value="45,230"
              subtitle="Network Uptime 99.9%"
              badge={<StatusBadge status="normal" label="99.9% Uptime" />}
            />

            <KpiCard
              title="Peak Demand (Raichur)"
              value="842 MW"
              subtitle="+12% from seasonal baseline"
              badge={<StatusBadge status="warning" label="Peak Alert" />}
            />

            <KpiCard
              title="Load Shedding Averted"
              value="14.2 MW"
              subtitle="Averted via Smart Automated DR"
              badge={<StatusBadge status="normal" label="Zero Outages" />}
            />

            <KpiCard
              title="Alerts Dispatched"
              value="1,247"
              subtitle="Dispatched in last 24 hours"
              badge={<StatusBadge status="normal" label="Active Sync" />}
            />
          </div>

          {/* Regional Sensor Matrix */}
          <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-foreground mb-4">Regional Sub-Station Sensor Matrix</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>North Sub-Station</span>
                  <span className="text-amber-ink font-mono">70% LOAD</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-tone-moderate rounded-full" style={{ width: "70%" }} />
                </div>
                <span className="text-2xs text-amber-ink font-medium block">Status: MODERATE</span>
              </div>

              <div className="p-4 rounded-xl border border-positive/30 bg-positive/5 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>South Sector Feeder</span>
                  <span className="text-positive font-mono">45% LOAD</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-positive rounded-full" style={{ width: "45%" }} />
                </div>
                <span className="text-2xs text-positive font-medium block">Status: STABLE</span>
              </div>

              <div className="p-4 rounded-xl border border-positive/30 bg-positive/5 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>Industrial Zone 1</span>
                  <span className="text-positive font-mono">60% LOAD</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-positive rounded-full" style={{ width: "60%" }} />
                </div>
                <span className="text-2xs text-positive font-medium block">Status: STABLE</span>
              </div>

              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>Rural Feeder A</span>
                  <span className="text-cyan-ink font-mono">30% LOAD</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-tone-optimal rounded-full" style={{ width: "30%" }} />
                </div>
                <span className="text-2xs text-cyan-ink font-medium block">Status: OPTIMAL</span>
              </div>
            </div>
          </div>

          {/* Incidents & Command Terminal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Incidents */}
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <h3 className="text-sm font-bold text-foreground">Live Grid Incidents</h3>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-ink shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-ink">CRITICAL: Transformer Overload</span>
                      <span className="text-2xs font-mono text-muted-foreground">Just now</span>
                    </div>
                    <p className="text-soft mt-1">Sector 4 secondary transformer running at 94% threshold. Automated load balancing triggered.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-ink shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-ink">WARNING: Frequency Drop</span>
                      <span className="text-2xs font-mono text-muted-foreground">1h ago</span>
                    </div>
                    <p className="text-soft mt-1">Grid Feed Alpha registered 49.82 Hz transient dip. Self-recovered in 14 seconds.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Command Terminal */}
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <h3 className="text-sm font-bold text-foreground">Supervisor Command Terminal</h3>

              <form onSubmit={handleBroadcast} className="space-y-3">
                <div>
                  <label className="block text-xs text-soft mb-1">Broadcast Type</label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value)}
                    className="w-full rounded-xl bg-muted border border-border text-foreground text-xs p-2.5"
                  >
                    <option value="Standard Advisory (Push)" className="bg-inset">Standard Advisory (Push)</option>
                    <option value="Critical Grid Peak Notification" className="bg-inset">Critical Grid Peak Notification</option>
                    <option value="Demand Response Event Invitation" className="bg-inset">Demand Response Event Invitation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-soft mb-1">Message Payload</label>
                  <textarea
                    rows={3}
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    placeholder="E.g. Power Command reports high cooling load in Sector 4. Please optimize AC setpoints..."
                    className="w-full rounded-xl bg-muted border border-border text-foreground text-xs p-3 placeholder:text-faint focus:outline-none focus:border-positive"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-9 gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{sending ? "Transmitting Broadcast..." : "Send Ward 24 Broadcast"}</span>
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Ward 24 Aggregate & Heatmap */}
        <TabsContent value="ward-households" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <KpiCard
              title="Participating Homes"
              value="4,820"
              subtitle="Ward 24 residences"
              badge={<StatusBadge status="normal" label="100% Synced" />}
            />
            <KpiCard
              title="Avg Household Load"
              value="362 kWh"
              subtitle="+4.2% vs baseline"
              badge={<StatusBadge status="normal" label="Normal" />}
            />
            <KpiCard
              title="Above-Baseline Count"
              value="342 Homes"
              subtitle="7.1% of cohort"
              badge={<StatusBadge status="warning" label="Monitored" />}
            />
            <KpiCard
              title="Predicted Demand"
              value="1.84 GWh"
              subtitle="October 2026 forecast"
              badge={<StatusBadge status="normal" label="Stable" />}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl">
            <h3 className="text-base font-bold text-foreground mb-4">Ward 24 Area Electricity Heatmap</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "XYZ Colony", households: 1240, status: "Higher than baseline", tone: "warning", pct: "+8.4%" },
                { name: "ABC Colony", households: 1100, status: "Normal Range", tone: "normal", pct: "+2.1%" },
                { name: "DEF Colony", households: 1350, status: "Normal Range", tone: "normal", pct: "-1.5%" },
                { name: "GHI Colony", households: 1130, status: "Optimal", tone: "normal", pct: "-3.2%" },
              ].map((area, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-muted/60 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-foreground">{area.name}</span>
                    <span className={`text-xs font-mono font-bold ${area.tone === "warning" ? "text-amber-ink" : "text-positive"}`}>
                      {area.pct}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{area.households} households monitored</div>
                  <StatusBadge status={area.tone === "warning" ? "warning" : "normal"} label={area.status} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
