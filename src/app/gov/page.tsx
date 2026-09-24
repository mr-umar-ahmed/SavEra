"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Box,
  Droplet,
  Flame,
  Globe,
  Layers,
  Leaf,
  MapPin,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/session";

export default function GovCommandCenterPage() {
  const user = useSessionStore((s) => s.user);
  const activeDept = user?.department ?? "electricity";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Municipal Resource Command Center"
        subtitle="City-scale demand intelligence, telemetry rollups, and resource planning across Electricity, Water, and LPG."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="normal" label="City of Raichur" />
            <span className="text-xs font-mono text-emerald-400 font-bold">24 Wards Active</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/gov/heatmap">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white">
                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                <span>GIS Heatmap</span>
              </Button>
            </Link>
            <Link href="/gov/twin">
              <Button size="sm" className="h-8 gap-1.5 bg-cyan-500 text-black hover:bg-cyan-400 text-xs font-semibold">
                <Box className="h-3.5 w-3.5" />
                <span>City Simulation</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Department Tabs Highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/gov/electricity">
          <div className={`p-4 rounded-xl border transition-all ${
            activeDept === "electricity"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-950"
              : "bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/5"
          }`}>
            <div className="flex items-center gap-2 font-bold text-xs mb-1">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Electricity Department (GESCOM)</span>
            </div>
            <p className="text-[11px] text-white/50">842 MW Grid Load · Automated Demand Response</p>
          </div>
        </Link>

        <Link href="/gov/water">
          <div className={`p-4 rounded-xl border transition-all ${
            activeDept === "water"
              ? "bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-lg shadow-teal-950"
              : "bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/5"
          }`}>
            <div className="flex items-center gap-2 font-bold text-xs mb-1">
              <Droplet className="h-4 w-4 text-teal-400" />
              <span>Water Supply Board</span>
            </div>
            <p className="text-[11px] text-white/50">11.8M L Delivered · 12.4M L Forecast</p>
          </div>
        </Link>

        <Link href="/gov/gas">
          <div className={`p-4 rounded-xl border transition-all ${
            activeDept === "gas"
              ? "bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-950"
              : "bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/5"
          }`}>
            <div className="flex items-center gap-2 font-bold text-xs mb-1">
              <Flame className="h-4 w-4 text-rose-400" />
              <span>LPG Distribution Cell</span>
            </div>
            <p className="text-[11px] text-white/50">56,000 kg Recorded · 60,000 kg Forecast</p>
          </div>
        </Link>
      </div>

      {/* City-Wide KPI Groups */}
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
          value="11.8M L / day"
          subtitle="Forecast: 12.4M L / day"
          badge={<EstimatedChip confidence="High" />}
        />

        <KpiCard
          title="City LPG Demand"
          value="56,000 kg"
          subtitle="Forecast: 60,000 kg"
          badge={<EstimatedChip confidence="High" />}
        />

        <KpiCard
          title="City Green Score"
          value="78 / 100"
          subtitle="+3.4 pts YoY improvement"
          badge={<StatusBadge status="complete" label="Tier 1 City" />}
        />
      </div>

      {/* Quick Navigation Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Multi-Utility Heatmap", desc: "GIS overlay of Water, Gas, and Grid stress levels", href: "/gov/heatmap", icon: Layers },
          { title: "Ward Benchmarking", desc: "Comparative demand profiles across 24 municipal wards", href: "/gov/wards", icon: MapPin },
          { title: "AI Demand Forecast", desc: "30-day forward looking requirement models", href: "/gov/forecast", icon: TrendingUp },
          { title: "Industrial Intelligence", desc: "Real-time industrial emissions & GHG accounting", href: "/gov/industrial", icon: Globe },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link key={idx} href={item.href} className="group">
              <div className="p-5 rounded-2xl border border-white/10 bg-[#070D0A]/95 hover:bg-white/[0.04] hover:border-cyan-500/40 transition-all flex flex-col justify-between h-full">
                <div>
                  <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1 group-hover:text-cyan-300">{item.title}</h4>
                  <p className="text-xs text-white/50 leading-relaxed mb-4">{item.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-medium">
                  <span>Open Module</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
