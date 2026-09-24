import { cn } from "@/lib/utils";

/**
 * The SAVERA mark: a sun rising over a horizon — *savera* is Hindi for daybreak
 * — with three rays that stand for the three resources the app tracks.
 *
 * Drawn inline rather than loaded as a file so it inherits `currentColor` and
 * stays crisp in both themes with no flash while an image loads.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="SAVERA"
      className={cn("size-8 text-primary", className)}
      fill="none"
    >
      <circle cx="16" cy="19" r="7" className="fill-current opacity-20" />
      <path
        d="M7 19a9 9 0 0 1 18 0"
        className="stroke-current"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16 4v3M5.6 8.6l2.1 2.1M26.4 8.6l-2.1 2.1"
        className="stroke-current"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M3 24.5h26" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-xl font-extrabold tracking-tight text-foreground",
        className,
      )}
    >
      SAVERA
    </span>
  );
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {showText ? <Wordmark /> : null}
    </span>
  );
}
