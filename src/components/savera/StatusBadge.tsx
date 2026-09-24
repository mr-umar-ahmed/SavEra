import * as React from "react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/types/common";

import { StatusDot } from "./StatusDot";
import { TONE_CLASSES } from "./tone";

export interface StatusBadgeProps extends Omit<React.ComponentProps<"span">, "children"> {
  tone?: Tone | "danger" | "warning" | "info" | "neutral" | string;
  status?: string;
  label?: string;
  size?: "sm" | "md";
  pulse?: boolean;
  children?: React.ReactNode;
}

/**
 * Status pill: coloured dot + label, tinted by tone.
 * Maps legacy/string statuses ("danger", "warning", "info", "official", "simulation")
 * into the 5 design system tones (optimal, normal, moderate, critical, unknown).
 */
export function StatusBadge({
  tone,
  status,
  label,
  size = "md",
  pulse = false,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const raw = (status || tone || "normal") as string;
  let resolvedTone: Tone = "normal";

  if (raw === "critical" || raw === "danger" || raw === "exceedance") {
    resolvedTone = "critical";
  } else if (
    raw === "moderate" ||
    raw === "warning" ||
    raw === "medium" ||
    raw === "in_progress" ||
    raw === "official" ||
    raw === "above" ||
    raw === "higher"
  ) {
    resolvedTone = "moderate";
  } else if (raw === "optimal") {
    resolvedTone = "optimal";
  } else if (raw === "unknown" || raw === "info" || raw === "simulation" || raw === "neutral") {
    resolvedTone = "unknown";
  } else {
    resolvedTone = "normal";
  }

  const displayLabel =
    label ??
    children ??
    (raw === "official"
      ? "Official"
      : raw === "simulation"
      ? "Simulation"
      : raw === "normal"
      ? "Normal"
      : raw.toUpperCase());

  const t = TONE_CLASSES[resolvedTone] ?? TONE_CLASSES.normal;
  return (
    <span
      data-slot="status-badge"
      role="status"
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        t.bgSoft,
        t.text,
        t.border,
        className,
      )}
      {...props}
    >
      <StatusDot tone={resolvedTone} pulse={pulse} size={size} />
      {displayLabel}
    </span>
  );
}
