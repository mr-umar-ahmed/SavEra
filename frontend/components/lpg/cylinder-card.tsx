import { AlertTriangle, Flame } from "lucide-react";

import { CloseCylinderButton } from "@/components/readings/add-buttons";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber, formatRelativeDay, pluralise } from "@/lib/format";
import type { LpgCycle, LpgPrediction } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The cylinder currently in use, with how much is left and roughly when it runs
 * out. The estimate is the average of your own past cylinders (or the national
 * average until you have one), and the card says so — it is arithmetic on your
 * own dates, not a forecast.
 */
export function CylinderCard({
  cycle,
  prediction,
}: {
  cycle: LpgCycle;
  prediction: LpgPrediction | null;
}) {
  const pct = prediction ? Math.max(0, Math.min(100, prediction.pct_remaining)) : null;
  const empty = prediction ? prediction.kg_remaining <= 0 : false;
  const dueSoon = prediction?.should_alert_now ?? false;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Flame className="size-4 text-lpg-fg" aria-hidden />
            Cylinder in use
          </p>
          <p className="font-display text-3xl font-bold tabular-nums">
            {pct === null ? "—" : `${formatNumber(pct)}%`}
            <span className="ml-1.5 text-sm font-semibold text-muted-foreground">left</span>
          </p>
        </div>
        {empty ? (
          <Badge className="gap-1 bg-bad-soft text-bad-fg">
            <AlertTriangle className="size-3" aria-hidden />
            Past empty
          </Badge>
        ) : dueSoon ? (
          <Badge className="gap-1 bg-warn-soft text-warn-fg">
            <AlertTriangle className="size-3" aria-hidden />
            Book a refill
          </Badge>
        ) : (
          <Badge className="bg-good-soft text-good-fg">On track</Badge>
        )}
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-secondary"
        role="img"
        aria-label={pct === null ? "Gas remaining unknown" : `${formatNumber(pct)} per cent of the cylinder left`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700",
            empty ? "bg-bad" : dueSoon ? "bg-warn" : "bg-lpg",
          )}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Gas left</dt>
          <dd className="font-medium tabular-nums">
            {prediction ? `${formatNumber(prediction.kg_remaining, 1)} kg` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Likely to run out</dt>
          <dd className="font-medium">
            {prediction ? (
              <>
                {formatRelativeDay(prediction.estimated_finish_date)}
                <span className="block text-xs font-normal text-muted-foreground">
                  {formatDate(prediction.estimated_finish_date)}
                </span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Connected</dt>
          <dd className="font-medium">
            {formatDate(cycle.start_date)}
            <span className="block text-xs font-normal text-muted-foreground">
              {pluralise(cycle.days, "day")} ago
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Your usual</dt>
          <dd className="font-medium tabular-nums">
            {prediction ? `${formatNumber(prediction.burn_rate_kg_per_day, 2)} kg a day` : "—"}
          </dd>
        </div>
      </dl>

      <CloseCylinderButton cycleId={cycle.id} startDate={cycle.start_date} fullWidth />

      <p className="text-xs text-muted-foreground">
        Worked out from how long your past cylinders lasted — an estimate, not a meter reading.
      </p>
    </section>
  );
}
