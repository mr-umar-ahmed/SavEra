"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface RailItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

/**
 * In-page section navigation: sticky left rail on xl screens, horizontal chips below.
 * Highlights the section nearest the top of the viewport.
 */
export function SectionRail({ items, className }: { items: RailItem[]; className?: string }) {
  const [active, setActive] = React.useState(items[0]?.id);

  React.useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Sections" className={cn("xl:sticky xl:top-28 xl:self-start", className)}>
      <ol className="bg-background/90 -mx-4 flex gap-2 overflow-x-auto px-4 py-2 backdrop-blur-md xl:mx-0 xl:flex-col xl:gap-1 xl:overflow-visible xl:bg-transparent xl:p-0 xl:backdrop-blur-none">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={() => setActive(item.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors xl:rounded-xl xl:border-transparent",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border-strong bg-card text-soft hover:bg-muted xl:bg-transparent",
                )}
              >
                <span className={cn("font-mono text-2xs", isActive ? "opacity-80" : "text-faint")}>
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
