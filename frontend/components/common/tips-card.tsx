import { Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Conservation tips, shown only when a household is over its usual (SPEC Phase 3). The
 * heading is "What to try" rather than "You should" — the tone rule for this app is explain,
 * never blame.
 */
export function TipsCard({ tips, className }: { tips: string[]; className?: string }) {
  if (tips.length === 0) return null;

  return (
    <section
      className={cn("rounded-2xl border border-border bg-card p-4 shadow-card", className)}
      aria-label="What to try"
    >
      <h2 className="flex items-center gap-2 font-display text-base font-semibold">
        <Lightbulb className="size-4 text-warn-fg" aria-hidden />
        What to try
      </h2>
      <ul className="mt-2 space-y-2">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-2 text-sm text-muted-foreground">
            <span aria-hidden>·</span>
            {tip}
          </li>
        ))}
      </ul>
    </section>
  );
}
