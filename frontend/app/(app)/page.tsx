import { Droplets, Flame, Zap } from "lucide-react";

import { StatCard } from "@/components/common/stat-card";
import {
  AddElectricityButton,
  AddWaterButton,
  StartCylinderButton,
} from "@/components/readings/add-buttons";
import { withAuthOr } from "@/lib/api.server";
import { getElectricityReadings, getLpgCurrent, getWaterReadings } from "@/lib/endpoints";
import { formatDate, formatNumber, formatPeriod, formatRelativeDay } from "@/lib/format";
import type { ElectricityReading, LpgCurrent, WaterReading } from "@/lib/types";

/**
 * Home: the three resources at a glance and one button each to add to them.
 *
 * Each panel degrades on its own — an unreachable backend shows "nothing logged
 * yet" for that resource instead of taking the whole page down. Baselines,
 * green score and ward comparison land here in Phase 3, once there is something
 * to compare against.
 */
export default async function HomePage() {
  const [bills, water, lpg] = await Promise.all([
    withAuthOr<ElectricityReading[]>([], (ctx) => getElectricityReadings(1, ctx)),
    withAuthOr<WaterReading[]>([], (ctx) => getWaterReadings(7, ctx)),
    withAuthOr<LpgCurrent>({ cycle: null, prediction: null }, (ctx) => getLpgCurrent(ctx)),
  ]);

  const latestBill = bills[0];
  const latestWater = water[0];
  const { cycle, prediction } = lpg;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Your home</h1>
        <p className="text-sm text-muted-foreground">
          What you have logged so far. The more you add, the more we can tell you.
        </p>
      </header>

      <section aria-label="Summary" className="space-y-3">
        <StatCard
          href="/electricity"
          label="Electricity"
          icon={Zap}
          accent="electricity"
          value={latestBill ? formatNumber(latestBill.kwh) : null}
          unit={latestBill ? "kWh" : undefined}
          caption={
            latestBill
              ? formatPeriod(latestBill.billing_period_start, latestBill.billing_period_end)
              : "Add your latest bill to start"
          }
        />
        <StatCard
          href="/water"
          label="Water"
          icon={Droplets}
          accent="water"
          value={latestWater ? formatNumber(latestWater.liters) : null}
          unit={latestWater ? "L" : undefined}
          caption={
            latestWater
              ? `Logged ${formatRelativeDay(latestWater.reading_date)}`
              : "Log today's use to start"
          }
        />
        <StatCard
          href="/lpg"
          label="Cooking gas"
          icon={Flame}
          accent="lpg"
          value={prediction ? `${formatNumber(prediction.pct_remaining)}%` : null}
          unit={prediction ? "left" : undefined}
          caption={
            prediction
              ? `About ${formatDate(prediction.estimated_finish_date)} — ${formatNumber(prediction.kg_remaining, 1)} kg to go`
              : cycle
                ? "Cylinder in use"
                : "Start a cylinder to track it"
          }
        />
      </section>

      <section aria-label="Add a reading" className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Add a reading</h2>
        <div className="flex flex-wrap gap-2">
          <AddElectricityButton label="Bill" />
          <AddWaterButton label="Water" variant="secondary" />
          {cycle ? null : <StartCylinderButton label="Cylinder" variant="secondary" />}
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
