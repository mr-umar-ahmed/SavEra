"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const SIZE = 160;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** The arc is three quarters of a circle, opening downwards. */
const ARC_FRACTION = 0.75;
const ARC_LENGTH = CIRCUMFERENCE * ARC_FRACTION;

export interface GreenScoreGaugeProps {
  /** 0–100, or null when there is nothing scored yet. */
  score: number | null;
  /** Set false in tests and for reduced motion; the arc then renders at its final value. */
  animate?: boolean;
  label?: string;
  className?: string;
}

/** Green above 70, amber 40–70, red below — the same three bands as the summary cards. */
export function bandFor(score: number): "good" | "warn" | "bad" {
  if (score >= 70) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

const BAND_CLASS = {
  good: "stroke-good",
  warn: "stroke-warn",
  bad: "stroke-bad",
} as const;

/**
 * The Green Score dial: a hand-written SVG rather than a chart library, because it is one
 * arc and recharts would cost more than it gives here.
 *
 * Accessible as a meter, so a screen reader hears "72 out of 100" rather than a description
 * of a shape. The sweep animates on mount unless `animate` is false or the viewer has asked
 * for reduced motion.
 */
export function GreenScoreGauge({
  score,
  animate = true,
  label = "Green Score",
  className,
}: GreenScoreGaugeProps) {
  const target = score === null ? 0 : Math.max(0, Math.min(100, score));
  const [shown, setShown] = useState(animate ? 0 : target);

  useEffect(() => {
    if (!animate) {
      setShown(target);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(target);
      return;
    }
    const frame = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(frame);
  }, [animate, target]);

  const band = bandFor(target);
  const dash = (shown / 100) * ARC_LENGTH;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score === null ? undefined : target}
          aria-valuetext={score === null ? "Not scored yet" : `${Math.round(target)} out of 100`}
          aria-label={label}
          // The arc starts at the lower left: rotate so the 3/4 sweep opens downwards.
          className="-rotate-[225deg]"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className="stroke-secondary"
            strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className={cn(BAND_CLASS[band], "transition-[stroke-dasharray] duration-1000 ease-brand")}
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold tabular-nums" data-testid="gauge-value">
            {score === null ? "—" : Math.round(target)}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {score === null ? "not scored yet" : "out of 100"}
          </span>
        </div>
      </div>
      <p className="mt-1 font-display text-sm font-semibold">{label}</p>
    </div>
  );
}
