import { Droplets } from "lucide-react";
import type { Metadata } from "next";

import { LazyConsumptionBarChart } from "@/components/charts/chart-section";
import { EmptyState } from "@/components/common/empty-state";
import { PeerComparisonCard } from "@/components/common/peer-comparison-card";
import { TipsCard } from "@/components/common/tips-card";
import { AddWaterButton } from "@/components/readings/add-buttons";
import { withAuth } from "@/lib/api.server";
import { getWaterInsights } from "@/lib/endpoints";
import { formatMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Water" };

/**
 * Water detail page: monthly bar chart vs baseline, conservation tips and peer
 * comparison. The chart shows monthly average litres/day (from the `monthly`
 * aggregate the insights endpoint computes) rather than individual daily dots,
 * because six bars of monthly averages are the same shape as the electricity chart.
 */
export default async function WaterPage() {
  const insights = await withAuth((ctx) => getWaterInsights(180, ctx));

  if (insights.history.length === 0) {
    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold tracking-tight">Water</h1>
            <p className="text-sm text-muted-foreground">One figure a day, in litres.</p>
          </div>
          <AddWaterButton />
        </header>
        <EmptyState
          icon={Droplets}
          title="No readings yet"
          body="Log today's litres from your tank, meter or tanker delivery. Two weeks of days is enough for us to notice a leak."
          action={<AddWaterButton label="Log today" />}
        />
      </div>
    );
  }

  const chartData = insights.monthly.map((month) => ({
    label: formatMonth(month.month).split(" ")[0] ?? "",
    value: month.avg_liters,
  }));

  const totalDays = insights.history.length;
  const avgOverall =
    totalDays > 0
      ? Math.round(insights.history.reduce((sum, d) => sum + d.liters, 0) / totalDays)
      : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Water</h1>
          <p className="text-sm text-muted-foreground">
            {avgOverall !== null
              ? `About ${avgOverall} L a day across ${totalDays} logged days.`
              : "One figure a day, in litres."}
          </p>
        </div>
        <AddWaterButton />
      </header>

      {/* Monthly bar chart */}
      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-card"
        aria-label="Monthly average"
      >
        <h2 className="mb-3 font-display text-base font-semibold">Monthly average</h2>
        <LazyConsumptionBarChart
          data={chartData}
          baseline={insights.baseline?.mean}
          upperThreshold={insights.baseline?.upper_threshold}
          unit="L/day"
          accent="water"
        />
      </section>

      {/* Conservation tips */}
      <TipsCard tips={insights.tips} />

      {/* Peer comparison */}
      <PeerComparisonCard comparison={insights.peer_comparison} unit="L/day" />
    </div>
  );
}
