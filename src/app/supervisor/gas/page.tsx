"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Flame,
  Layers,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { Button } from "@/components/ui/button";

export default function SupervisorLpgDashboard() {
  const areas = [
    { id: "area-a", name: "Area A (DEF Colony)", consumption: "4,100 kg", status: "Normal", tone: "normal" as const },
    { id: "area-b", name: "Area B (XYZ Colony)", consumption: "4,650 kg", status: "High Increase (+14%)", tone: "warning" as const },
    { id: "area-c", name: "Area C (ABC Colony)", consumption: "3,950 kg", status: "Normal", tone: "normal" as const },
    { id: "area-d", name: "Area D (GHI Colony)", consumption: "4,800 kg", status: "Abnormally High (+18%)", tone: "danger" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ward 24 LPG Distribution & Demand Intelligence"
        subtitle="Ward-scale cylinder burn rates, abnormal surge detection, and automated distributor allocation quotas."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="warning" label="Area B & D High Demand" />
            <span className="text-xs font-mono text-white/50">Ward 24 Desk</span>
          </div>
        }
      />

      {/* KPIs from Section 6.14 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Monitored LPG Homes"
          value="4,820"
          subtitle="14.2 kg domestic cylinders"
          badge={<StatusBadge status="normal" label="100% Tracked" />}
        />

        <KpiCard
          title="Ward Monthly Burn"
          value="17,500 kg"
          subtitle="Current month aggregate"
          badge={<EstimatedChip confidence="High" />}
        />

        <KpiCard
          title="Abnormal Burn Count"
          value="142 Homes"
          subtitle="Exceeding 0.72 kg/day"
          badge={<StatusBadge status="warning" label="Surge Alert" />}
        />

        <KpiCard
          title="Predicted Requirement"
          value="18,600 kg"
          subtitle="October 2026 (~1,310 cylinders)"
          badge={<EstimatedChip confidence="Medium" />}
        />
      </div>

      {/* AI Alert Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-1">AI Alert: High LPG Consumption Detected in Area B (XYZ Colony)</span>
          <p className="text-white/70">
            Current aggregate burn rate exceeds seasonal baseline by +14.2%. 48 households exhibit premature cylinder turnover. Automated refill allocation adjusted to prevent supply bottlenecks.
          </p>
        </div>
      </div>

      {/* Heatmap & Localities */}
      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white mb-4">Ward 24 Area Consumption Heatmap</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {areas.map((a) => (
            <Link key={a.id} href={`/supervisor/gas/areas/${a.id}`} className="group">
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-rose-500/40 transition-all space-y-3">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm text-white group-hover:text-rose-300">{a.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-white/40 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-lg font-bold font-mono text-white">{a.consumption}</div>
                <StatusBadge status={a.tone} label={a.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
