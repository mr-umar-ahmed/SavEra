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
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-muted text-xs text-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-positive" />
              <span>Rank Movement</span>
            </Button>
          </Link>
        }
      />

      {/* Privacy Toggle Card */}
      <div className="p-4 rounded-xl border border-border bg-card backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-positive/10 border border-positive/20 flex items-center justify-center text-positive shrink-0">
            {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Public Display Name Preference</div>
            <p className="text-xs text-muted-foreground">
              Default is anonymous (<span className="font-mono text-positive">Green Home #84</span>). Toggle to show your verified name publicly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-soft">{isPublic ? "Visible" : "Anonymous"}</span>
          <Switch checked={isPublic} onCheckedChange={handleToggle} />
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">Top Conservation Habitats</h3>
          <span className="text-xs font-mono text-faint">700 Ward Peers</span>
        </div>

        <div className="divide-y divide-border">
          {leaders.map((item) => (
            <div
              key={item.rank}
              className={`py-3.5 px-4 rounded-xl flex items-center justify-between text-xs transition-colors ${
                item.isYou
                  ? "bg-positive/15 border border-positive/30 my-2"
                  : "hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="font-mono font-bold text-sm w-8 text-center text-soft">
                  {item.rank === 1 ? "🥇 #1" : item.rank === 2 ? "🥈 #2" : item.rank === 3 ? "🥉 #3" : `#${item.rank}`}
                </span>
                <div>
                  <span className={`font-semibold block ${item.isYou ? "text-positive font-bold" : "text-foreground"}`}>
                    {item.name}
                  </span>
                  <span className="text-2xs text-faint">Ward 24 · XYZ Colony</span>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono">
                <span className="text-positive text-xs font-medium">{item.change}</span>
                <span className="text-base font-extrabold text-foreground">{item.score} <span className="text-xs text-faint">pts</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
