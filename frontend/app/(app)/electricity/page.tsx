import { Zap } from "lucide-react";
import type { Metadata } from "next";

import { ApplianceBreakdownBars } from "@/components/charts/appliance-breakdown-bars";
import { LazyConsumptionBarChart } from "@/components/charts/chart-section";
import { EmptyState } from "@/components/common/empty-state";
import { PeerComparisonCard } from "@/components/common/peer-comparison-card";
import { TipsCard } from "@/components/common/tips-card";
import { AddElectricityButton } from "@/components/readings/add-buttons";
import { withAuth } from "@/lib/api.server";
import { getElectricityInsights } from "@/lib/endpoints";
import { formatDayMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Electricity" };

/**
 * Electricity detail page: bar chart of last 6 months vs baseline, appliance
 * breakdown, conservation tips and peer comparison.
 */
export default async function ElectricityPage() {
  const insights = await withAuth((ctx) => getElectricityInsights(6, ctx));

  if (insights.history.length === 0) {
    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold tracking-tight">Electricity</h1>
            <p className="text-sm text-muted-foreground">
              One entry per billing period, straight off the bill.
            </p>
          </div>
          <AddElectricityButton />
        </header>
        <EmptyState
          icon={Zap}
          title="No bills yet"
          body="Photograph your latest bill or type in the units — six bills is where the comparisons start to mean something."
          action={<AddElectricityButton label="Add your first bill" />}
        />
      </div>
    );
  }

  const chartData = insights.history.map((point) => ({
    label: formatDayMonth(point.period_start),
    value: point.kwh_per_30d,
  }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Electricity</h1>
          <p className="text-sm text-muted-foreground">
            Your bills side by side. The dashed line is your usual.
          </p>
        </div>
        <AddElectricityButton />
      </header>

      {/* Bar chart: last 6 months vs baseline line */}
      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-card"
        aria-label="Consumption history"
      >
        <h2 className="mb-3 font-display text-base font-semibold">History</h2>
        <LazyConsumptionBarChart
          data={chartData}
          baseline={insights.baseline?.mean}
          upperThreshold={insights.baseline?.upper_threshold}
          unit="kWh/30d"
          accent="electricity"
        />
      </section>

      {/* Appliance breakdown: horizontal bars */}
      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-card"
        aria-label="Where your bill probably goes"
      >
        <h2 className="mb-3 font-display text-base font-semibold">
          Where your bill probably goes
        </h2>
        <ApplianceBreakdownBars
          breakdown={insights.appliance_breakdown}
          unknownLoad={insights.unknown_load}
          note={insights.estimate_note}
        />
      </section>

      {/* Conservation tips (only when over baseline) */}
      <TipsCard tips={insights.tips} />

      {/* Peer comparison */}
      <PeerComparisonCard comparison={insights.peer_comparison} unit="kWh/30d" />
    </div>
  );
}
