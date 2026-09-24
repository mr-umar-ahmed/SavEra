"use client";

import { Activity, AlertCircle, Droplet, Flame, Info, ShieldCheck, Zap } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";

export default function GovPlanningPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Municipal Resource Allocation Planning"
        subtitle="Forward planning quotas, buffer margins, and multi-utility procurement schedules."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="normal" label="Quarterly Allocation Plan" />
            <span className="text-xs font-mono text-white/50">Q4 2026</span>
          </div>
        }
      />

      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl space-y-6">
        <div>
          <h3 className="text-base font-bold text-white mb-1">Water Feeder Buffer Allocation</h3>
          <p className="text-xs text-white/60">
            Recommended distribution schedules to mitigate localized pressure drops in Ward 24 and Ward 18.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
            <span className="text-white/40 block text-[10px]">PLANNED PUMPING</span>
            <span className="text-base font-bold text-white">12.4M L / day</span>
          </div>
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
            <span className="text-white/40 block text-[10px]">HIGH DEMAND WARD 24</span>
            <span className="text-base font-bold text-amber-400">+350,000 L buffer</span>
          </div>
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
            <span className="text-white/40 block text-[10px]">SCHEDULE SHIFT</span>
            <span className="text-base font-bold text-emerald-400">7:00 – 8:15 AM</span>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <h3 className="text-base font-bold text-white mb-1">LPG Distributor Supply Quota</h3>
          <p className="text-xs text-white/60 mb-4">
            Authorized domestic cylinder release quotas for Raichur distribution depots.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
              <span className="text-white/40 block text-[10px]">TOTAL REQUIREMENT</span>
              <span className="text-base font-bold text-white">4,437 Cylinders</span>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
              <span className="text-white/40 block text-[10px]">SAFETY BUFFER (+5%)</span>
              <span className="text-base font-bold text-teal-400">220 Cylinders</span>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
              <span className="text-white/40 block text-[10px]">DISPATCH STATUS</span>
              <span className="text-base font-bold text-emerald-400">Approved</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/50 flex items-start gap-2">
          <Info className="h-4 w-4 text-white/40 shrink-0 mt-0.5" />
          <span>
            Statutory Notice: These figures represent computational planning advisory data. All operational, physical dispatch, and regulatory tariff decisions remain strictly with the respective department authorities.
          </span>
        </div>
      </div>
    </div>
  );
}
