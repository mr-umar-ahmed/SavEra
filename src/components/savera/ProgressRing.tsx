import * as React from "react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/types/common";

import { TONE_CLASSES } from "./tone";

export interface ProgressRingProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** 0–100. */
  value?: number;
  /** Alias for value. */
  progress?: number;
  /** Outer diameter in px. */
  size?: number;
  strokeWidth?: number;
  tone?: Tone;
  /** Caption under the percentage inside the ring. */
  label?: string;
  /** Replace the default centre content. */
  children?: React.ReactNode;
  /** Accessible name, e.g. "Setup completeness". */
  ariaLabel?: string;
}

/** SVG ring for completeness / progress percentages. */
export function ProgressRing({
  value,
  progress,
  size = 112,
  strokeWidth = 9,
  tone = "normal",
  label,
  children,
  ariaLabel,
  className,
  ...props
}: ProgressRingProps) {
  const val = value ?? progress ?? 0;
  const clamped = Math.min(100, Math.max(0, Number.isFinite(val) ? val : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const t = TONE_CLASSES[tone];
  const rounded = Math.round(clamped);

  return (
    <div
      data-slot="progress-ring"
      role="progressbar"
      aria-valuenow={rounded}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? label ?? `${rounded}%`}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-foreground/10 fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("fill-none transition-[stroke-dashoffset] duration-500", t.bg.replace("bg-", "stroke-"))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <>
            <span className="font-display text-foreground text-xl font-black tracking-tight tabular-nums">
              {rounded}%
            </span>
            {label ? (
              <span className="text-muted-foreground mt-0.5 text-[10px] font-semibold tracking-wider uppercase">
                {label}
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
