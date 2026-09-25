"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { EyebrowPill, type EyebrowTone } from "@/components/features/landing/primitives";
import { cn } from "@/lib/utils";

export interface StepShellProps {
  eyebrow: string;
  eyebrowTone?: EyebrowTone;
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Chips or controls shown to the right of the heading. */
  headerAside?: React.ReactNode;
  /** Optional side panel (stacks under the body on phones). */
  aside?: React.ReactNode;
  /** Footer row: skip controls on the left, primary CTA on the right. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Card frame shared by every step: eyebrow + focusable heading, body (+ aside), footer.
 * The heading carries `data-step-heading` so the flow can move focus to it on step change.
 */
export function StepShell({
  eyebrow,
  eyebrowTone = "positive",
  icon,
  title,
  description,
  headerAside,
  aside,
  footer,
  children,
  className,
}: StepShellProps) {
  const headingId = React.useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn("overflow-hidden rounded-3xl border border-border bg-card shadow-sm", className)}
    >
      <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:py-6">
        <div className="min-w-0">
          <EyebrowPill tone={eyebrowTone} icon={icon}>
            {eyebrow}
          </EyebrowPill>
          <h1
            id={headingId}
            tabIndex={-1}
            data-step-heading
            className="mt-3 text-2xl font-extrabold tracking-tight text-foreground outline-none sm:text-3xl"
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-soft sm:text-base">{description}</p>
          ) : null}
        </div>
        {headerAside ? <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">{headerAside}</div> : null}
      </header>

      <div className={cn("px-5 py-5 sm:px-8 sm:py-6", aside && "grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]")}>
        <div className="min-w-0 space-y-6">{children}</div>
        {aside ? <div className="min-w-0 lg:pt-1">{aside}</div> : null}
      </div>

      {footer ? (
        <footer className="flex flex-col-reverse gap-3 border-t border-border bg-inset/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

/** Skeleton shown until the client mounted and the draft step was restored. */
export function OnboardingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl" aria-busy="true" aria-label="Loading setup">
      <div className="lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-8">
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <div className="size-7 animate-pulse rounded-full bg-muted" />
              <div className="h-3.5 w-28 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
        <div className="h-16 animate-pulse rounded-2xl bg-muted lg:hidden" />
        <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-card lg:mt-0">
          <div className="space-y-3 border-b border-border px-5 py-6 sm:px-8">
            <div className="h-5 w-32 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-3/4 animate-pulse rounded-xl bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="grid gap-4 px-5 py-6 sm:grid-cols-3 sm:px-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="flex justify-end gap-3 border-t border-border px-5 py-4 sm:px-8">
            <div className="h-11 w-40 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
