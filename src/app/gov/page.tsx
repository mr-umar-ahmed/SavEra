"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Box,
  CheckCircle2,
  Clock,
  Compass,
  Droplet,
  ExternalLink,
  Flame,
  Gauge,
  Globe,
  Layers,
  Leaf,
  MapPin,
  Radio,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Waves,
  Wrench,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { Button } from "@/components/ui/button";
import { AreaMap } from "@/components/maps";
import { WARDS, AREAS, RAICHUR_CENTER } from "@/data/geo/raichur";
import {
  WATER_FACILITIES,
  WATER_PIPELINES,
  getWaterPipelinePolylines,
  getWaterInfrastructureMarkers,
  type WaterFacility,
  type WaterPipelineSpec,
} from "@/data/geo/waterPipelines";
import type { AreaMapFeature } from "@/components/maps/types";
import { useSessionStore } from "@/stores/session";

type GovTab = "map" | "resources" | "infrastructure" | "operations";

export default function GovCommandCenterPage() {
  const user = useSessionStore((s) => s.user);
  const activeDept = user?.department ?? "electricity";

  const [activeTab, setActiveTab] = useState<GovTab>("map");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("fac-wtp-rampur");
  const [searchQuery, setSearchQuery] = useState("");
  const [utilityFilter, setUtilityFilter] = useState<"all" | "water" | "power" | "gas">("all");

  // Construct Ward-level map polygon features
  const wardFeatures: AreaMapFeature[] = WARDS.map((w) => {
    if (w.id === "ward-24") {
      return {
        id: w.id,
        name: `${w.name} (Active Alert)`,
        polygon: w.polygon,
        tone: "critical",
        label: "Water Alert: Feeder 4B Depressurized · 78 Complaints",
        value: "0.4 bar measured · Case XYZ-001",
        href: "/supervisor",
      };
    }
    if (w.id === "ward-15") {
      return {
        id: w.id,
        name: `${w.name} (Peak Load)`,
        polygon: w.polygon,
        tone: "moderate",
        label: "Commercial Power Grid Demand: 89% capacity",
        value: "112 MW load",
        href: "/gov/electricity",
      };
    }
    return {
      id: w.id,
      name: w.name,
      polygon: w.polygon,
      tone: w.number === 3 || w.number === 7 ? "optimal" : "normal",
      label: "Nominal Resource Distribution",
      value: `${w.householdCount} households`,
      href: "/gov/wards",
    };
  });

  const cityPipelines = getWaterPipelinePolylines(false);
  const cityInfrastructure = getWaterInfrastructureMarkers(false);

  // Selected asset details for the inspection drawer
  const selectedFacility = WATER_FACILITIES.find((f) => f.id === selectedAssetId);
  const selectedPipeline = WATER_PIPELINES.find((p) => p.id === selectedAssetId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Municipal Resource Command Center"
        subtitle="City-scale GIS spatial intelligence, hydraulic pipeline networks, real-time SCADA telemetry, and multi-utility demand analytics."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="normal" label="City of Raichur" />
            <span className="text-xs font-mono text-positive font-bold">24 Wards Active</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/gov/heatmap">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-card text-xs text-cyan-ink">
                <Layers className="h-3.5 w-3.5" />
                <span>GIS Heatmap</span>
              </Button>
            </Link>
            <Link href="/gov/twin">
              <Button size="sm" className="h-8 gap-1.5 bg-positive text-positive-foreground hover:bg-positive/90 text-xs font-semibold">
                <Box className="h-3.5 w-3.5" />
                <span>City Simulation</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Global Resource Performance KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Participating Homes"
          value="45,230"
          subtitle="88.5% Smart grid coverage"
          badge={<StatusBadge status="normal" label="Raichur City" />}
        />

        <KpiCard
          title="Grid Peak Demand"
          value="842 MW"
          subtitle="+12% from base load"
          badge={<StatusBadge status="warning" label="ADR Active" />}
        />

        <KpiCard
          title="Water Supply Output"
          value="38.5 MLD"
          subtitle="Capacity: 48.0 MLD · Krishna WTP"
          badge={<StatusBadge status="normal" label="Hydraulic Stable" />}
        />

        <KpiCard
          title="City LPG Demand"
          value="56,000 kg"
          subtitle="Forecast: 60,000 kg / mo"
          badge={<EstimatedChip confidence="High" />}
        />

        <KpiCard
          title="City Green Score"
          value="78 / 100"
          subtitle="+3.4 pts YoY improvement"
          badge={<StatusBadge status="complete" label="Tier 1 City" />}
        />
      </div>

      {/* Primary Command Navigation Tabs: Clearly Separating Map, Resources, SCADA, and Operations */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/60 border border-border">
        <button
          onClick={() => setActiveTab("map")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "map"
              ? "bg-card text-foreground shadow-md border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="h-4 w-4 text-cyan-ink" />
          <span>Spatial GIS &amp; Water Pipeline Grid</span>
        </button>

        <button
          onClick={() => setActiveTab("resources")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "resources"
              ? "bg-card text-foreground shadow-md border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4 text-amber-ink" />
          <span>Municipal Resource Intelligence</span>
        </button>

        <button
          onClick={() => setActiveTab("infrastructure")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "infrastructure"
              ? "bg-card text-foreground shadow-md border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Gauge className="h-4 w-4 text-positive" />
          <span>SCADA Assets &amp; Pumping Infrastructure</span>
        </button>

        <button
          onClick={() => setActiveTab("operations")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === "operations"
              ? "bg-card text-foreground shadow-md border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4 text-destructive" />
          <span>Operations &amp; Incident Triage</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: Real-Map-Based GIS Spatial Infrastructure & Pipeline Network
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "map" && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2 rounded-full bg-tone-optimal animate-pulse" />
                <h3 className="text-base font-bold text-foreground">
                  Raichur City-Wide Spatial Infrastructure &amp; Hydraulic Pipeline Command Map
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full physical network: Krishna River intake WTP Rampur &rarr; 900mm Bulk Transmission Main &rarr; Fort Hill MBR (24 ML) &rarr; Radial Feeders &rarr; Ward Elevated Storage Reservoirs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xs font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-ink font-bold border border-cyan-500/20">
                SCADA Sync (simulated): 48 Nodes
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* GIS Leaflet Map with Pipeline Network & SCADA Nodes */}
            <div className="lg:col-span-8 rounded-2xl overflow-hidden border border-border shadow-inner">
              <AreaMap
                features={wardFeatures}
                polylines={cityPipelines}
                markers={cityInfrastructure}
                center={RAICHUR_CENTER}
                zoom={13}
                height={520}
                showLayerToggle
                legend={[
                  { tone: "critical", label: "Critical Incident / 0.4 bar Leak (Line 4B, Ward 24)" },
                  { tone: "moderate", label: "Moderate Alert / High Commercial Load (Ward 15)" },
                  { tone: "normal", label: "Nominal Operating Pressure (2.0–2.4 bar)" },
                  { tone: "optimal", label: "Optimal Flow / WTP Source (3.8 bar)" },
                ]}
              />
            </div>

            {/* Right Asset Inspection Drawer */}
            <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-mono uppercase tracking-wider text-muted-foreground">
                    Infrastructure Inspector
                  </span>
                  <span className="text-2xs font-mono text-positive bg-positive/10 px-2 py-0.5 rounded">
                    Interactive Telemetry
                  </span>
                </div>

                {/* Quick Asset Selector */}
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl text-foreground text-xs p-2.5 font-medium focus:outline-none"
                >
                  <optgroup label="Core Water Facilities & Reservoirs">
                    {WATER_FACILITIES.map((f) => (
                      <option key={f.id} value={f.id}>
                        [{f.code}] {f.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Transmission & Distribution Pipelines">
                    {WATER_PIPELINES.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {/* Active Selection Details Card */}
                {selectedFacility && (
                  <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{selectedFacility.name}</span>
                      <StatusBadge
                        status={
                          selectedFacility.status === "critical"
                            ? "danger"
                            : selectedFacility.status === "moderate"
                            ? "warning"
                            : "normal"
                        }
                        label={selectedFacility.code}
                      />
                    </div>

                    <p className="text-2xs text-muted-foreground leading-relaxed">
                      {selectedFacility.details}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-2xs font-mono">
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-muted-foreground block">CAPACITY / RATING</span>
                        <span className="font-bold text-foreground">{selectedFacility.capacity}</span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-muted-foreground block">OPERATING PRESSURE</span>
                        <span className="font-bold text-foreground">
                          {selectedFacility.scadaTelemetry.pressureBar} bar
                        </span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-muted-foreground block">FLOW RATE</span>
                        <span className="font-bold text-foreground">
                          {selectedFacility.scadaTelemetry.flowRateLps} L/s
                        </span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-muted-foreground block">STATUS</span>
                        <span className="font-bold capitalize text-positive">
                          {selectedFacility.scadaTelemetry.pumpStatus ?? "Active"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedPipeline && (
                  <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{selectedPipeline.name}</span>
                      <StatusBadge
                        status={selectedPipeline.status === "critical" ? "danger" : "normal"}
                        label={`${selectedPipeline.diameterMm}mm`}
                      />
                    </div>

                    <p className="text-2xs text-muted-foreground leading-relaxed">
                      {selectedPipeline.notes}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-2xs font-mono">
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-muted-foreground block">MATERIAL</span>
                        <span className="font-bold text-foreground">{selectedPipeline.material}</span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-muted-foreground block">HYDRAULIC HEAD</span>
                        <span className={`font-bold ${selectedPipeline.tone === "critical" ? "text-destructive" : "text-foreground"}`}>
                          {selectedPipeline.pressureBar} bar (Nom: {selectedPipeline.nominalPressureBar})
                        </span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-muted-foreground block">FLOW THROUGHPUT</span>
                        <span className="font-bold text-foreground">{selectedPipeline.flowMld} MLD</span>
                      </div>
                      <div className="p-2 rounded bg-card border border-border">
                        <span className="text-muted-foreground block">LINE LENGTH</span>
                        <span className="font-bold text-foreground">{selectedPipeline.lengthKm} km</span>
                      </div>
                    </div>

                    {selectedPipeline.linkedCaseId && (
                      <Link href="/supervisor/water/cases/case-xyz-001">
                        <Button size="sm" className="w-full text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5 h-8 mt-1">
                          <AlertTriangle className="size-3" />
                          <span>View Linked Incident: Case XYZ-001</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Link href="/supervisor">
                  <Button variant="outline" size="sm" className="w-full text-xs border-border bg-card h-8 gap-2">
                    <MapPin className="size-3.5 text-positive" />
                    <span>View Ward 24 Operations Desk</span>
                  </Button>
                </Link>
                <Link href="/gov/heatmap">
                  <Button variant="outline" size="sm" className="w-full text-xs border-border bg-card h-8 gap-2">
                    <Layers className="size-3.5 text-cyan-ink" />
                    <span>Open Multi-Utility GIS Heatmap</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: Municipal Resource Intelligence (Separated Water, Electricity, LPG)
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "resources" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stream 1: Electricity Department */}
            <div className="rounded-3xl border border-amber-500/30 bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-ink">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Electricity Department (Raichur)</h4>
                    <span className="text-2xs text-muted-foreground font-mono">Telemetry: 842 MW</span>
                  </div>
                </div>
                <StatusBadge status="warning" label="Peak Alert" />
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground">Current Demand</span>
                  <span className="font-bold text-foreground">842 MW / 900 MW max</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground">Automated Demand Response</span>
                  <span className="font-bold text-positive">-14.2 MW shaved</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground">Rooftop Solar Feed-in</span>
                  <span className="font-bold text-positive">+22.4 MW generation</span>
                </div>
              </div>

              <Link href="/gov/electricity">
                <Button size="sm" variant="outline" className="w-full text-xs border-amber-500/30 hover:bg-amber-500/10 text-amber-ink h-8 gap-1.5">
                  <span>Open Electricity Command</span>
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>

            {/* Stream 2: Water Supply Board */}
            <div className="rounded-3xl border border-teal-500/30 bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-ink">
                    <Droplet className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Water Supply Board</h4>
                    <span className="text-2xs text-muted-foreground font-mono">Output: 38.5 MLD</span>
                  </div>
                </div>
                <StatusBadge status="normal" label="Normal Delivery" />
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground">Daily Bulk Production</span>
                  <span className="font-bold text-foreground">38.5 MLD (Krishna WTP)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground">Per Capita Consumption</span>
                  <span className="font-bold text-positive">135.2 LPCD (Target: 135)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground">Non-Revenue Water (Loss)</span>
                  <span className="font-bold text-amber-ink">14.2% (Target &lt; 15%)</span>
                </div>
              </div>

              <Link href="/gov/water">
                <Button size="sm" variant="outline" className="w-full text-xs border-teal-500/30 hover:bg-teal-500/10 text-teal-ink h-8 gap-1.5">
                  <span>Open Water Command</span>
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>

            {/* Stream 3: LPG Distribution */}
            <div className="rounded-3xl border border-rose-500/30 bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-ink">
                    <Flame className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">LPG Distribution Cell</h4>
                    <span className="text-2xs text-muted-foreground font-mono">Rate: 56,000 kg</span>
                  </div>
                </div>
                <StatusBadge status="normal" label="Distribution On Track" />
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground">Active Subscriptions</span>
                  <span className="font-bold text-foreground">38,400 connections</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground">Average Burn Rate</span>
                  <span className="font-bold text-foreground">0.54 kg / household / day</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/60">
                  <span className="text-muted-foreground">Upcoming Quota Demand</span>
                  <span className="font-bold text-foreground">4,200 cylinders</span>
                </div>
              </div>

              <Link href="/gov/gas">
                <Button size="sm" variant="outline" className="w-full text-xs border-rose-500/30 hover:bg-rose-500/10 text-rose-ink h-8 gap-1.5">
                  <span>Open LPG Command</span>
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Ward Resource Distribution Matrix */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Municipal Ward Resource Allocation</h3>
                <p className="text-xs text-muted-foreground">Aggregated municipal demand across 8 monitored zones</p>
              </div>
              <span className="text-2xs font-mono text-muted-foreground">8 Monitored Wards</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-soft font-mono">
                <thead>
                  <tr className="border-b border-border text-faint font-mono text-xs">
                    <th className="pb-3 font-semibold">Ward</th>
                    <th className="pb-3 font-semibold">Households</th>
                    <th className="pb-3 font-semibold">Water Allocation (MLD)</th>
                    <th className="pb-3 font-semibold">Power Load (MW)</th>
                    <th className="pb-3 font-semibold">LPG Burn (kg/day)</th>
                    <th className="pb-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {WARDS.map((w) => (
                    <tr key={w.id} className="hover:bg-muted/60">
                      <td className="py-3 font-sans font-bold text-foreground">
                        <Link href="/gov/wards" className="hover:text-positive transition-colors">
                          {w.name}
                        </Link>
                      </td>
                      <td className="py-3">{w.householdCount}</td>
                      <td className="py-3">{(w.householdCount * 0.0048).toFixed(2)} MLD</td>
                      <td className="py-3">{(w.householdCount * 0.082).toFixed(1)} MW</td>
                      <td className="py-3">{(w.householdCount * 0.58).toFixed(0)} kg</td>
                      <td className="py-3 text-right">
                        <StatusBadge
                          status={w.id === "ward-24" ? "danger" : w.id === "ward-15" ? "warning" : "normal"}
                          label={w.id === "ward-24" ? "Critical Water Leak" : w.id === "ward-15" ? "High Power" : "Optimal"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 3: Physical SCADA Infrastructure & Pumping Asset Network
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "infrastructure" && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-foreground">
                SCADA Telemetry Matrix: Water Treatment Plants, Reservoirs &amp; Pumping Stations
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Physical asset inventory, head pressure monitoring, and pump operational health across the city.
              </p>
            </div>
            <span className="text-2xs font-mono text-positive bg-positive/10 px-2.5 py-1 rounded-full border border-positive/30 font-bold">
              10 Active SCADA Stations
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-semibold">Station Code</th>
                  <th className="pb-3 font-semibold">Facility Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Head Pressure</th>
                  <th className="pb-3 font-semibold">Flow Throughput</th>
                  <th className="pb-3 font-semibold">Capacity / Storage</th>
                  <th className="pb-3 text-right font-semibold">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {WATER_FACILITIES.map((fac) => (
                  <tr key={fac.id} className="hover:bg-muted/60">
                    <td className="py-3 font-bold text-foreground">{fac.code}</td>
                    <td className="py-3 font-sans font-medium text-foreground">{fac.name}</td>
                    <td className="py-3 uppercase text-muted-foreground">{fac.type.replace("_", " ")}</td>
                    <td className="py-3">
                      <span className={`font-bold ${fac.status === "critical" ? "text-destructive" : "text-foreground"}`}>
                        {fac.scadaTelemetry.pressureBar} bar
                      </span>
                    </td>
                    <td className="py-3">{fac.scadaTelemetry.flowRateLps} L/s</td>
                    <td className="py-3 text-muted-foreground">{fac.capacity}</td>
                    <td className="py-3 text-right">
                      <StatusBadge
                        status={
                          fac.status === "critical"
                            ? "danger"
                            : fac.status === "moderate"
                            ? "warning"
                            : "normal"
                        }
                        label={
                          fac.status === "critical"
                            ? "CRITICAL LEAK"
                            : fac.status === "moderate"
                            ? "Sub-nominal"
                            : "Running"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 4: Municipal Operations & Incident Triage
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Incidents */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-destructive" />
                  <h3 className="text-base font-bold text-foreground">Active Citizen Incidents</h3>
                </div>
                <span className="text-2xs font-mono font-bold text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
                  2 Pending Action
                </span>
              </div>

              <div className="space-y-3">
                {/* Incident 1: Case XYZ-001 */}
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-destructive">
                      Case XYZ-001: Distribution Line 4B Depressurization
                    </span>
                    <span className="text-2xs font-mono font-bold text-destructive">78 Reports</span>
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    Severe pressure drop (0.4 bar) detected in XYZ Colony during 07:00–08:00 window. Corresponds to physical joint rupture on Cast Iron main.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-2xs font-mono text-muted-foreground">Assigned: Supervisor Rajesh Gowda</span>
                    <Link href="/supervisor/water/cases/case-xyz-001">
                      <Button size="sm" className="h-7 text-xs bg-destructive text-destructive-foreground">
                        Triage Case File
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Incident 2: Case GHI-001 */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-ink">
                      Case GHI-001: Sub-nominal Tail-end Flow
                    </span>
                    <span className="text-2xs font-mono font-bold text-amber-ink">56 Reports</span>
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    Flow measured at 1.1 bar on GHI Colony 4th Cross. Field Assistant Arif dispatched with portable bar gauge.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-2xs font-mono text-muted-foreground">Status: Field Verification Active</span>
                    <Link href="/supervisor/water/cases/case-ghi-001">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-ink">
                        View Field Log
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Fleet & Water Tanker Routing */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-cyan-ink" />
                  <h3 className="text-base font-bold text-foreground">Emergency Relief Tanker Fleet</h3>
                </div>
                <span className="text-2xs font-mono text-positive bg-positive/10 px-2 py-0.5 rounded">
                  4 Available
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground block">Tanker T-04 (6,000 L)</span>
                    <span className="text-2xs text-muted-foreground">Dispatched to XYZ Colony Community Center</span>
                  </div>
                  <StatusBadge status="warning" label="En Route (12m)" />
                </div>

                <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground block">Tanker T-02 (9,000 L)</span>
                    <span className="text-2xs text-muted-foreground">Stationed at Fort Hill MBR filling gantry</span>
                  </div>
                  <StatusBadge status="normal" label="Standby" />
                </div>

                <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground block">Tanker T-08 (6,000 L)</span>
                    <span className="text-2xs text-muted-foreground">Stationed at Gandhi Chowk depot</span>
                  </div>
                  <StatusBadge status="normal" label="Standby" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

