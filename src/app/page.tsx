import { HackfinixSplash } from "@/components/features/hackathon/HackfinixSplash";
import { CtaSection } from "@/components/features/landing/CtaSection";
import { HeroSection } from "@/components/features/landing/HeroSection";
import { ImpactSection } from "@/components/features/landing/ImpactSection";
import { InnovationSection } from "@/components/features/landing/InnovationSection";
import { LandingFooter } from "@/components/features/landing/LandingFooter";
import { LandingNav } from "@/components/features/landing/LandingNav";
import { LifelineSection } from "@/components/features/landing/LifelineSection";
import { ProblemSection } from "@/components/features/landing/ProblemSection";
import { SolutionSection } from "@/components/features/landing/SolutionSection";
import { TechSection } from "@/components/features/landing/TechSection";

/**
 * SAVERA landing page.
 *
 * Every section is a self-contained client component built on the shared landing
 * primitives (src/components/features/landing/primitives.tsx), so this page stays a
 * server component that only composes them. Band tones alternate so adjacent sections
 * never share a surface without a border:
 *
 *   hero (page) → problem (card) → solution (page) → innovation (card)
 *   → lifeline (page) → impact (card) → tech (inset) → cta (background→inset gradient)
 *   → footer (inset)
 *
 * `<main id="main">` is the skip-link target rendered by LandingNav; the nav anchors
 * resolve to #problem, #solution, #innovation, #impact and #tech inside the sections.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-positive/30">
      <LandingNav />

      <main id="main" tabIndex={-1} className="relative outline-none">
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <InnovationSection />
        <LifelineSection />
        <ImpactSection />
        <TechSection />
        <CtaSection />
      </main>

      <LandingFooter />
      <HackfinixSplash />
    </div>
  );
}
