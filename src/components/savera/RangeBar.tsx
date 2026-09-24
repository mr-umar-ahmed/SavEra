import * as React from "react";

import { formatIN } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types/common";

import { TONE_CLASSES } from "./tone";

export interface RangeBarProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** Current value marker; omit to show only the band. */
  value?: number;
  /** Band lower bound (e.g. baseline low). */
  low: number;
  /** Band upper bound (e.g. baseline high). */
  high: number;
  /** Track extent; defaults to a padded envelope around the band and value. */
  min?: number;
  max?: number;
  unit?: string;
  /** Marker colour; defaults to the tone implied by the value's position. */
  tone?: Tone;
  valueLabel?: string;
  bandLabel?: string;
  decimals?: number;
  /** Custom number formatter (default Indian grouping + unit). */
  format?: (n: number) => string;
}

function positionTone(value: number, low: number, high: number): Tone {
  if (value < low) return "optimal";
  if (value <= high) return "normal";
  return value <= high * 1.2 ? "moderate" : "critical";
}

/**
 * A value marker plotted against a low–high band (baseline bands, target ranges).
 * Always renders the numbers as text, so colour is never the only cue.
 */
export function RangeBar({
  value,
  low,
  high,
  min,
  max,
  unit,
  tone,
  valueLabel = "Current",
  bandLabel = "Baseline band",
  decimals = 0,
  format,
  className,
  ...props
}: RangeBarProps) {
  const fmt =
    format ?? ((n: number) => (unit ? `${formatIN(n, decimals)} ${unit}` : formatIN(n, decimals)));

  const span = Math.max(high - low, 1);
  const lo = min ?? Math.min(low, value ?? low) - span * 0.6;
  const hi = max ?? Math.max(high, value ?? high) + span * 0.6;
  const extent = Math.max(hi - lo, 1);
  const pct = (n: number) => Math.min(100, Math.max(0, ((n - lo) / extent) * 100));

  const bandLeft = pct(low);
  const bandWidth = Math.max(pct(high) - bandLeft, 0.5);
  const markerTone: Tone =
    tone ?? (value === undefined ? "unknown" : positionTone(value, low, high));
  const t = TONE_CLASSES[markerTone];
  const markerPct = value === undefined ? null : pct(value);

  const summary =
    value === undefined
      ? `${bandLabel} ${fmt(low)} to ${fmt(high)}`
      : `${valueLabel} ${fmt(value)}; ${bandLabel} ${fmt(low)} to ${fmt(high)}`;

  return (
    <div
      data-slot="range-bar"
      role="img"
      aria-label={summary}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {markerPct !== null && value !== undefined ? (
        <div className="relative h-5">
          <span
            className={cn(
              "absolute -translate-x-1/2 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums",
              t.bgSoft,
              t.text,
              t.border,
            )}
            style={{ left: `clamp(2.5rem, ${markerPct}%, calc(100% - 2.5rem))` }}
          >
            {valueLabel}: {fmt(value)}
          </span>
        </div>
      ) : null}

      <div className="bg-muted relative h-2.5 w-full rounded-full dark:bg-white/10">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 rounded-full border border-emerald-500/40 bg-emerald-500/25"
          style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
        />
        {markerPct !== null ? (
          <span
            aria-hidden="true"
            className={cn(
              "ring-background absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2",
              t.bg,
            )}
            style={{ left: `${markerPct}%` }}
          />
        ) : null}
      </div>

      <div className="text-muted-foreground relative h-4 text-[11px] tabular-nums">
        <span className="absolute -translate-x-1/2" style={{ left: `${bandLeft}%` }}>
          {fmt(low)}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${bandLeft + bandWidth}%` }}>
          {fmt(high)}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">
        <span
          className="mr-1.5 inline-block size-2 rounded-sm bg-emerald-500/40 align-middle"
          aria-hidden="true"
        />
        {bandLabel}: {fmt(low)} – {fmt(high)}
      </p>
    </div>
  );
}
