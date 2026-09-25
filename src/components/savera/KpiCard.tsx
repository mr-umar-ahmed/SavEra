"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ConfidenceLevel, EstimateInput, Tone } from "@/types/common";

import { DeltaPill } from "./DeltaPill";
import { EstimatedChip } from "./EstimatedChip";
import { TONE_CLASSES } from "./tone";

export interface KpiDelta {
  value: number;
  /** Unit suffix for the delta; `%` by default. */
  suffix?: string;
  /** `true` when lower is better (consumption, cost). */
  invert?: boolean;
  /** Screen-reader context, e.g. "vs last month". */
  context?: string;
  formatted?: string;
  direction?: "up" | "down";
  isGood?: boolean;
}

export interface KpiCardProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** Eyebrow label, e.g. "This month". */
  label?: string;
  /** Alias for label. */
  title?: string;
  /** Big display value, e.g. `formatKwh(390)` or a node. */
  value: React.ReactNode;
  /** Secondary line under the value. */
  sub?: React.ReactNode;
  /** Alias for sub. */
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  /** Tints the icon tile. */
  tone?: Tone;
  delta?: KpiDelta;
  /** Render an `Estimated` chip (with `confidence` and `inputs`). */
  estimated?: boolean;
  confidence?: ConfidenceLevel;
  inputs?: ReadonlyArray<string | EstimateInput>;
  /** Extra chips / nodes rendered in the footer row. */
  footer?: React.ReactNode;
  /** Alias for footer. */
  badge?: React.ReactNode;
  size?: "md" | "lg";
}

/**
 * Glass KPI tile: eyebrow label, large display value, sub line, optional tinted
 * icon (top-right), delta pill and the mandatory `Estimated` chip.
 */
export function KpiCard({
  label,
  title,
  value,
  sub,
  subtitle,
  icon: Icon,
  tone = "normal",
  delta,
  estimated = false,
  confidence,
  inputs,
  footer,
  badge,
  size = "md",
  className,
  ...props
}: KpiCardProps) {
  const t = TONE_CLASSES[tone];
  const displayLabel = label ?? title ?? "";
  const displaySub = sub ?? subtitle;
  const displayFooter = footer ?? badge;
  const hasFooter = Boolean(delta) || estimated || Boolean(displayFooter);

  return (
    <div
      data-slot="kpi-card"
      className={cn(
        "glass hover:border-border-strong relative flex flex-col gap-3 rounded-2xl p-5 transition-colors",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-soft text-sm leading-tight font-medium">{displayLabel}</p>
        {Icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-xl border",
              t.bgSoft,
              t.border,
              t.text,
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <div
          className={cn(
            "font-display text-foreground font-extrabold tracking-tight tabular-nums",
            size === "lg" ? "text-4xl leading-none" : "text-3xl leading-none",
          )}
        >
          {value}
        </div>
        {displaySub ? <p className="text-muted-foreground mt-2 text-sm">{displaySub}</p> : null}
      </div>

      {hasFooter ? (
        <div className="border-border mt-1 flex flex-wrap items-center gap-2 border-t pt-3">
          {delta ? (
            <DeltaPill
              value={delta.value}
              unit={delta.suffix}
              invert={delta.invert}
              context={delta.context}
              size="sm"
            />
          ) : null}
          {estimated ? <EstimatedChip confidence={confidence} inputs={inputs} size="sm" /> : null}
          {displayFooter}
        </div>
      ) : null}
    </div>
  );
}
