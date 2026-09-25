import * as React from "react";
import {
  Cuboid,
  FlaskConical,
  Gauge,
  Plug,
  ShieldCheck,
  Sparkle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type LabelChipKind =
  | "simulated"
  | "integration-ready"
  | "simulation"
  | "official"
  | "demo"
  | "live"
  | "new"
  | "measured";

interface KindSpec {
  label: string;
  icon: LucideIcon | null;
  className: string;
}

/** Distinct icon + colour per kind (literal classes for Tailwind scanning). */
export const LABEL_CHIP_SPEC: Record<LabelChipKind, KindSpec> = {
  simulated: {
    label: "Simulated",
    icon: FlaskConical,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-ink",
  },
  "integration-ready": {
    label: "Integration-ready",
    icon: Plug,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-ink",
  },
  simulation: {
    label: "Simulation",
    icon: Cuboid,
    className: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-ink",
  },
  official: {
    label: "Official",
    icon: ShieldCheck,
    className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-ink",
  },
  demo: {
    label: "Demo",
    icon: Sparkles,
    className:
      "border-amber-500/40 border-dashed bg-amber-500/5 text-amber-700 dark:text-amber-ink",
  },
  live: {
    label: "Live feed (simulated)",
    icon: null,
    className: "border-positive/30 bg-positive/10 text-positive dark:text-positive",
  },
  new: {
    label: "New",
    icon: Sparkle,
    className: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-ink",
  },
  measured: {
    label: "Measured",
    icon: Gauge,
    className: "border-border-strong bg-secondary font-mono tracking-wider text-soft uppercase",
  },
};

export interface LabelChipProps extends Omit<React.ComponentProps<"span">, "children"> {
  kind: LabelChipKind;
  /** Override the default text (the default is the mandated wording). */
  label?: string;
  size?: "sm" | "md";
}

/**
 * Mandatory integration / provenance labels: `Simulated`, `Integration-ready`,
 * `Simulation`, `Official`, `Demo`, `Live feed (simulated)`, `New`, `Measured`.
 */
export function LabelChip({ kind, label, size = "md", className, ...props }: LabelChipProps) {
  const spec = LABEL_CHIP_SPEC[kind];
  const Icon = spec.icon;
  return (
    <span
      data-slot="label-chip"
      data-kind={kind}
      role="status"
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-2xs" : "px-2.5 py-1 text-xs",
        spec.className,
        className,
      )}
      {...props}
    >
      {kind === "live" ? (
        <span aria-hidden="true" className="relative inline-flex size-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
          <span className="relative inline-flex h-full w-full rounded-full bg-positive" />
        </span>
      ) : Icon ? (
        <Icon aria-hidden="true" className={size === "sm" ? "size-3" : "size-3.5"} />
      ) : null}
      {label ?? spec.label}
    </span>
  );
}
