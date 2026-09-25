"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Small building blocks shared by the onboarding steps (tokens only). */
/* ------------------------------------------------------------------ */

/* ---------------------------------- Field label ------------------- */

export interface FieldLabelProps extends React.ComponentProps<"label"> {
  hint?: React.ReactNode;
  /** Right-aligned content (e.g. the live value). */
  trailing?: React.ReactNode;
}

/** Bold field label with an optional hint line and trailing value. */
export function FieldLabel({ hint, trailing, className, children, ...props }: FieldLabelProps) {
  return (
    <div className={cn("mb-2 flex items-end justify-between gap-3", className)}>
      <label className="block text-sm font-bold text-foreground" {...props}>
        {children}
        {hint ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{hint}</span> : null}
      </label>
      {trailing ? <span className="shrink-0 font-mono text-xs font-bold text-positive">{trailing}</span> : null}
    </div>
  );
}

/* ---------------------------------- Count stepper ----------------- */

export interface CountStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Accessible name, e.g. "Number of people". */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** − / value / + control; keyboard operable, announces the value. */
export function CountStepper({ value, onChange, min = 0, max = 99, label, size = "md", className }: CountStepperProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const btn = cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors outline-none",
    "hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
    size === "sm" ? "size-8" : "size-10",
  );
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card p-0.5",
        className,
      )}
    >
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={dec} className={btn}>
        <Minus className={size === "sm" ? "size-3.5" : "size-4"} />
      </button>
      <span
        aria-live="polite"
        className={cn(
          "text-center font-mono font-bold text-foreground tabular-nums",
          size === "sm" ? "min-w-7 text-sm" : "min-w-10 text-lg",
        )}
      >
        {value}
      </span>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={inc} className={btn}>
        <Plus className={size === "sm" ? "size-3.5" : "size-4"} />
      </button>
    </div>
  );
}

/* ---------------------------------- Value tile -------------------- */

export interface ValueTileProps extends Omit<React.ComponentProps<"div">, "title"> {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: "positive" | "primary" | "electricity";
}

const VALUE_TONE: Record<NonNullable<ValueTileProps["tone"]>, string> = {
  positive: "border-positive/30 bg-positive/10 text-positive",
  primary: "border-primary/30 bg-primary/10 text-primary",
  electricity: "border-stream-electricity/30 bg-stream-electricity/10 text-stream-electricity",
};

/** Icon tile + title + one-line description (welcome value props, "why we ask" asides). */
export function ValueTile({ icon: Icon, title, description, tone = "positive", className, ...props }: ValueTileProps) {
  return (
    <div
      className={cn("flex items-start gap-3 rounded-2xl border border-border bg-card p-4", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-xl border", VALUE_TONE[tone])}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-bold text-foreground">{title}</div>
        {description ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}

/* ---------------------------------- Aside tips -------------------- */

export interface AsideTipsProps {
  title?: string;
  items: ReadonlyArray<{ title: string; text: string }>;
  className?: string;
}

/** "Why we ask" side panel used by the form steps. */
export function AsideTips({ title = "Why we ask", items, className }: AsideTipsProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-inset p-4", className)}>
      <div className="meta text-faint">{title}</div>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.title} className="flex items-start gap-2.5">
            <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-positive" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground">{item.title}</div>
              <p className="text-xs leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------- Stat cell --------------------- */

export interface StatCellProps extends React.ComponentProps<"div"> {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Chip rendered under the value (Estimated / Measured / status). */
  chip?: React.ReactNode;
}

/** Compact KPI cell used on the baseline result card. */
export function StatCell({ label, value, sub, chip, className, ...props }: StatCellProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 rounded-2xl border border-border bg-card p-4", className)} {...props}>
      <span className="meta text-faint">{label}</span>
      <span className="font-display text-xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-2xl">
        {value}
      </span>
      {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
      {chip ? <div className="mt-auto pt-1">{chip}</div> : null}
    </div>
  );
}
