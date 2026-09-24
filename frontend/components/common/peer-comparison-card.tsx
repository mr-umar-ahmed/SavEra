import { Users } from "lucide-react";

import { formatNumber } from "@/lib/format";
import type { PeerComparison } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * "Households like yours in your ward use X on average."
 *
 * When the ward is below the ten-household privacy floor this says so plainly instead of
 * disappearing — people should know the comparison exists and why it is withheld.
 */
export function PeerComparisonCard({
  comparison,
  unit,
  className,
}: {
  comparison: PeerComparison;
  unit: string;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-card p-4 shadow-card", className)}
      aria-label="How you compare with your ward"
    >
      <h2 className="flex items-center gap-2 font-display text-base font-semibold">
        <Users className="size-4 text-primary" aria-hidden />
        Your ward
      </h2>

      {!comparison.available ? (
        <p className="mt-2 text-sm text-muted-foreground">{comparison.reason}</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{comparison.ward_name} average</dt>
              <dd className="font-medium tabular-nums">
                {formatNumber(comparison.avg_per_household ?? 0)} {unit}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Yours</dt>
              <dd className="font-medium tabular-nums">
                {comparison.yours === null ? "—" : `${formatNumber(comparison.yours)} ${unit}`}
              </dd>
            </div>
          </dl>
          {comparison.pct_diff !== null ? (
            <p className="mt-2 text-sm font-medium">
              {comparison.pct_diff <= 0
                ? `You use ${formatNumber(Math.abs(comparison.pct_diff), 0)}% less than your ward average.`
                : `You use ${formatNumber(comparison.pct_diff, 0)}% more than your ward average.`}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Averaged across {comparison.household_count} households — never anyone&rsquo;s
            individual use.
          </p>
        </>
      )}
    </section>
  );
}
