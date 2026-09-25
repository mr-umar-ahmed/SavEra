"use client";

import Link from "next/link";
import { ArrowRight, Droplet, Flame, GraduationCap, MapPin, Sprout, Trophy, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Event identity — one place so the splash, badge and footer never drift. */
export const HACKATHON = {
  event: "HACKFINIX 2026",
  venue: "Cambridge North Campus",
  city: "Bangalore",
  line: "Made for HACKFINIX 2026 · Cambridge North Campus, Bangalore",
} as const;

const STREAMS = [
  { icon: Zap, label: "Electricity", className: "border-stream-electricity/30 bg-stream-electricity/10 text-stream-electricity" },
  { icon: Droplet, label: "Water", className: "border-stream-water/30 bg-stream-water/10 text-stream-water" },
  { icon: Flame, label: "LPG", className: "border-stream-lpg/30 bg-stream-lpg/10 text-stream-lpg" },
] as const;

interface HackfinixContentProps {
  /** Hide the "Start the demo" link when the dialog is opened from inside a portal. */
  showDemoLink?: boolean;
}

/**
 * Body of the HACKFINIX dialog. Rendered inside a `DialogContent`, so it owns the
 * accessible title/description and the closing controls.
 */
export function HackfinixContent({ showDemoLink = true }: HackfinixContentProps) {
  return (
    <div className="relative flex flex-col items-center gap-5 text-center">
      {/* Decorative bloom behind the mark */}
      <div aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-positive/20 blur-[80px]" />

      <span className="relative flex size-16 items-center justify-center rounded-full bg-positive text-positive-foreground shadow-lg ring-8 ring-positive/10">
        <Sprout className="size-7" aria-hidden />
        <span className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-popover bg-primary text-primary-foreground">
          <Trophy className="size-3.5" aria-hidden />
        </span>
      </span>

      <div className="flex flex-col items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-2xs font-semibold tracking-[0.16em] text-primary uppercase">
          <GraduationCap className="size-3.5" aria-hidden />
          Hackathon build
        </span>
        <DialogTitle className="font-display text-2xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl">
          Made for {HACKATHON.event}
        </DialogTitle>
        <p className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-sm font-semibold text-soft">
          <MapPin className="size-4 shrink-0 text-positive" aria-hidden />
          <span>{HACKATHON.venue}</span>
          <span aria-hidden className="text-faint">·</span>
          <span>{HACKATHON.city}</span>
        </p>
      </div>

      <DialogDescription className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">SAVERA</span> turns household electricity, water and
        LPG data into personal baselines, next-month forecasts and ranked actions, and turns anonymised
        homes into a live demand picture for the ward and the city.
      </DialogDescription>

      <ul className="flex flex-wrap items-center justify-center gap-2" aria-label="Resource streams">
        {STREAMS.map((s) => {
          const Icon = s.icon;
          return (
            <li
              key={s.label}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-2xs font-semibold",
                s.className,
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {s.label}
            </li>
          );
        })}
      </ul>

      <div className="flex w-full flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
        <DialogClose asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            Explore SAVERA
          </Button>
        </DialogClose>
        {showDemoLink && (
          <DialogClose asChild>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/auth">
                Start the demo
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </DialogClose>
        )}
      </div>

      <p className="font-mono text-2xs tracking-[0.14em] text-faint uppercase">
        Demo build · Raichur, Karnataka · integrations simulated
      </p>
    </div>
  );
}
