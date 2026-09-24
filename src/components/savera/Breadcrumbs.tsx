import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  /** Omit on the current page (rendered as plain text with `aria-current`). */
  href?: string;
}

export interface BreadcrumbsProps extends React.ComponentProps<"nav"> {
  items: ReadonlyArray<BreadcrumbItem>;
}

/** Top-bar breadcrumb trail: `Citizen › Electricity › Setup`. */
export function Breadcrumbs({ items, className, ...props }: BreadcrumbsProps) {
  return (
    <nav
      data-slot="breadcrumbs"
      aria-label="Breadcrumb"
      className={cn("text-muted-foreground min-w-0 text-xs font-semibold", className)}
      {...props}
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className="text-muted-foreground/50 size-3.5 shrink-0"
                />
              ) : null}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground truncate rounded-sm transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn("truncate", last && "text-foreground")}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
