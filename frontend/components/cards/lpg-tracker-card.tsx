import { AlertTriangle, Flame } from "lucide-react";
import Link from "next/link";

import { formatDate, formatNumber, formatRelativeDay } from "@/lib/format";
import type { LpgSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface LpgTrackerCardProps {
  summary: LpgSummary;
  /** Wrap the card in a link to the LPG page (the dashboard does; the LPG page itself does not). */
  href?: string;
  className?: string;
}

/**
 * Percentage of the cylinder left plus when it is likely to run out (SPEC Phase 3: "LPG
 * tracker: progress bar showing % cylinder remaining + estimated finish date").
 *
 * The finish date shown here is `prediction.estimated_finish_date` verbatim — the same
 * field `GET /lpg/current` returns — so the card and the API can never disagree.
 */
export function LpgTrackerCard({ summary, href, className }: LpgTrackerCardProps) {
  const { cycle, prediction } = summary;

  const body = !cycle ? (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lpg-soft text-lpg-fg">
        <Flame className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Cooking gas</p>
        <p className="font-medium">No cylinder being tracked</p>
      </div>
    </div>
  ) : (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lpg-soft text-lpg-fg">
            <Flame className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cooking gas</p>
            <p className="font-display text-2xl font-bold tabular-nums" data-testid="lpg-pct">
              {prediction ? `${formatNumber(prediction.pct_remaining)}%` : "—"}
              <span className="ml-1 text-xs font-semibold text-muted-foreground">left</span>
            </p>
          </div>
        </div>
        {prediction?.kg_remaining === 0 ? (
          <span className="flex items-center gap-1 rounded-full bg-bad-soft px-2.5 py-1 text-xs font-semibold text-bad-fg">
            <AlertTriangle className="size-3" aria-hidden />
            Past empty
          </span>
        ) : prediction?.should_alert_now ? (
          <span className="flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn-fg">
            <AlertTriangle className="size-3" aria-hidden />
            Book a refill
          </span>
        ) : (
          <span className="rounded-full bg-good-soft px-2.5 py-1 text-xs font-semibold text-good-fg">
            On track
          </span>
        )}
      </div>

      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary"
        role="img"
        aria-label={
          prediction
            ? `${formatNumber(prediction.pct_remaining)} per cent of the cylinder left`
            : "Gas remaining unknown"
        }
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700",
            prediction?.kg_remaining === 0
              ? "bg-bad"
              : prediction?.should_alert_now
                ? "bg-warn"
                : "bg-lpg",
          )}
          style={{ width: `${Math.max(0, Math.min(100, prediction?.pct_remaining ?? 0))}%` }}
        />
      </div>

      {prediction ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Likely to run out{" "}
          <span className="font-medium text-foreground" data-testid="lpg-finish-date">
            {formatRelativeDay(prediction.estimated_finish_date)}
          </span>{" "}
          ({formatDate(prediction.estimated_finish_date)}) · {formatNumber(prediction.kg_remaining, 1)} kg
          to go
        </p>
      ) : null}
    </>
  );

  const shell = cn(
    "block rounded-2xl border border-border bg-card p-4 shadow-card",
    href && "focus-ring transition-colors hover:border-primary/30",
    className,
  );

  return href ? (
    <Link href={href} className={shell}>
      {body}
    </Link>
  ) : (
    <section className={shell}>{body}</section>
  );
}
