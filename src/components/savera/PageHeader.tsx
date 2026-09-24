import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps extends Omit<React.ComponentProps<"header">, "title"> {
  /** Small emerald uppercase label above the title. */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Alias for description. */
  subtitle?: React.ReactNode;
  /** Buttons rendered on the right (wrap under the title on small screens). */
  actions?: React.ReactNode;
  /** Chips row rendered under the description (`LabelChip`, `StatusBadge`, …). */
  chips?: React.ReactNode;
  /** Alias for chips. */
  badge?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: PageHeaderBreadcrumb[];
  /** Heading level for the title (default `h1`). */
  as?: "h1" | "h2";
}

/** Standard page heading: eyebrow, display title, description, chips row and actions. */
export function PageHeader({
  eyebrow,
  title,
  description,
  subtitle,
  actions,
  chips,
  badge,
  backHref,
  backLabel = "Back",
  breadcrumbs,
  as: Heading = "h1",
  className,
  ...props
}: PageHeaderProps) {
  const desc = description ?? subtitle;
  const chipContent = chips ?? badge;

  return (
    <header
      data-slot="page-header"
      className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="size-3 text-white/30" />}
                {b.href ? (
                  <Link href={b.href} className="hover:text-foreground transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-foreground/80 font-medium">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : backHref ? (
          <Link
            href={backHref}
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            {backLabel}
          </Link>
        ) : null}
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <Heading className="font-display text-foreground text-2xl leading-tight font-black tracking-tight sm:text-3xl">
          {title}
        </Heading>
        {desc ? (
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
            {desc}
          </p>
        ) : null}
        {chipContent ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">{chipContent}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      ) : null}
    </header>
  );
}
