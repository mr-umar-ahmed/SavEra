"use client";

import * as React from "react";
import { animate, motion, useInView } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared landing-page primitives (Savera Earth theme, tokens only).   */
/* Every landing section composes these so spacing, eyebrows, motion  */
/* and glows read as one system in light and dark.                    */
/* ------------------------------------------------------------------ */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/* ---------------------------------- Reveal ------------------------ */

export interface RevealProps extends React.ComponentProps<"div"> {
  /** Seconds to wait before the reveal starts (stagger lists with `index * 0.08`). */
  delay?: number;
  /** Vertical travel in px. */
  y?: number;
  /** Reveal every time the element re-enters the viewport. */
  repeat?: boolean;
  /** Fraction of the element that must be visible (0–1). */
  amount?: number;
}

/** Fade-up on scroll into view; a plain `div` when the viewer prefers reduced motion. */
export function Reveal({ children, delay = 0, y = 18, repeat = false, amount = 0.2, className, ...props }: RevealProps) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: !repeat, amount }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------- Section ----------------------- */

export type LandingSectionTone = "page" | "card" | "inset";

const SECTION_TONE: Record<LandingSectionTone, string> = {
  page: "bg-background",
  card: "bg-card",
  inset: "bg-inset",
};

export interface LandingSectionProps extends React.ComponentProps<"section"> {
  tone?: LandingSectionTone;
  /** Remove the top border (first section after the hero, or stacked sections). */
  seamless?: boolean;
  /** Tighter vertical rhythm. */
  compact?: boolean;
  /** Extra classes for the inner container. */
  containerClassName?: string;
}

/** Full-width band with a centred 7xl container and consistent vertical rhythm. */
export function LandingSection({
  tone = "page",
  seamless = false,
  compact = false,
  className,
  containerClassName,
  children,
  ...props
}: LandingSectionProps) {
  return (
    <section
      className={cn(
        "relative scroll-mt-16 overflow-hidden",
        SECTION_TONE[tone],
        !seamless && "border-t border-border",
        compact ? "py-14 sm:py-16" : "py-20 sm:py-28",
        className,
      )}
      {...props}
    >
      <div className={cn("relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", containerClassName)}>
        {children}
      </div>
    </section>
  );
}

/* ---------------------------------- Eyebrow pill ------------------ */

export type EyebrowTone = "positive" | "primary" | "critical" | "water" | "neutral";

const EYEBROW_TONE: Record<EyebrowTone, { pill: string; dot: string }> = {
  positive: { pill: "border-positive/30 bg-positive/10 text-positive", dot: "bg-positive" },
  primary: { pill: "border-primary/30 bg-primary/10 text-primary", dot: "bg-primary" },
  critical: { pill: "border-tone-critical/30 bg-tone-critical/10 text-tone-critical", dot: "bg-tone-critical" },
  water: { pill: "border-stream-water/30 bg-stream-water/10 text-stream-water", dot: "bg-stream-water" },
  neutral: { pill: "border-border bg-muted text-soft", dot: "bg-faint" },
};

export interface EyebrowPillProps extends React.ComponentProps<"span"> {
  tone?: EyebrowTone;
  icon?: LucideIcon;
  /** Show a pulsing status dot before the text (ignored when `icon` is set). */
  dot?: boolean;
}

/** Mono uppercase pill used above headlines ("THE GOLDEN PATH", "B2B2C ARCHITECTURE"). */
export function EyebrowPill({ tone = "positive", icon: Icon, dot = true, className, children, ...props }: EyebrowPillProps) {
  const t = EYEBROW_TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-2xs font-semibold tracking-[0.14em] uppercase",
        t.pill,
        className,
      )}
      {...props}
    >
      {Icon ? (
        <Icon className="size-3.5 shrink-0" aria-hidden />
      ) : dot ? (
        <span className={cn("size-1.5 shrink-0 rounded-full", t.dot)} aria-hidden />
      ) : null}
      <span>{children}</span>
    </span>
  );
}

/* ---------------------------------- Section heading --------------- */

export interface SectionHeadingProps extends Omit<React.ComponentProps<"div">, "title"> {
  eyebrow?: React.ReactNode;
  eyebrowTone?: EyebrowTone;
  eyebrowIcon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  /** Heading level for the title (default `h2`). */
  as?: "h1" | "h2" | "h3";
}

/** Eyebrow pill + display title + short description, centred by default. */
export function SectionHeading({
  eyebrow,
  eyebrowTone = "positive",
  eyebrowIcon,
  title,
  description,
  align = "center",
  as: Heading = "h2",
  className,
  ...props
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "mx-auto max-w-3xl items-center text-center" : "max-w-2xl items-start text-left",
        className,
      )}
      {...props}
    >
      {eyebrow && (
        <EyebrowPill tone={eyebrowTone} icon={eyebrowIcon}>
          {eyebrow}
        </EyebrowPill>
      )}
      <Heading className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</Heading>
      {description && <p className="text-sm leading-relaxed text-soft sm:text-base">{description}</p>}
    </div>
  );
}

/* ---------------------------------- Glow field -------------------- */

export interface GlowFieldProps extends React.ComponentProps<"div"> {
  /** `hero` = large centred bloom; `soft` = two corner tints; `stream` = electricity/water/LPG tints. */
  variant?: "hero" | "soft" | "stream";
}

/** Ambient radial tints behind a section. Decorative only (`aria-hidden`). */
export function GlowField({ variant = "soft", className, ...props }: GlowFieldProps) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} {...props}>
      {variant === "hero" && (
        <>
          <div className="absolute top-[-10%] left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-positive/20 blur-[140px]" />
          <div className="absolute top-[22%] left-[12%] h-[320px] w-[420px] rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute top-[18%] right-[8%] h-[300px] w-[380px] rounded-full bg-stream-water/10 blur-[120px]" />
        </>
      )}
      {variant === "soft" && (
        <>
          <div className="absolute -top-24 -left-24 h-[360px] w-[420px] rounded-full bg-positive/10 blur-[120px]" />
          <div className="absolute -right-24 -bottom-24 h-[360px] w-[420px] rounded-full bg-primary/10 blur-[120px]" />
        </>
      )}
      {variant === "stream" && (
        <>
          <div className="absolute top-0 left-[8%] h-[300px] w-[360px] rounded-full bg-stream-electricity/10 blur-[110px]" />
          <div className="absolute top-[30%] left-1/2 h-[300px] w-[360px] -translate-x-1/2 rounded-full bg-stream-water/10 blur-[110px]" />
          <div className="absolute right-[8%] bottom-0 h-[300px] w-[360px] rounded-full bg-stream-lpg/10 blur-[110px]" />
        </>
      )}
    </div>
  );
}

/* ---------------------------------- Count up ---------------------- */

export interface CountUpProps extends Omit<React.ComponentProps<"span">, "children" | "prefix"> {
  value: number;
  /** Seconds (default 1.4). */
  duration?: number;
  /** Formats the animated number (default: Indian grouping). */
  format?: (n: number) => string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  decimals?: number;
}

/** Counts from 0 to `value` when scrolled into view; static when reduced motion is preferred. */
export function CountUp({ value, duration = 1.4, format, prefix, suffix, decimals = 0, className, ...props }: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(0);

  const fmt = React.useCallback(
    (n: number) => (format ? format(n) : n.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })),
    [decimals, format],
  );

  React.useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [duration, inView, reduced, value]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)} {...props}>
      {prefix}
      {fmt(inView || reduced ? display : 0)}
      {suffix}
    </span>
  );
}

/* ---------------------------------- Device frame ------------------ */

export interface DeviceFrameProps extends React.ComponentProps<"div"> {
  /** Text shown in the status bar (e.g. `9:41`). */
  time?: string;
}

/** Phone mock-up frame for in-app notification / offline previews. Decorative chrome only. */
export function DeviceFrame({ time = "7:42", className, children, ...props }: DeviceFrameProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-[280px] rounded-[2.6rem] border border-border-strong bg-inset p-2.5 shadow-2xl sm:w-[300px]",
        className,
      )}
      {...props}
    >
      <div className="relative overflow-hidden rounded-[2.1rem] border border-border bg-background">
        <div className="absolute top-2 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-inset" aria-hidden />
        <div className="flex items-center justify-between px-6 pt-3.5 pb-1 font-mono text-2xs text-faint">
          <span>{time}</span>
          <span aria-hidden>●●●</span>
        </div>
        <div className="min-h-[420px] px-3 pt-2 pb-4">{children}</div>
        <div className="mx-auto mb-2 h-1 w-24 rounded-full bg-border-strong" aria-hidden />
      </div>
    </div>
  );
}

/* ---------------------------------- Feature list item ------------- */

export interface CheckItemProps extends Omit<React.ComponentProps<"li">, "title"> {
  icon?: LucideIcon;
  tone?: EyebrowTone;
  title: React.ReactNode;
  description?: React.ReactNode;
}

const CHECK_TONE: Record<EyebrowTone, string> = {
  positive: "border-positive/30 bg-positive/10 text-positive",
  primary: "border-primary/30 bg-primary/10 text-primary",
  critical: "border-tone-critical/30 bg-tone-critical/10 text-tone-critical",
  water: "border-stream-water/30 bg-stream-water/10 text-stream-water",
  neutral: "border-border bg-muted text-soft",
};

/** Icon tile + bold title + one-line description, for feature bullet lists. */
export function CheckItem({ icon: Icon, tone = "positive", title, description, className, ...props }: CheckItemProps) {
  return (
    <li className={cn("flex items-start gap-3", className)} {...props}>
      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border", CHECK_TONE[tone])} aria-hidden>
        {Icon ? <Icon className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-bold text-foreground">{title}</div>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
    </li>
  );
}
