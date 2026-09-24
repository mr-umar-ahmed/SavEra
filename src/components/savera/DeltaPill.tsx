import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { formatIN } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface DeltaPillProps extends React.ComponentProps<"span"> {
  /** Signed change, e.g. `11.4` → `+11.4 %`. */
  value: number;
  /** Unit suffix; `%` by default. Other units get a leading space (`+40 kWh`). */
  unit?: string;
  /** `true` when lower is better (consumption, cost): a rise is then shown red. */
  invert?: boolean;
  decimals?: number;
  size?: "sm" | "md";
  /** Screen-reader context, e.g. "vs last month". */
  context?: string;
}

/**
 * `+11.4 %` pill coloured by direction. Positive is green unless `invert`
 * (lower-is-better metrics such as kWh or ₹), in which case a rise is red.
 */
export function DeltaPill({
  value,
  unit = "%",
  invert = false,
  decimals = 1,
  size = "md",
  context,
  className,
  ...props
}: DeltaPillProps) {
  const finite = Number.isFinite(value);
  const rounded = finite ? Number(value.toFixed(decimals)) : 0;
  const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const good = direction === "flat" ? null : invert ? direction === "down" : direction === "up";

  const colour =
    good === null
      ? "border-border bg-muted text-muted-foreground"
      : good
        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        : "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400";

  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const magnitude = finite ? formatIN(Math.abs(rounded), decimals) : "—";
  const sign = direction === "up" ? "+" : direction === "down" ? "−" : "";
  const suffix = unit === "%" ? " %" : unit ? ` ${unit}` : "";
  const text = finite ? `${sign}${magnitude}${suffix}` : "—";

  return (
    <span
      data-slot="delta-pill"
      data-direction={direction}
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-0.5 rounded-full border font-semibold whitespace-nowrap tabular-nums",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs",
        colour,
        className,
      )}
      aria-label={context ? `${text} ${context}` : undefined}
      {...props}
    >
      <Icon aria-hidden="true" className={size === "sm" ? "size-3" : "size-3.5"} />
      {text}
    </span>
  );
}
