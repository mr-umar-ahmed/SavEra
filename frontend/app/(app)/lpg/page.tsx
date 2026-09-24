import { Flame } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { CylinderCard } from "@/components/lpg/cylinder-card";
import { StartCylinderButton } from "@/components/readings/add-buttons";
import { withAuth } from "@/lib/api.server";
import { getLpgCurrent, getLpgCycles } from "@/lib/endpoints";
import { formatDate, formatNumber, pluralise } from "@/lib/format";

export const metadata: Metadata = { title: "Cooking gas" };

/**
 * The cylinder in use plus the ones before it. Two closed cylinders already
 * make the prediction yours rather than the national average, which is why the
 * history is shown as prominently as the current one.
 */
export default async function LpgPage() {
  const { current, cycles } = await withAuth(async (ctx) => {
    const [current, cycles] = await Promise.all([getLpgCurrent(ctx), getLpgCycles(24, ctx)]);
    return { current, cycles };
  });

  const past = cycles.filter((cycle) => !cycle.is_open);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Cooking gas</h1>
          <p className="text-sm text-muted-foreground">
            Mark when a cylinder starts and when it runs out — that is all we need.
          </p>
        </div>
        {current.cycle ? null : <StartCylinderButton />}
      </header>

      {current.cycle ? (
        <CylinderCard cycle={current.cycle} prediction={current.prediction} />
      ) : (
        <EmptyState
          icon={Flame}
          title="No cylinder being tracked"
          body="Start one the day you connect it, and we will tell you roughly when to book the next refill."
          action={<StartCylinderButton label="Start tracking a cylinder" />}
        />
      )}

      {past.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Past cylinders</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {past.map((cycle) => (
              <li key={cycle.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {formatDate(cycle.start_date)} – {cycle.end_date ? formatDate(cycle.end_date) : "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Lasted {pluralise(cycle.days, "day")} · {formatNumber(cycle.cylinder_kg, 1)} kg
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {cycle.daily_burn_rate ? `${formatNumber(cycle.daily_burn_rate, 2)} kg/day` : "—"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
