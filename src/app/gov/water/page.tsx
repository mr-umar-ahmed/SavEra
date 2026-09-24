"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplet,
  ExternalLink,
  Layers,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { Button } from "@/components/ui/button";

export default function GovWaterPage() {
  const highDemandWards = [
    { ward: "Ward 24 (Central West)", current: "3.2M L", forecast: "3.5M L", status: "High Demand (+9.4%)", tone: "danger" as const },
    { ward: "Ward 18 (North Sector)", current: "2.8M L", forecast: "2.9M L", status: "Moderate Increase (+3.6%)", tone: "warning" as const },
    { ward: "Ward 11 (Industrial Feeder)", current: "2.4M L", forecast: "2.4M L", status: "Normal Range", tone: "normal" as const },
    { ward: "Ward 07 (South Residential)", current: "1.9M L", forecast: "1.9M L", status: "Optimal Range", tone: "normal" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="City Water Supply Board Command"
        subtitle="Bulk municipal water allocation, feeder manifold balancing, and ward distribution telemetry."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="normal" label="Pumping Stations Online" />
            <span className="text-xs font-mono text-teal-400 font-bold">11.8M L Delivered</span>
          </div>
        }
        actions={
          <Link href="/gov/cases">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-teal-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Forwarded Cases (1 Action Scheduled)</span>
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Current Daily Supply"
          value="11.8M L"
          subtitle="All 24 municipal zones"
          badge={<StatusBadge status="normal" label="Nominal" />}
        />
        <KpiCard
          title="Historical Baseline"
          value="10.9M L"
          subtitle="Seasonal daily average"
          badge={<EstimatedChip confidence="High" />}
        />
        <KpiCard
          title="Predicted Demand"
          value="12.4M L"
          subtitle="Next 30-day projection"
          badge={<EstimatedChip confidence="High" />}
        />
        <KpiCard
          title="Unaccounted Water"
          value="4.8%"
          subtitle="Distribution transmission loss"
          badge={<StatusBadge status="normal" label="Low Loss" />}
        />
      </div>

      {/* Ward Comparison Table */}
      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Ward Bulk Water Delivery & Stress Levels</h3>
          <Link href="/gov/heatmap" className="text-xs text-teal-400 hover:underline flex items-center gap-1">
            <span>View on GIS Heatmap</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="divide-y divide-white/5">
          {highDemandWards.map((w, idx) => (
            <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-white block text-sm">{w.ward}</span>
                <span className="text-white/40 text-[11px]">Feeder allocation calibrated to residential occupancy</span>
              </div>

              <div className="flex items-center gap-6 font-mono">
                <div>
                  <span className="text-[10px] text-white/40 block">CURRENT</span>
                  <span className="text-white font-bold">{w.current}</span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block">FORECAST</span>
                  <span className="text-teal-400 font-bold">{w.forecast}</span>
                </div>
                <StatusBadge status={w.tone} label={w.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
