"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Eye, EyeOff, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSessionStore } from "@/stores/session";
import { useDataStore } from "@/stores/data";
import { toast } from "sonner";

export default function LeaderboardPage() {
  const user = useSessionStore((s) => s.user);
  const setDisplayNamePublic = useSessionStore((s) => s.setDisplayNamePublic);
  const setLeaderboardVisibility = useDataStore((s) => s.setLeaderboardVisibility);

  const isPublic = user?.displayNamePublic ?? false;

  const handleToggle = (checked: boolean) => {
    setDisplayNamePublic(checked);
    if (user?.householdId) {
      setLeaderboardVisibility(user.householdId, checked);
    }
    toast.success(checked ? "Display name set to public" : "Privacy enabled: anonymous handle restored");
  };

  const leaders = [
    { rank: 1, name: "Green Home #1", score: 98, change: "+2", isYou: false },
    { rank: 2, name: "Ravi K. (Opt-in)", score: 96, change: "+1", isYou: false },
    { rank: 3, name: "Green Home #3", score: 95, change: "+4", isYou: false },
    { rank: 4, name: "Green Home #4", score: 93, change: "0", isYou: false },
    { rank: 5, name: "Green Home #5", score: 92, change: "-1", isYou: false },
    { rank: 84, name: isPublic ? "Priya Sharma (You)" : "Green Home #84 (You)", score: 86, change: "+43", isYou: true },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Ward 24 Conservation Leaderboard"
        subtitle="Community efficiency standings across 700 participating residences in Ward 24, Raichur."
        breadcrumbs={[
          { label: "Green Score", href: "/citizen/green-score" },
          { label: "Leaderboard" },
        ]}
        actions={
          <Link href="/citizen/progress">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-white">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Rank Movement</span>
            </Button>
          </Link>
        }
      />

      {/* Privacy Toggle Card */}
      <div className="p-4 rounded-xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </div>
          <div>
            <div className="text-xs font-bold text-white">Public Display Name Preference</div>
            <p className="text-[11px] text-white/50">
              Default is anonymous (<span className="font-mono text-emerald-400">Green Home #84</span>). Toggle to show your verified name publicly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-white/70">{isPublic ? "Visible" : "Anonymous"}</span>
          <Switch checked={isPublic} onCheckedChange={handleToggle} />
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Top Conservation Habitats</h3>
          <span className="text-xs font-mono text-white/40">700 Ward Peers</span>
        </div>

        <div className="divide-y divide-white/5">
          {leaders.map((item) => (
            <div
              key={item.rank}
              className={`py-3.5 px-4 rounded-xl flex items-center justify-between text-xs transition-colors ${
                item.isYou
                  ? "bg-emerald-500/15 border border-emerald-500/30 my-2"
                  : "hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="font-mono font-bold text-sm w-8 text-center text-white/70">
                  {item.rank === 1 ? "🥇 #1" : item.rank === 2 ? "🥈 #2" : item.rank === 3 ? "🥉 #3" : `#${item.rank}`}
                </span>
                <div>
                  <span className={`font-semibold block ${item.isYou ? "text-emerald-300 font-bold" : "text-white"}`}>
                    {item.name}
                  </span>
                  <span className="text-[10px] text-white/40">Ward 24 · XYZ Colony</span>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono">
                <span className="text-emerald-400 text-xs font-medium">{item.change}</span>
                <span className="text-base font-extrabold text-white">{item.score} <span className="text-xs text-white/40">pts</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
