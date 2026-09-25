"use client";

import Link from "next/link";
import { ArrowRight, Landmark, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EyebrowPill, GlowField, LandingSection, Reveal } from "./primitives";

/** Closing call-to-action: sign in to the demo or jump straight to the city view. */
export function CtaSection() {
  return (
    <LandingSection
      id="cta"
      aria-labelledby="cta-title"
      className="bg-gradient-to-b from-background via-positive/10 to-inset"
    >
      <GlowField variant="soft" />

      <Reveal className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <EyebrowPill tone="positive" icon={Sparkles}>
          Interactive demo ready
        </EyebrowPill>

        <h2
          id="cta-title"
          className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          Ready to see your city&rsquo;s resource intelligence?
        </h2>

        <p className="max-w-2xl text-base leading-relaxed text-soft sm:text-lg">
          Three portals, one closed loop, fully seeded Raichur data — sign in as a citizen, a ward
          supervisor or a city department and walk the whole story in minutes.
        </p>

        <div className="flex w-full flex-col items-stretch gap-3 pt-2 sm:w-auto sm:flex-row sm:items-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/auth">
              Initialize SAVERA
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/gov">
              <Landmark aria-hidden />
              Explore the Government portal
            </Link>
          </Button>
        </div>

        <p className="font-mono text-2xs tracking-wide text-faint sm:text-xs">
          Demo accounts · password <span className="text-soft">savera</span> · OTP{" "}
          <span className="text-soft">123456</span>
        </p>
      </Reveal>
    </LandingSection>
  );
}
