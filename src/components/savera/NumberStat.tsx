import * as React from "react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/types/common";

import { TONE_CLASSES } from "./tone";

export interface NumberStatProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** Pre-formatted value (`formatIN(390)`), or a node. */
  value: React.ReactNode;
  /** Unit rendered after the value in a smaller weight (`kWh`, `L`, `kg`). */
  unit?: string;
  /** Caption under the number. */
  label: React.ReactNode;
  /** Colours the value; default inherits the foreground. */
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
}

const VALUE_SIZE = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-5xl",
} as const;

const UNIT_SIZE = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
} as const;

/** Big display number with unit and caption (`390 kWh` / "This month"). */
export function NumberStat({
  value,
  unit,
  label,
  tone,
  size = "md",
  align = "left",
  className,
  ...props
}: NumberStatProps) {
  return (
    <div
      data-slot="number-stat"
      className={cn(
        "flex flex-col gap-1",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "font-display flex items-baseline gap-1.5 leading-none font-black tracking-tight tabular-nums",
          VALUE_SIZE[size],
          tone ? TONE_CLASSES[tone].text : "text-foreground",
        )}
      >
        <span>{value}</span>
        {unit ? (
          <span className={cn("text-muted-foreground font-sans font-semibold", UNIT_SIZE[size])}>
            {unit}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</p>
    </div>
  );
}
