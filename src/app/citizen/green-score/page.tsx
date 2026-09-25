"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Droplet,
  Flame,
  Info,
  Leaf,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { ProgressRing } from "@/components/savera/ProgressRing";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { Button } from "@/components/ui/button";

export default function CitizenGreenScorePage() {
  const score = 86;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Habitat Green Score"
        subtitle="Normalized multi-utility efficiency rating evaluated against peer households in Ward 24."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="complete" label="Tier: Emerald Habitat" />
            <EstimatedChip confidence="High" inputs={["Normalized 3BHK", "4 Occupants", "700 Ward Peers"]} />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/citizen/progress">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-muted text-xs text-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-positive" />
                <span>Rank Progress</span>
              </Button>
            </Link>
            <Link href="/citizen/leaderboard">
              <Button size="sm" className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-semibold">
                <Users className="h-3.5 w-3.5" />
                <span>View Leaderboard</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Main Score Hero Card */}
      <div className="p-8 rounded-2xl border border-positive/30 bg-gradient-to-r from-positive/10 via-card to-teal-500/5 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <ProgressRing progress={score} size={110} strokeWidth={8}>
            <span className="text-3xl font-extrabold font-display text-positive">{score}</span>
          </ProgressRing>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
              <h2 className="text-2xl font-bold text-foreground">86 / 100 — High Conservation Rating</h2>
            </div>
            <p className="text-xs text-soft max-w-lg leading-relaxed">
              Your household ranks in the <span className="font-semibold text-positive">top 12%</span> of similar 3BHK residences in Ward 24, having reduced baseline variance consistently over the past 4 months.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-inset border border-border text-center shrink-0 w-full sm:w-auto">
          <span className="text-2xs text-faint uppercase tracking-wider block font-mono">Ward 24 Standings</span>
          <div className="text-2xl font-extrabold font-display text-positive my-1">#84 / 700</div>
          <span className="text-xs text-positive font-medium">+43 spots improved this month</span>
        </div>
      </div>

      {/* Sub-Score Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-ink font-bold text-xs">
              <Zap className="h-4 w-4" />
              <span>Electricity Efficiency (50%)</span>
            </div>
            <span className="font-mono font-bold text-sm text-foreground">42 / 50</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: "84%" }} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Evaluates kWh consumption per occupant against 3BHK summer-winter baseline bands.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-ink font-bold text-xs">
              <Droplet className="h-4 w-4" />
              <span>Water Stewardship (30%)</span>
            </div>
            <span className="font-mono font-bold text-sm text-foreground">26 / 30</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-teal-400 rounded-full" style={{ width: "86.6%" }} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Reflects prompt community reporting and effective overhead storage utilization.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-ink font-bold text-xs">
              <Flame className="h-4 w-4" />
              <span>LPG Consistency (20%)</span>
            </div>
            <span className="font-mono font-bold text-sm text-foreground">18 / 20</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-rose-400 rounded-full" style={{ width: "90%" }} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Rewards steady burn rates (0.57 kg/day) without sudden leak-like surges.
          </p>
        </div>
      </div>

      {/* Normalization Explanation Box */}
      <div className="p-5 rounded-2xl border border-border bg-muted/60 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-positive uppercase tracking-wider">
          <Info className="h-4 w-4" />
          <span>How SAVERA Normalizes The Green Score</span>
        </div>
        <p className="text-xs text-soft leading-relaxed">
          The Green Score is mathematically normalized per occupant and home layout type. A single occupant in a 1BHK consuming 100 kWh does not automatically beat a 5-person family in a 3BHK consuming 350 kWh. The score rewards personal baseline improvement (30%), consistency (20%), and peer efficiency relative to your cohort (50%).
        </p>
      </div>
    </div>
  );
}
