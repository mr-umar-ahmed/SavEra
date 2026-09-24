"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplet,
  Flame,
  HelpCircle,
  Home,
  PieChart,
  Sparkles,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { ProgressRing } from "@/components/savera/ProgressRing";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { Button } from "@/components/ui/button";
import { useCurrentHousehold } from "@/lib/api/hooks";
import type { SetupSection, SetupStatus } from "@/types";

export default function CitizenSetupHubPage() {
  const { household } = useCurrentHousehold();

  const completeness = 78;
  const sections: Record<SetupSection, SetupStatus> = household?.sections ?? {
    household: "complete",
    electricity: "complete",
    water: "complete",
    gas: "complete",
    carbon: "none",
  };

  // 12 Status rows matching docs/spec/02-electricity.md §1
  const profileRows: Array<{
    name: string;
    statusText: string;
    type: "complete" | "partial" | "later" | "none";
    actionHref?: string;
  }> = [
    { name: "Household details", statusText: "Complete", type: "complete" },
    { name: "Cooling (AC)", statusText: "Complete", type: "complete" },
    { name: "Refrigerator", statusText: "Complete", type: "complete" },
    { name: "Fans & lighting", statusText: "Complete", type: "complete" },
    { name: "Entertainment (TV)", statusText: "Complete", type: "complete" },
    {
      name: "Geyser",
      statusText: "Set up later",
      type: "later",
      actionHref: "/citizen/setup/electricity?step=2",
    },
    {
      name: "Washing machine",
      statusText: "Partial",
      type: "partial",
      actionHref: "/citizen/setup/electricity?step=2",
    },
    { name: "Kitchen (microwave, mixer)", statusText: "Complete", type: "complete" },
    { name: "Electricity bills", statusText: "12 months", type: "complete" },
    { name: "Water setup", statusText: "Complete", type: "complete" },
    { name: "LPG setup", statusText: "Complete", type: "complete" },
    {
      name: "Carbon inputs",
      statusText: "Not added",
      type: "none",
      actionHref: "/citizen/carbon",
    },
  ];

  const getStatusBadge = (row: (typeof profileRows)[0]) => {
    switch (row.type) {
      case "complete":
        return (
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs font-mono">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>✅ {row.statusText}</span>
          </span>
        );
      case "partial":
        return (
          <span className="flex items-center gap-1.5 text-amber-400 font-medium text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            <span>⚠️ {row.statusText}</span>
          </span>
        );
      case "later":
        return (
          <span className="flex items-center gap-1.5 text-sky-400 font-medium text-xs font-mono">
            <Clock className="h-3.5 w-3.5" />
            <span>⏳ {row.statusText}</span>
          </span>
        );
      case "none":
        return (
          <span className="flex items-center gap-1.5 text-white/40 font-medium text-xs font-mono">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>❌ {row.statusText}</span>
          </span>
        );
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
      <div className="p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-emerald-950/20 via-black to-teal-950/20 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-5">
          <ProgressRing progress={completeness} size={80} strokeWidth={6}>
            <span className="text-base font-bold font-mono text-emerald-400">{completeness}%</span>
          </ProgressRing>
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <h2 className="text-base font-bold text-white">
                Home Energy Profile — {completeness}% Complete
              </h2>
              <EstimatedChip
                confidence="Medium"
                inputs={["12 bills", "78% appliance detail"]}
              />
            </div>
            <p className="text-xs text-white/60 max-w-xl leading-relaxed">
              Complete your profile to improve appliance-level estimates. You can explore all
              dashboards right now with our baseline estimates.
            </p>
          </div>
        </div>

        <Link href="/citizen/setup/household">
          <Button
            variant="outline"
            size="sm"
            className="border-white/15 bg-white/5 hover:bg-white/10 text-xs text-white gap-2 h-9 rounded-xl"
          >
            <Home className="h-3.5 w-3.5 text-emerald-400" />
            <span>Household Details</span>
          </Button>
        </Link>
      </div>

      {/* Four Setup Cards (Verbatim copy from §1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Electricity Setup */}
        <Link href="/citizen/setup/electricity" className="group">
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-amber-500/40 transition-all flex flex-col justify-between h-full shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Zap className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-amber-300 transition-colors">
                Electricity Setup
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Configure high-load appliances and scan power bills.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-white/40">Status:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Configured (390 kWh)</span>
              </span>
            </div>
          </div>
        </Link>

        {/* Card 2: Water Setup */}
        <Link href="/citizen/setup/water" className="group">
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-teal-500/40 transition-all flex flex-col justify-between h-full shadow-lg">
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
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-white/40">Status:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Configured (Ward 24)</span>
              </span>
            </div>
          </div>
        </Link>

        {/* Card 3: Gas & Heating */}
        <Link href="/citizen/setup/gas" className="group">
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-rose-500/40 transition-all flex flex-col justify-between h-full shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Flame className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-rose-300 transition-colors">
                Gas &amp; Heating
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                Track LPG cylinders or piped municipal gas usage.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-white/40">Status:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Active (14.2 kg)</span>
              </span>
            </div>
          </div>
        </Link>

        {/* Card 4: Carbon Footprint Analyzer */}
        <Link href="/citizen/carbon" className="group">
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-emerald-500/40 transition-all flex flex-col justify-between h-full shadow-lg">
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
                Go beyond basic utilities. Map your commuting, diet, and lifestyle to calculate
                your complete environmental impact and receive actionable ESG optimization
                strategies.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-white/40">Status:</span>
              <span className="text-white/40 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Not added</span>
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Section-by-Section Status Table matching §1 */}
      <div className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#070D0A]/90 backdrop-blur-2xl shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-white">Habitat Setup Status Table</h3>
            <p className="text-xs text-white/50 mt-0.5">
              Appliance and utility profile completeness breakdown for Household H-1024.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            9 of 12 complete · 78% detail
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {profileRows.map((row) => (
            <div
              key={row.name}
              className="py-3 sm:py-3.5 flex items-center justify-between gap-4 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-white/80 font-medium">{row.name}</span>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div>{getStatusBadge(row)}</div>
                {row.actionHref && (
                  <Link href={row.actionHref}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 text-[11px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-semibold"
                    >
                      Complete now &rarr;
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-white/10 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white/50">
          <p>
            Complete your profile to improve appliance-level estimates. Unconfigured items use
            calibrated municipal averages.
          </p>
          <div className="flex items-center gap-2">
            <Link href="/citizen/setup/electricity">
              <Button
                size="sm"
                className="bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs h-8 px-4"
              >
                Launch Electricity Wizard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
