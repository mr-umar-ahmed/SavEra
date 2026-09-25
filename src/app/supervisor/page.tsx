"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  Droplet,
  FileText,
  Flame,
  Gauge,
  Layers,
  MapPin,
  Radio,
  ShieldAlert,
  Sparkles,
  Users,
  Waves,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { AreaMap } from "@/components/maps";
import { AREAS } from "@/data/geo/raichur";
import { getWaterPipelinePolylines, getWaterInfrastructureMarkers } from "@/data/geo/waterPipelines";
import type { AreaMapFeature } from "@/components/maps/types";

export default function SupervisorHomePage() {
  const [selectedAssetId, setSelectedAssetId] = useState<string>("case-xyz-001");

  // Filter Ward 24 areas and construct polygon features
  const ward24Areas = AREAS.filter((a) => a.wardId === "ward-24");

  const mapFeatures: AreaMapFeature[] = ward24Areas.map((a) => {
    if (a.id === "area-xyz") {
      return {
        id: a.id,
        name: `${a.name} (Critical Concern)`,
        polygon: a.polygon,
        tone: "critical",
        label: "78 Pressure Drop Reports · Case XYZ-001",
        value: "0.4 bar measured (Nominal: 2.0)",
        href: "/supervisor/water/cases/case-xyz-001",
      };
    }
    if (a.id === "area-ghi") {
      return {
        id: a.id,
        name: `${a.name} (Moderate Low Pressure)`,
        polygon: a.polygon,
        tone: "moderate",
        label: "56 Reports · Field Verified",
        value: "1.1 bar measured",
        href: "/supervisor/water/cases/case-ghi-001",
      };
    }
    return {
      id: a.id,
      name: a.name,
      polygon: a.polygon,
      tone: a.id === "area-abc" ? "optimal" : "normal",
      label: "Water & Power Stable",
      value: "2.1 bar · 45% grid load",
      href: `/supervisor/water/areas/${a.id}`,
    };
  });

  const pipelines = getWaterPipelinePolylines(true);
  const infrastructureMarkers = getWaterInfrastructureMarkers(true);

  // Add Assistant Arif live field GPS marker
  const allMarkers = [
    ...infrastructureMarkers,
    {
      id: "fa-arif-gps",
      position: [16.166, 77.381] as [number, number],
      tone: "moderate" as const,
      label: "Field Assistant Arif (GPS Live)",
      value: "On-site: GHI Colony 4th Cross",
      type: "personnel" as const,
      details: "Executing pressure gauge audit for Case GHI-001. Verification 1/3 tasks complete.",
      radius: 7,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ward 24 Supervisory Desk"
        subtitle="Operational command desk for Ward 24 (XYZ, ABC, DEF, and GHI Colony), Raichur."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="normal" label="Ward 24 Active Desk" />
            <span className="text-xs font-mono text-muted-foreground">Supervisor: Rajesh Gowda</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/supervisor/water">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-card text-xs text-teal-ink">
                <Waves className="h-3.5 w-3.5" />
                <span>Water Operations</span>
              </Button>
            </Link>
            <Link href="/supervisor/twin">
              <Button size="sm" className="h-8 gap-1.5 bg-primary text-primary-foreground text-xs font-semibold">
                <Box className="h-3.5 w-3.5" />
                <span>Ward Simulation</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Ward Status Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Monitored Households"
          value="4,820"
          subtitle="92.4% Smart telemetry active"
          badge={<StatusBadge status="normal" label="Optimal" />}
        />

        <KpiCard
          title="Water Supply Alerts"
          value="1 High Concern"
          subtitle="Case XYZ-001 · 78 reports"
          badge={<StatusBadge status="danger" label="Critical Drop" />}
        />

        <KpiCard
          title="LPG Distribution Rate"
          value="0.58 kg / day"
          subtitle="Stable ward burn rate"
          badge={<StatusBadge status="normal" label="Normal" />}
        />

        <KpiCard
          title="Active DR Events"
          value="14.2 MW Averted"
          subtitle="Smart Demand Response active"
          badge={<StatusBadge status="normal" label="Grid Stable" />}
        />
      </div>

      {/* Ward 24 Real GIS Spatial Map & Water Pipeline Visualizer */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-tone-normal animate-pulse" />
              <h3 className="text-base font-bold text-foreground">
                Ward 24 Geographic Infrastructure &amp; Supply Pipeline Network
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time spatial visualization: Primary Feeder 4, distribution mains 4A–4D, OHT Gandhi Nagar, and SCADA pressure nodes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-bold border border-destructive/20 animate-pulse flex items-center gap-1.5">
              <AlertTriangle className="size-3" />
              <span>Feeder 4B: 0.4 bar Drop</span>
            </span>
            <Link href="/supervisor/water/cases/case-xyz-001">
              <Button size="sm" className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5">
                <span>Triage Case XYZ-001</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Map Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Leaflet Map with Pipeline Network */}
          <div className="lg:col-span-8 rounded-2xl overflow-hidden border border-border shadow-inner">
            <AreaMap
              features={mapFeatures}
              polylines={pipelines}
              markers={allMarkers}
              center={[16.173, 77.376]}
              zoom={14}
              height={420}
              showLayerToggle
              legend={[
                { tone: "critical", label: "Depressurized Line / High Incident (0.4 bar)" },
                { tone: "moderate", label: "Moderate Sub-nominal Flow (1.1 bar)" },
                { tone: "normal", label: "Nominal Operating Pressure (2.0–2.4 bar)" },
                { tone: "optimal", label: "Optimal Hydraulic Head (2.5+ bar)" },
              ]}
            />
          </div>

          {/* Right SCADA Telemetry & Incident Inspector */}
          <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Radio className="size-3.5 text-positive animate-pulse" />
                <span>Live SCADA Telemetry Stream</span>
              </div>

              {/* Critical Alert Card */}
              <div
                onClick={() => setSelectedAssetId("case-xyz-001")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedAssetId === "case-xyz-001"
                    ? "bg-destructive/10 border-destructive/60 shadow-md shadow-destructive/10"
                    : "bg-muted/40 border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" />
                    <span>Distribution Line 4B (XYZ Colony)</span>
                  </span>
                  <span className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                    0.4 bar
                  </span>
                </div>
                <p className="text-2xs text-muted-foreground leading-relaxed">
                  Line rupture / severe joint leakage near 3rd Cross. 78 household complaints logged during morning supply window.
                </p>
                <div className="mt-2 pt-2 border-t border-destructive/20 flex items-center justify-between text-2xs font-mono">
                  <span className="text-muted-foreground">Threshold: 1.8 bar</span>
                  <Link
                    href="/supervisor/water/cases/case-xyz-001"
                    className="text-destructive font-bold hover:underline flex items-center gap-1"
                  >
                    <span>View Case File</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>

              {/* OHT Gandhi Nagar Hub */}
              <div
                onClick={() => setSelectedAssetId("oht-w24")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedAssetId === "oht-w24"
                    ? "bg-positive/10 border-positive/50"
                    : "bg-muted/40 border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Droplet className="size-3.5 text-cyan-ink" />
                    <span>Ward 24 Reservoir (OHT Gandhi Nagar)</span>
                  </span>
                  <span className="text-2xs font-mono font-bold text-positive">72% Full</span>
                </div>
                <p className="text-2xs text-muted-foreground">
                  Capacity: 2.2 ML · Current Storage: 1.58 ML. Delivering steady head pressure of 2.4 bar to primary distribution manifold.
                </p>
              </div>

              {/* Assistant Arif on-field */}
              <div
                onClick={() => setSelectedAssetId("fa-arif")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedAssetId === "fa-arif"
                    ? "bg-amber-500/10 border-amber-500/50"
                    : "bg-muted/40 border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-amber-ink" />
                    <span>Field Team: Assistant Arif</span>
                  </span>
                  <span className="text-2xs font-mono text-amber-ink bg-amber-500/10 px-1.5 py-0.5 rounded">
                    GPS Active
                  </span>
                </div>
                <p className="text-2xs text-muted-foreground">
                  Location: GHI Colony Main Bazaar. Inspecting tail-end pressure gauge for Case GHI-001.
                </p>
              </div>
            </div>

            <Link href="/supervisor/water">
              <Button variant="outline" size="sm" className="w-full text-xs border-border bg-card h-8 gap-2">
                <span>Open Full Water Operations Center</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* The Three Core Utility Streams */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stream 1: Electricity */}
        <Link href="/supervisor/electricity" className="group">
          <div className="p-6 rounded-2xl border border-border bg-card hover:border-amber-500/40 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-ink">
                  <Zap className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-faint group-hover:text-amber-ink group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-amber-ink">
                Grid Operations &amp; Demand Response
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Monitor 842 MW city grid demand, regional sensor matrices, load shedding avoidance, and broadcast citizen advisories.
              </p>
            </div>
            <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-faint">Feeder Status:</span>
              <span className="text-positive font-mono font-medium">Stable (45% load)</span>
            </div>
          </div>
        </Link>

        {/* Stream 2: Water Supply */}
        <Link href="/supervisor/water" className="group">
          <div className="p-6 rounded-2xl border border-border bg-card hover:border-teal-500/40 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-ink">
                  <Droplet className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-faint group-hover:text-teal-ink group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-teal-ink">
                Water Supply &amp; Field Verification
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Review AI-grouped alerts, assign field inspection teams with GPS tracking, validate on-ground telemetry, and coordinate with the board.
              </p>
            </div>
            <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-faint">Active Cases:</span>
              <span className="text-amber-ink font-mono font-medium">3 Pending Verification</span>
            </div>
          </div>
        </Link>

        {/* Stream 3: LPG Distribution */}
        <Link href="/supervisor/gas" className="group">
          <div className="p-6 rounded-2xl border border-border bg-card hover:border-rose-500/40 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-ink">
                  <Flame className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-faint group-hover:text-rose-ink group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-rose-ink">
                LPG Distribution &amp; Burn Telemetry
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Ward-wide cylinder consumption heatmaps, localized leak risk indicators, monthly requirement forecasts, and agency planning.
              </p>
            </div>
            <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-faint">Next Mo. Demand:</span>
              <span className="text-foreground font-mono font-medium">4,650 Cylinders</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

