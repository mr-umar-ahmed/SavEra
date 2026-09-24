import { formatNumber } from "@/lib/format";
import type { ApplianceShare } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ApplianceBreakdownBarsProps {
  breakdown: ApplianceShare[];
  /** kWh on the bill the appliance profile does not explain. */
  unknownLoad?: number;
  note?: string;
  className?: string;
}

/**
 * Where the bill probably went: horizontal bars, biggest first.
 *
 * Plain divs rather than a charting library — these are proportional bars with labels, and
 * hand-drawing them keeps them readable at 390px, screen-reader friendly, and free of a
 * second chart bundle. (The brief's folder sketch said "Pie"; its Phase 3 text asks for
 * horizontal bars, which is also the easier read on a phone.)
 *
 * "Not explained" is shown as its own bar rather than hidden: a household whose profile is
 * incomplete should see that, not a breakdown that silently pretends to add up.
 */
export function ApplianceBreakdownBars({
  breakdown,
  unknownLoad = 0,
  note,
  className,
}: ApplianceBreakdownBarsProps) {
  const rows = [
    ...breakdown.map((share) => ({ ...share, unknown: false })),
    ...(unknownLoad > 0
      ? [
          {
            type: "unknown_load",
            label: "Not explained by your profile",
            kwh: unknownLoad,
            pct: 0,
            unknown: true,
          },
        ]
      : []),
  ];

  if (rows.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Add your appliances in Profile to see where your electricity probably goes.
      </p>
    );
  }

  const largest = Math.max(...rows.map((row) => row.kwh), 1);

  return (
    <div className={cn("space-y-3", className)} data-testid="appliance-breakdown">
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.type} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn("truncate", row.unknown && "text-muted-foreground")}>
                {row.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatNumber(row.kwh)} kWh
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-secondary"
              role="img"
              aria-label={`${row.label}: about ${formatNumber(row.kwh)} kilowatt hours`}
            >
              <div
                className={cn("h-full rounded-full", row.unknown ? "bg-muted-foreground/40" : "bg-electricity")}
                style={{ width: `${Math.max(2, (row.kwh / largest) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
