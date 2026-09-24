"use client";

import * as React from "react";
import { LoaderCircle, Sparkles, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DemoControlProps extends Omit<
  React.ComponentProps<"button">,
  "onClick" | "children"
> {
  label: string;
  /** Small helper line under the label. */
  description?: string;
  onClick: () => void | Promise<void>;
  icon?: LucideIcon;
  loading?: boolean;
  size?: "sm" | "md";
}

/**
 * Presenter-only control ("Simulate field update", "Generate DR event"):
 * dashed amber outline, `Demo` mini badge and a Sparkles icon.
 * Everything it triggers is labelled demo/simulated in the UI.
 */
export function DemoControl({
  label,
  description,
  onClick,
  icon: Icon = Sparkles,
  loading = false,
  disabled,
  size = "md",
  className,
  ...props
}: DemoControlProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      data-slot="demo-control"
      aria-busy={loading || undefined}
      disabled={isDisabled}
      onClick={() => {
        if (!isDisabled) void onClick();
      }}
      className={cn(
        "group focus-visible:ring-ring/60 inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-dashed border-amber-500/60 bg-amber-500/5 text-left text-amber-700 transition-all outline-none hover:border-amber-500 hover:bg-amber-500/10 focus-visible:ring-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 dark:text-amber-300",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-amber-500/15",
          size === "sm" ? "size-6" : "size-7",
        )}
      >
        {loading ? (
          <LoaderCircle className={cn("animate-spin", size === "sm" ? "size-3.5" : "size-4")} />
        ) : (
          <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 leading-tight font-semibold">
          {label}
          <span className="rounded-full border border-amber-500/40 px-1.5 py-px font-mono text-[10px] tracking-widest uppercase">
            Demo
          </span>
        </span>
        {description ? (
          <span className="text-muted-foreground mt-0.5 text-[11px] leading-snug font-normal">
            {description}
          </span>
        ) : null}
      </span>
      {loading ? <span className="sr-only">Working…</span> : null}
    </button>
  );
}
