import { Users } from "lucide-react";

import type { WardRank } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The always-visible one-liner comparing this household with its ward (SPEC Phase 3:
 * "Ward rank: 'You use X% less than your ward average' — one line, always visible").
 *
 * When the ward has fewer than ten households with readings, this shows *why* there is no
 * comparison rather than hiding — the privacy floor is a feature worth explaining.
 */
export function WardRankCard({ rank, className }: { rank: WardRank; className?: string }) {
  return (
    <section
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-border bg-primary-soft/60 p-4",
        className,
      )}
      aria-label="How you compare with your ward"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
        <Users className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground">
          {rank.available ? rank.line : "No ward comparison yet"}
        </p>
        <p className="text-xs text-muted-foreground">
          {rank.available
            ? "Ward figures are averages across ten or more households — never anyone's individual use."
            : (rank.reason ?? "We need more households in your ward first.")}
        </p>
      </div>
    </section>
  );
}
