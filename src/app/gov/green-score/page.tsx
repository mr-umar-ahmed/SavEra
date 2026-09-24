"use client";

import { Award, CheckCircle2, Leaf, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { ProgressRing } from "@/components/savera/ProgressRing";

export default function GovGreenScorePage() {
  const brackets = [
    { range: "80 – 100 (Exemplary)", share: "38%", count: "17,180 homes", tone: "bg-emerald-400" },
    { range: "60 – 79 (Moderate Conservation)", share: "44%", count: "19,900 homes", tone: "bg-teal-400" },
    { range: "40 – 59 (Baseline Normal)", share: "14%", count: "6,330 homes", tone: "bg-amber-400" },
    { range: "< 40 (High Variance)", share: "4%", count: "1,820 homes", tone: "bg-rose-400" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="City Green Score Distribution"
        subtitle="Aggregated sustainability benchmark across Raichur's 45,230 participating households."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="complete" label="City Mean: 78 / 100" />
            <span className="text-xs font-mono text-emerald-400 font-bold">+3.4 YoY</span>
          </div>
        }
      />

      <div className="p-8 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <ProgressRing progress={78} size={100} strokeWidth={8}>
            <span className="text-2xl font-bold font-mono text-emerald-400">78</span>
          </ProgressRing>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">City-Wide Sustainability Rating</h3>
            <p className="text-xs text-white/60 max-w-md">
              Over 82% of households are operating within or superior to their baseline efficiency targets across electricity, water, and LPG.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center font-mono shrink-0">
          <span className="text-[10px] text-white/40 block uppercase">PARTICIPATING COHORT</span>
          <span className="text-xl font-bold text-white">45,230 Homes</span>
        </div>
      </div>

      {/* Distribution Histogram */}
      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl space-y-4">
        <h3 className="text-sm font-bold text-white mb-3">Green Score Cohort Distribution</h3>

        <div className="space-y-3">
          {brackets.map((b, idx) => (
            <div key={idx} className="space-y-1.5 text-xs">
              <div className="flex justify-between font-medium">
                <span className="text-white/80">{b.range}</span>
                <span className="text-white font-mono">{b.share} ({b.count})</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full ${b.tone} rounded-full`} style={{ width: b.share }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
