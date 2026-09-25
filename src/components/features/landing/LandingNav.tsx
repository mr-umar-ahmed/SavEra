"use client";

import Link from "next/link";
import { ArrowRight, Sprout } from "lucide-react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";

/** In-page anchors; every landing section owns one of these ids. */
const NAV_LINKS = [
  { href: "#problem", label: "Problem" },
  { href: "#solution", label: "Solution" },
  { href: "#innovation", label: "Innovation" },
  { href: "#impact", label: "Impact" },
  { href: "#tech", label: "Tech" },
] as const;

/**
 * Sticky landing navigation: brand, section anchors (md+), theme toggle and the
 * two auth entry points. Starts with a visually-hidden "Skip to content" link
 * that targets `#main` (the page composer renders `<main id="main">`).
 */
export function LandingNav() {
  return (
    <>
      <a
        href="#main"
        className="fixed top-3 left-3 z-[60] -translate-y-[200%] rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md outline-none transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl">
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8"
        >
          {/* Brand */}
          <Link
            href="/"
            aria-label="SAVERA home"
            className="flex shrink-0 items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-positive text-positive-foreground shadow-sm">
              <Sprout className="size-4.5" aria-hidden />
            </span>
            <span className="font-display text-lg font-extrabold tracking-wide text-foreground">SAVERA</span>
            <span className="hidden rounded-full border border-positive/25 bg-positive/10 px-2 py-0.5 font-mono text-2xs font-semibold text-positive sm:inline-flex">
              v2.0 Civic AI
            </span>
          </Link>

          {/* Section anchors */}
          <ul className="hidden items-center gap-0.5 md:flex" aria-label="Page sections">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex rounded-full px-3 py-1.5 text-sm font-medium text-soft outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link href="/auth">Login</Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/auth">
                Initialize SAVERA
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </nav>
      </header>
    </>
  );
}
