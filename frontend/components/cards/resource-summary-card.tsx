import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { formatNumber } from "@/lib/format";
import type { ResourceSummary, Status } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ResourceSummaryCardProps {
  href: string;
  label: string;
  icon: LucideIcon;
  accent: "electricity" | "water";
  summary: ResourceSummary;
}

/**
 * Status is carried by an icon-and-text pill, never by colour alone — a red card and an
 * amber card must still be distinguishable in greyscale or with colour-blindness.
 */
const STATUS_PILL: Record<Status, { text: string; className: string }> = {
  good: { text: "Below your usual", className: "bg-good-soft text-good-fg" },
  warn: { text: "A bit above usual", className: "bg-warn-soft text-warn-fg" },
  bad: { text: "Well above usual", className: "bg-bad-soft text-bad-fg" },
  unknown: { text: "Not enough history yet", className: "bg-secondary text-muted-foreground" },
};

const ACCENT = {
  electricity: "bg-electricity-soft text-electricity-fg",
  water: "bg-water-soft text-water-fg",
} as const;

export function ResourceSummaryCard({
  href,
  label,
  icon: Icon,
  accent,
  summary,
}: ResourceSummaryCardProps) {
  const pill = STATUS_PILL[summary.status];
  const pct = summary.pct_vs_baseline;

  return (
    <Link
      href={href}
      className="focus-ring group block rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/30"
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", ACCENT[accent])}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {summary.current === null ? (
              <span className="text-base font-medium text-foreground">Nothing logged yet</span>
            ) : (
              <>
                {formatNumber(summary.current)}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">
                  {summary.unit}
                </span>
              </>
            )}
          </p>
        </div>
        <ChevronRight
          className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", pill.className)}>
          {pill.text}
        </span>
        {pct !== null && summary.baseline ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {pct >= 0 ? "+" : "−"}
            {formatNumber(Math.abs(pct), 0)}% vs your usual {formatNumber(summary.baseline.mean)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
