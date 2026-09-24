"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Droplet,
  Flame,
  HelpCircle,
  Home,
  PieChart,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { ProgressRing } from "@/components/savera/ProgressRing";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { useCurrentHousehold } from "@/lib/api/hooks";
import type { SetupSection, SetupStatus } from "@/types";

export default function CitizenSetupHubPage() {
  const { household } = useCurrentHousehold();

  const completeness = 78;
  const sections: Record<SetupSection, SetupStatus> = household?.sections ?? {
    household: "complete",
    electricity: "complete",
    water: "partial",
    gas: "complete",
    carbon: "partial",
  };

  const sectionLabels: Record<SetupSection, string> = {
    household: "Household Basics & Occupancy",
    electricity: "Appliance Specifications & Bills",
    water: "Water Supply & Usage Points",
    gas: "LPG Cylinders & Provider",
    carbon: "Commute & Carbon Attributes",
  };

  const getStatusIcon = (st: SetupStatus) => {
    switch (st) {
      case "complete":
        return <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs"><CheckCircle2 className="h-4 w-4" /> Complete</span>;
      case "partial":
        return <span className="flex items-center gap-1.5 text-amber-400 font-medium text-xs"><Sparkles className="h-4 w-4" /> Partial (Estimated)</span>;
      case "later":
        return <span className="flex items-center gap-1.5 text-sky-400 font-medium text-xs"><Clock className="h-4 w-4" /> Set up later</span>;
      case "none":
        return <span className="flex items-center gap-1.5 text-white/40 font-medium text-xs"><HelpCircle className="h-4 w-4" /> Not added</span>;
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Digitize Your Habitat"
        subtitle="Select a utility stream to configure. Our AI requires context to map your historical consumption accurately."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="complete" label="Household H-1024" />
            <span className="text-xs font-mono text-white/50">Ward 24 · XYZ Colony</span>
          </div>
        }
      />

      {/* Profile Completeness Nudge Card */}
      <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-950/20 via-black to-teal-950/20 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <ProgressRing progress={completeness} size={76} strokeWidth={6}>
            <span className="text-base font-bold font-mono text-emerald-400">{completeness}%</span>
          </ProgressRing>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-white">Home Energy Profile — {completeness}% Complete</h2>
              <StatusBadge status="medium" label="Medium Confidence" />
            </div>
            <p className="text-xs text-white/60 max-w-xl">
              Complete your profile to improve appliance-level estimates. You can explore all dashboards right now with our baseline estimates.
            </p>
          </div>
        </div>

        <Link href="/citizen/setup/household">
          <Button variant="outline" size="sm" className="border-white/15 bg-white/5 hover:bg-white/10 text-xs text-white gap-2">
            <Home className="h-3.5 w-3.5 text-emerald-400" />
            <span>Edit Household Details</span>
          </Button>
        </Link>
      </div>

      {/* Four Setup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Electricity Setup */}
        <Link href="/citizen/setup/electricity" className="group">
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-emerald-500/40 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Zap className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-emerald-300 transition-colors">
                Electricity Setup
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Configure high-load appliances and scan power bills.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40">Status:</span>
              {getStatusIcon(sections.electricity)}
            </div>
          </div>
        </Link>

        {/* Card 2: Water Setup */}
        <Link href="/citizen/setup/water" className="group">
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-teal-500/40 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Droplet className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-teal-300 transition-colors">
                Water Setup
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Map usage points and calculate regional scarcity impact.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40">Status:</span>
              {getStatusIcon(sections.water)}
            </div>
          </div>
        </Link>

        {/* Card 3: Gas & Heating */}
        <Link href="/citizen/setup/gas" className="group">
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-rose-500/40 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Flame className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-rose-300 transition-colors">
                Gas & Heating
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Track LPG cylinders or piped municipal gas usage.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40">Status:</span>
              {getStatusIcon(sections.gas)}
            </div>
          </div>
        </Link>

        {/* Card 4: Carbon Footprint Analyzer */}
        <Link href="/citizen/carbon" className="group">
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-emerald-500/40 transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <PieChart className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    New
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
              <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-emerald-300 transition-colors">
                Carbon Footprint Analyzer
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Go beyond basic utilities. Map your commuting, diet, and lifestyle to calculate your complete environmental impact and receive actionable ESG optimization strategies.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40">Status:</span>
              {getStatusIcon(sections.carbon)}
            </div>
          </div>
        </Link>
      </div>

      {/* Section-by-Section Status Table */}
      <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/80 backdrop-blur-xl">
        <h3 className="text-sm font-bold text-white mb-4">Profile Breakdown by Utility Stream</h3>
        <div className="divide-y divide-white/5">
          {(Object.keys(sections) as SetupSection[]).map((sec) => (
            <div key={sec} className="py-3 flex items-center justify-between">
              <span className="text-xs text-white/80 font-medium">{sectionLabels[sec]}</span>
              <div>{getStatusIcon(sections[sec])}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
