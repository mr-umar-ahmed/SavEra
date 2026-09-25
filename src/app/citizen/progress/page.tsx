"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Award, CheckCircle2, Sparkles, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";

export default function RankProgressPage() {
  const history = [
    { month: "May 2026", rank: 142, score: 76, note: "Initial baseline established" },
    { month: "Jun 2026", rank: 135, score: 79, note: "AC thermostat efficiency applied" },
    { month: "Jul 2026", rank: 129, score: 81, note: "Low-flow water aerators installed" },
    { month: "Aug 2026", rank: 127, score: 82, note: "Stable LPG burn cycle recorded" },
    { month: "Sep 2026", rank: 84, score: 86, note: "Top 12% standing · +43 positions" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Historical Rank Progression"
        subtitle="Track your multi-month movement across Ward 24 peer habitat standings."
        breadcrumbs={[
          { label: "Green Score", href: "/citizen/green-score" },
          { label: "Progress" },
        ]}
        actions={
          <Link href="/citizen/leaderboard">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-muted text-xs text-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>Leaderboard</span>
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Current Rank"
          value="#84 / 700"
          subtitle="September 2026 cycle"
          badge={<StatusBadge status="normal" label="Top 12%" />}
        />

        <KpiCard
          title="Previous Rank"
          value="#127 / 700"
          subtitle="August 2026 cycle"
          badge={<StatusBadge status="medium" label="Top 18%" />}
        />

        <KpiCard
          title="Net Movement"
          value="+43 Positions"
          subtitle="Largest jump in Ward 24"
          badge={<StatusBadge status="normal" label="Rank Gained" />}
        />
      </div>

      {/* Trajectory Table */}
      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl">
        <h3 className="text-base font-bold text-foreground mb-4">5-Month Progression Trajectory</h3>

        <div className="divide-y divide-border font-mono text-xs">
          {history.map((h, idx) => (
            <div key={idx} className="py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground font-sans">{h.month}</span>
                <span className="text-faint hidden sm:inline font-sans">· {h.note}</span>
              </div>

              <div className="flex items-center gap-6">
                <span className="text-positive font-bold text-sm">#{h.rank}</span>
                <span className="text-foreground font-extrabold text-sm">{h.score} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
