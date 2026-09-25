"use client";

import { useState } from "react";
import { Factory, Globe, Info, Leaf, ShieldAlert, Sparkles, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/savera/KpiCard";

export default function GovIndustrialPage() {
  const [activeTab, setActiveTab] = useState("emissions");

  const units = [
    { name: "Raichur Thermal Power Station (RTPS)", type: "Thermal Power", pm: "42 µg/m³", so2: "68 ppb", nox: "45 ppb", status: "Within applicable limit", tone: "normal" as const },
    { name: "Deosugur Industrial Area Unit 4", type: "Steel Smelter", pm: "88 µg/m³", so2: "112 ppb", nox: "72 ppb", status: "Elevated Reading", tone: "warning" as const },
    { name: "Yermarus Thermal Power Station", type: "Power Generation", pm: "38 µg/m³", so2: "54 ppb", nox: "40 ppb", status: "Within applicable limit", tone: "normal" as const },
    { name: "Hutti Gold Mines Smelter Complex", type: "Metallurgical", pm: "128 µg/m³", so2: "148 ppb", nox: "95 ppb", status: "Exceedance Alert", tone: "danger" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Industrial Environmental Intelligence & GHG Accounting"
        subtitle="Continuous ambient emission monitoring (OCEMS simulated telemetry) and Scope 1/2/3 municipal greenhouse gas inventories."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="simulation" label="Simulated Feeds / GHG Prototype" />
            <span className="text-xs font-mono text-muted-foreground">OCEMS Standards</span>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="emissions">Continuous Emission Feeds</TabsTrigger>
          <TabsTrigger value="ghg">GHG Accounting Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="emissions" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Monitored Stacks"
              value="8 Stacks"
              subtitle="Continuous CEMS sensors"
              badge={<StatusBadge status="normal" label="Online" />}
            />
            <KpiCard
              title="City Air Quality Index"
              value="84 AQI (Moderate)"
              subtitle="PM2.5 average"
              badge={<StatusBadge status="normal" label="Satisfactory" />}
            />
            <KpiCard
              title="Exceedance Alerts"
              value="1 Active"
              subtitle="Hutti Smelter Complex"
              badge={<StatusBadge status="danger" label="Exceedance" />}
            />
            <KpiCard
              title="Telemetry Integrity"
              value="99.4%"
              subtitle="Telemetry uptime"
              badge={<StatusBadge status="complete" label="Audited" />}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-foreground mb-4">Industrial Point-Source Emission Stations</h3>

            <div className="divide-y divide-border">
              {units.map((u, idx) => (
                <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-foreground text-sm">{u.name}</span>
                      <span className="text-faint text-xs">({u.type})</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground font-mono text-xs">
                      <span>PM: <strong className="text-foreground">{u.pm}</strong></span>
                      <span>SO₂: <strong className="text-foreground">{u.so2}</strong></span>
                      <span>NOx: <strong className="text-foreground">{u.nox}</strong></span>
                    </div>
                  </div>

                  <StatusBadge status={u.tone} label={u.status} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ghg" className="space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Municipal GHG Accounting Breakdown (Scopes 1, 2, 3)</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-inset border border-border/60 space-y-1">
                <span className="text-faint block text-2xs">SCOPE 1 (DIRECT COMBUSTION)</span>
                <span className="text-xl font-bold text-foreground">124,500 tCO₂e</span>
                <span className="text-xs text-muted-foreground block">Captive diesel & industrial boilers</span>
              </div>
              <div className="p-4 rounded-xl bg-inset border border-border/60 space-y-1">
                <span className="text-faint block text-2xs">SCOPE 2 (GRID CONSUMPTION)</span>
                <span className="text-xl font-bold text-positive">342,100 tCO₂e</span>
                <span className="text-xs text-muted-foreground block">Purchased grid electricity (0.82 kg/kWh)</span>
              </div>
              <div className="p-4 rounded-xl bg-inset border border-border/60 space-y-1">
                <span className="text-faint block text-2xs">SCOPE 3 (VALUE CHAIN)</span>
                <span className="text-xl font-bold text-teal-ink">89,200 tCO₂e</span>
                <span className="text-xs text-muted-foreground block">Logistics, waste & water treatment</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
