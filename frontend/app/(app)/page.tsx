import { Bell, Droplets, Zap } from "lucide-react";
import Link from "next/link";

import { LpgTrackerCard } from "@/components/cards/lpg-tracker-card";
import { ResourceSummaryCard } from "@/components/cards/resource-summary-card";
import { WardRankCard } from "@/components/cards/ward-rank-card";
import { GreenScoreGauge } from "@/components/charts/green-score-gauge";
import {
  AddElectricityButton,
  AddWaterButton,
  StartCylinderButton,
} from "@/components/readings/add-buttons";
import { Badge } from "@/components/ui/badge";
import { withAuth } from "@/lib/api.server";
import { getDashboard } from "@/lib/endpoints";
import { formatMonth } from "@/lib/format";

/**
 * Home: the three resources against the household's own usual, the Green Score, the LPG
 * tracker and the one-line ward comparison — one API round trip for the lot.
 */
export default async function HomePage() {
  const dashboard = await withAuth((ctx) => getDashboard(ctx));
  const score = dashboard.green_score;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Your home</h1>
          <p className="text-sm text-muted-foreground">
            How this month compares with your usual.
          </p>
        </div>
        <Link
          href="/alerts"
          className="focus-ring relative flex touch-target items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-card"
        >
          <Bell className="size-4" aria-hidden />
          Alerts
          {dashboard.unread_alerts > 0 ? (
            <Badge className="bg-primary text-primary-foreground tabular-nums">
              {dashboard.unread_alerts}
            </Badge>
          ) : null}
        </Link>
      </header>

      <WardRankCard rank={dashboard.ward_rank} />

      <section
        aria-label="Green Score"
        className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-card"
      >
        <GreenScoreGauge
          score={score?.total_score ?? null}
          label={score ? `Green Score · ${formatMonth(score.month)}` : "Green Score"}
        />
        {score?.ward_percentile != null ? (
          <p className="text-sm text-muted-foreground">
            Ahead of {Math.round(score.ward_percentile)}% of scored households in your ward.
          </p>
        ) : null}
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          {dashboard.normalisation_note}
        </p>
      </section>

      <section aria-label="Summary" className="space-y-3">
        <ResourceSummaryCard
          href="/electricity"
          label="Electricity"
          icon={Zap}
          accent="electricity"
          summary={dashboard.electricity}
        />
        <ResourceSummaryCard
          href="/water"
          label="Water"
          icon={Droplets}
          accent="water"
          summary={dashboard.water}
        />
        <LpgTrackerCard summary={dashboard.lpg} href="/lpg" />
      </section>

      <section aria-label="Add a reading" className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Add a reading</h2>
        <div className="flex flex-wrap gap-2">
          <AddElectricityButton label="Bill" />
          <AddWaterButton label="Water" variant="secondary" />
          {dashboard.lpg.cycle ? null : <StartCylinderButton label="Cylinder" variant="secondary" />}
        </div>
      </section>

      <p className="rounded-xl border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
        SAVERA reads nothing from your meter. Everything here comes from the bills and readings
        you enter yourself, and your figures are only ever shared as part of a ward average
        covering ten or more households.
      </p>
    </div>
  );
}
