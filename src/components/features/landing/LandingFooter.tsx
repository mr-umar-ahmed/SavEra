"use client";

import Link from "next/link";
import { Sprout } from "lucide-react";

import { LabelChip } from "@/components/savera/LabelChip";

interface FooterLink {
  href: string;
  label: string;
}

const PORTAL_LINKS: FooterLink[] = [
  { href: "/citizen", label: "Citizen" },
  { href: "/supervisor", label: "Supervisor" },
  { href: "/gov", label: "Government" },
];

const EXPLORE_LINKS: FooterLink[] = [
  { href: "/auth", label: "Demo accounts" },
  { href: "/citizen/twin", label: "Digital Twin" },
  { href: "/gov/heatmap", label: "City heatmap" },
];

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <h3 className="font-mono text-2xs font-semibold tracking-[0.14em] text-faint uppercase">{title}</h3>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex rounded-sm text-sm text-soft outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Landing footer: brand + positioning, portal links, explore links and the mono legal line. */
export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-inset">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr] md:gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              aria-label="SAVERA home"
              className="flex w-fit items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-inset"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-positive text-positive-foreground">
                <Sprout className="size-4.5" aria-hidden />
              </span>
              <span className="font-display text-lg font-extrabold tracking-wide text-foreground">SAVERA</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-soft">
              Household-to-city resource intelligence for electricity, water and LPG — personal baselines
              for every home, anonymised demand intelligence for every ward.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <LabelChip kind="demo" size="sm" label="Demo build" />
              <LabelChip kind="simulated" size="sm" label="Integrations simulated" />
            </div>
          </div>

          <FooterColumn title="Portals" links={PORTAL_LINKS} />
          <FooterColumn title="Explore" links={EXPLORE_LINKS} />
        </div>

        <p className="mt-10 border-t border-border pt-6 text-center font-mono text-2xs leading-relaxed tracking-[0.14em] text-faint uppercase md:text-left">
          © 2026 SAVERA · Civic resource intelligence · Raichur, Karnataka · Demo build — all integrations
          simulated
        </p>
      </div>
    </footer>
  );
}
