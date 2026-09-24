import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/types/common";

import { TONE_CLASSES } from "./tone";

export interface SectionCardProps extends Omit<React.ComponentProps<"section">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Right-aligned header controls (buttons, chips, tabs). */
  actions?: React.ReactNode;
  /** Tints the icon tile and, for `moderate` / `critical`, the card border. */
  tone?: Tone;
  /** Extra classes for the content area. */
  contentClassName?: string;
  /** Remove the content padding (for tables and maps). */
  flush?: boolean;
  children?: React.ReactNode;
}

/** Glass card with a header row (icon tile, title, description, actions) and content. */
export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  tone,
  contentClassName,
  flush = false,
  className,
  children,
  ...props
}: SectionCardProps) {
  const t = tone ? TONE_CLASSES[tone] : null;
  const attention = tone === "moderate" || tone === "critical";

  return (
    <section
      data-slot="section-card"
      className={cn(
        "glass hover:border-foreground/20 flex flex-col rounded-2xl transition-colors",
        attention && t ? t.border : null,
        className,
      )}
      {...props}
    >
      <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl border",
                t ? cn(t.bgSoft, t.border, t.text) : "bg-primary/10 border-primary/20 text-primary",
              )}
            >
              <Icon className="size-4" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-display text-foreground text-base leading-tight font-bold tracking-tight sm:text-lg">
              {title}
            </h2>
            {description ? (
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : null}
      </header>
      <div className={cn(flush ? "pb-0" : "px-5 pb-5", contentClassName)}>{children}</div>
    </section>
  );
}
