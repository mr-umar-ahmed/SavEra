"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Box,
  Droplet,
  FileText,
  Flame,
  Layers,
  MapPin,
  ShieldAlert,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

export default function SupervisorHomePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ward 24 Supervisory Desk"
        subtitle="Operational command desk for Ward 24 (XYZ, ABC, DEF, and GHI Colony), Raichur."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="normal" label="Ward 24 Active Desk" />
            <span className="text-xs font-mono text-white/50">Supervisor: Rajesh Gowda</span>
          </div>
        }
        actions={
          <Link href="/supervisor/twin">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white">
              <Box className="h-3.5 w-3.5 text-emerald-400" />
              <span>Ward Simulation</span>
            </Button>
          </Link>
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
          badge={<StatusBadge status="warning" label="Field Assigned" />}
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

      {/* The Three Core Utility Streams */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stream 1: Electricity */}
        <Link href="/supervisor/electricity" className="group">
          <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 hover:border-amber-500/40 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Zap className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-amber-300">
                Grid Operations & Demand Response
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Monitor 842 MW city grid demand, regional sensor matrices, load shedding avoidance, and broadcast citizen advisories.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40">Feeder Status:</span>
              <span className="text-emerald-400 font-mono font-medium">Stable (45% load)</span>
            </div>
          </div>
        </Link>

        {/* Stream 2: Water Supply */}
        <Link href="/supervisor/water" className="group">
          <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 hover:border-teal-500/40 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Droplet className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-teal-300">
                Water Supply & Field Verification
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Review AI-grouped alerts, assign field inspection teams with GPS tracking, validate on-ground telemetry, and coordinate with the board.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40">Active Cases:</span>
              <span className="text-amber-400 font-mono font-medium">3 Pending Verification</span>
            </div>
          </div>
        </Link>

        {/* Stream 3: LPG Distribution */}
        <Link href="/supervisor/gas" className="group">
          <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 hover:border-rose-500/40 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Flame className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-rose-300">
                LPG Distribution & Burn Telemetry
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Ward-wide cylinder consumption heatmaps, localized leak risk indicators, monthly requirement forecasts, and agency planning.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40">Next Mo. Demand:</span>
              <span className="text-white font-mono font-medium">4,650 Cylinders</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
