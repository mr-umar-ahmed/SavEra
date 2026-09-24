import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type Accent = "electricity" | "water" | "lpg" | "primary";

const ACCENT: Record<Accent, { chip: string; text: string }> = {
  electricity: { chip: "bg-electricity-soft text-electricity-fg", text: "text-electricity-fg" },
  water: { chip: "bg-water-soft text-water-fg", text: "text-water-fg" },
  lpg: { chip: "bg-lpg-soft text-lpg-fg", text: "text-lpg-fg" },
  primary: { chip: "bg-primary-soft text-primary", text: "text-primary" },
};

export interface StatCardProps {
  href: string;
  label: string;
  icon: LucideIcon;
  accent: Accent;
  /** The headline figure, already formatted. `null` renders the empty state. */
  value: string | null;
  unit?: string;
  caption: string;
}

/**
 * One resource at a glance, and a link into its page. The whole card is the
 * link so the target is comfortably bigger than the 44 px minimum on a phone.
 */
export function StatCard({ href, label, icon: Icon, accent, value, unit, caption }: StatCardProps) {
  const tone = ACCENT[accent];
  return (
    <Link
      href={href}
      className="focus-ring group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/30"
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tone.chip)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-muted-foreground">{label}</span>
        {value === null ? (
          <span className="block truncate text-base font-medium text-foreground">
            Nothing logged yet
          </span>
        ) : (
          <span className="block truncate font-display text-2xl font-bold tabular-nums">
            {value}
            {unit ? (
              <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>
            ) : null}
          </span>
        )}
        <span className="block truncate text-xs text-muted-foreground">{caption}</span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
