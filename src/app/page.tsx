"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Box,
  CheckCircle2,
  Cpu,
  Droplet,
  Flame,
  Globe,
  Layers,
  Mic,
  QrCode,
  Repeat,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero3D = dynamic(
  () => import("@/components/features/landing/Hero3D").then((m) => m.Hero3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[380px] sm:h-[460px] lg:h-[500px] rounded-3xl border border-white/10 bg-white/[0.02] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    ),
  }
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050B08] text-white selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#050B08]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="h-4 w-4 text-[#050B08]" />
            </div>
            <span className="font-extrabold tracking-wider text-lg text-white font-sans">
              SAV<span className="text-emerald-400">ERA</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 ml-1">
              v2.0 Civic AI
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth">
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs h-8"
              >
                Sign In / Demo
              </Button>
            </Link>
            <Link href="/auth">
              <Button
                size="sm"
                className="bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-semibold h-8 gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <span>Initialize SAVERA</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* 1. Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-500/15 to-teal-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-gradient-to-tr from-cyan-500/10 to-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Positioning & Headline */}
            <div className="lg:col-span-7 text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI-POWERED RESOURCE INTELLIGENCE</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
                SAV<span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">ERA</span>
              </h1>

              <p className="text-sm sm:text-base text-white/80 leading-relaxed font-normal">
                SAVERA is an AI-powered resource intelligence and action platform that measures household electricity, water and LPG usage, builds personalised baselines, detects abnormal consumption, predicts next-month consumption and cost, gives actionable recommendations, connects citizens with utility services, and — through digital simulation, authorised integrations, compatible hardware and human-verified government workflows — helps translate digital insight into real-world resource-saving action.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2">
                <Link href="/auth" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:from-emerald-400 hover:to-teal-400 font-bold px-8 h-12 text-sm gap-2 shadow-xl shadow-emerald-500/25"
                  >
                    <span>Initialize SAVERA</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#what-savera-does" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-white/15 bg-white/[0.03] hover:bg-white/10 text-white font-medium px-6 h-12 text-sm"
                  >
                    See how it works
                  </Button>
                </a>
              </div>

              <div className="pt-2 text-[11px] font-mono text-white/40 flex items-center gap-4">
                <span>📍 Deployed Demo: Raichur, Karnataka</span>
                <span>•</span>
                <span>Ward 24 Pilot</span>
              </div>
            </div>

            {/* Right Column: 3D Interactive Model */}
            <div className="lg:col-span-5">
              <Hero3D />
            </div>
          </div>
        </div>
      </section>

      {/* 2. What SAVERA Does Section */}
      <section id="what-savera-does" className="py-20 border-t border-white/10 bg-[#070D0A]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Core Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">What SAVERA Does</h2>
            <p className="text-xs sm:text-sm text-white/60 mt-3">
              One unified platform managing domestic utility resources across three vital lifelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Electricity Stream */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-amber-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="text-xs font-mono text-amber-400 font-semibold uppercase tracking-wider mb-1">
                  Electricity
                </div>
                <h3 className="text-base font-bold text-white mb-3">Power Intelligence & Cost Forecast</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  &ldquo;Digitise my home &rarr; understand where electricity went &rarr; know next month&apos;s bill &rarr; act.&rdquo;
                </p>
              </div>
              <div className="pt-6 border-t border-white/5 mt-6 flex items-center justify-between text-[11px] text-white/50 font-mono">
                <span>GESCOM LT-2 Tariff</span>
                <span className="text-amber-400 font-bold">~390 kWh Baseline</span>
              </div>
            </div>

            {/* Water Stream */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-teal-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5">
                  <Droplet className="h-6 w-6" />
                </div>
                <div className="text-xs font-mono text-teal-400 font-semibold uppercase tracking-wider mb-1">
                  Water
                </div>
                <h3 className="text-base font-bold text-white mb-3">Water Experience & Area Pipeline</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  &ldquo;Report my supply experience &rarr; AI groups the area &rarr; supervisor verifies on the ground &rarr; department adjusts &rarr; I&apos;m notified.&rdquo;
                </p>
              </div>
              <div className="pt-6 border-t border-white/5 mt-6 flex items-center justify-between text-[11px] text-white/50 font-mono">
                <span>Ward 24 Municipal Feeder</span>
                <span className="text-teal-400 font-bold">&lt; 24h Ground Verify</span>
              </div>
            </div>

            {/* LPG Stream */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-rose-500/40 transition-all flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5">
                  <Flame className="h-6 w-6" />
                </div>
                <div className="text-xs font-mono text-rose-400 font-semibold uppercase tracking-wider mb-1">
                  LPG
                </div>
                <h3 className="text-base font-bold text-white mb-3">Cylinder Burn Rate & Refill Prediction</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  &ldquo;Track my cylinder &rarr; understand my consumption &rarr; get alerted when usage changes &rarr; predict my refill.&rdquo;
                </p>
              </div>
              <div className="pt-6 border-t border-white/5 mt-6 flex items-center justify-between text-[11px] text-white/50 font-mono">
                <span>14.2 kg Domestic</span>
                <span className="text-rose-400 font-bold">0.57 kg/day Burn</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The Closed Loop Section */}
      <section className="py-20 border-t border-white/10 bg-[#050B08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">The Closed-Loop Intelligence Cycle</h2>
            <p className="text-xs sm:text-sm text-white/60 mt-3">
              Six synchronized stages translating household raw telemetry into verified municipal efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { step: "01", name: "Measure", desc: "Bills, barcode scan & telemetry", icon: BarChart3 },
              { step: "02", name: "Analyse", desc: "Baselines & anomaly detection", icon: Sparkles },
              { step: "03", name: "Predict", desc: "Next-month kWh, ₹ & refill date", icon: TrendingDown },
              { step: "04", name: "Recommend", desc: "Ranked actions with projected ROI", icon: CheckCircle2 },
              { step: "05", name: "Act", desc: "Digital twin & demand response", icon: Cpu },
              { step: "06", name: "Learn", desc: "Closed-loop feedback calibration", icon: Repeat },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-emerald-400">{s.step}</span>
                    <Icon className="h-4 w-4 text-white/40" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">{s.name}</h3>
                    <p className="text-[11px] text-white/50 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Three Portals, One Data Loop */}
      <section className="py-20 border-t border-white/10 bg-[#070D0A]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Portals & Stakeholders</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">Three Portals, One Data Loop</h2>
            <p className="text-xs sm:text-sm text-white/60 mt-3">
              Role-tailored dashboards connected through anonymized municipal data aggregation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Portal 1: Citizen */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
              <div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Citizen</h3>
                <p className="text-xs text-white/70 leading-relaxed mb-6">
                  &ldquo;Digitise your home, understand your electricity, water and LPG, and earn your Green Score.&rdquo;
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Appliance reconciliation & next-month forecast</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>LPG refill prediction & leakage safety alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Green Score #84/700 with peer normalisation</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/citizen">
                  <Button className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                    Launch Citizen Portal
                  </Button>
                </Link>
              </div>
            </div>

            {/* Portal 2: Area Supervisor */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 flex flex-col justify-between hover:border-teal-500/40 transition-all">
              <div>
                <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Area Supervisor (Councillor)</h3>
                <p className="text-xs text-white/70 leading-relaxed mb-6">
                  &ldquo;Monitor your ward, review AI-grouped alerts, verify on the ground and coordinate with departments.&rdquo;
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                    <span>Ward 24 AI-grouped water alerts (XYZ Colony)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                    <span>Live assistant assignment & field verification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                    <span>Area grid telemetry & push broadcast terminal</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/supervisor">
                  <Button className="w-full bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-semibold">
                    Launch Supervisor Portal
                  </Button>
                </Link>
              </div>
            </div>

            {/* Portal 3: Government Department */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
              <div>
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
                  <Globe className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Government Department</h3>
                <p className="text-xs text-white/70 leading-relaxed mb-6">
                  &ldquo;City-level demand intelligence, forecasting and resource planning for Electricity, Water and Gas.&rdquo;
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>City grid 842 MW load & Automated Demand Response</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>Water board 12.4M L planning & case escalation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>GIS heatmaps & official public disruption alerts</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/gov">
                  <Button className="w-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
                    Launch Government Portal
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Connected Layer Section */}
      <section className="py-20 border-t border-white/10 bg-[#050B08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Simulation & Integrations</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">The Connected Layer</h2>
            <p className="text-xs sm:text-sm text-white/60 mt-3">
              Simulating, integrating, and coordinating smart hardware across residential and municipal domains.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Digital Twin",
                badge: "Simulation",
                badgeColor: "border-sky-500/30 text-sky-400 bg-sky-500/10",
                icon: Box,
                desc: "Real-time 3D and 2D schematic load simulation. Adjust appliance setpoints, test DR responses, and evaluate projected kWh/₹ savings dynamically.",
              },
              {
                title: "Voice Assistant",
                badge: "Simulated",
                badgeColor: "border-purple-500/30 text-purple-400 bg-purple-500/10",
                icon: Mic,
                desc: "Natural language assistant with speech synthesis and text fallback. Query consumption, compare baselines, and execute twin actions conversationally.",
              },
              {
                title: "Smart Appliance Scan",
                badge: "Simulation",
                badgeColor: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
                icon: QrCode,
                desc: "Onboarding accelerator that maps manufacturer ratings and BEE star labels instantly from 15 pre-calibrated product barcodes.",
              },
              {
                title: "Consent-Based Integration",
                badge: "Integration-ready",
                badgeColor: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
                icon: Shield,
                desc: "API Setu-style digital utility linking with granular data permissions, OTP authentication, and single-click consent revocation.",
              },
              {
                title: "Utility Services Hub",
                badge: "Simulated",
                badgeColor: "border-amber-500/30 text-amber-400 bg-amber-500/10",
                icon: Layers,
                desc: "Simulated utility bill payments with downloadable receipts, automated LPG refill bookings, and SMS/push reminder configuration.",
              },
              {
                title: "Automated Demand Response",
                badge: "Integration-ready",
                badgeColor: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
                icon: Cpu,
                desc: "OpenADR-compatible peak load curtailment coordinating domestic AC and EV loads to avert grid transformer stress during peak hours.",
              },
              {
                title: "Official Disruption Alerts",
                badge: "Official",
                badgeColor: "border-amber-500/40 text-amber-300 bg-amber-500/15",
                icon: ShieldAlert,
                desc: "Legally-binding, human-published municipal advisories for scheduled substation maintenance, pipeline repairs, and emergency alerts.",
              },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${c.badgeColor}`}>
                        {c.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{c.title}</h3>
                    <p className="text-xs text-white/60 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Impact Stats Section */}
      <section className="py-20 border-t border-white/10 bg-[#070D0A]/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-mono mb-2">
              <span>Estimated · illustrative metrics</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">Measurable Civic & Resource Impact</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-extrabold font-mono text-emerald-400">8–12%</span>
                <TrendingDown className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Household Electricity Reduction</h3>
              <p className="text-[11px] text-white/50 mt-1">
                Estimated via appliance disaggregation and personalized baselines.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-extrabold font-mono text-teal-400">&lt; 24 h</span>
                <Droplet className="h-5 w-5 text-teal-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Water Verification Response</h3>
              <p className="text-[11px] text-white/50 mt-1">
                Demo pipeline from citizen report grouping to supervisor field dispatch.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-extrabold font-mono text-cyan-400">~5,000</span>
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Participating Habitats</h3>
              <p className="text-[11px] text-white/50 mt-1">
                Calibrated across Raichur Ward 24 residential peer clusters.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-extrabold font-mono text-amber-400">14.2%</span>
                <Zap className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Peak Load Averted</h3>
              <p className="text-[11px] text-white/50 mt-1">
                Estimated via Automated Demand Response during critical evening peak.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer CTA Section */}
      <section className="py-24 border-t border-white/10 bg-gradient-to-b from-[#050B08] via-emerald-950/20 to-[#030604] relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Demo Ready</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready to Explore Resource Intelligence?
          </h2>

          <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
            Experience the complete closed-loop cycle across Citizen, Supervisor, and Government portals with fully seeded Raichur data.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-emerald-500 text-black hover:bg-emerald-400 font-bold px-10 h-13 text-sm gap-2 shadow-2xl shadow-emerald-500/30"
              >
                <span>Initialize SAVERA</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-[#030604] text-xs text-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white">SAVERA</span>
            <span>·</span>
            <span>Civic Resource Intelligence Architecture</span>
            <span>·</span>
            <span className="font-mono text-emerald-400">Raichur, Karnataka</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/auth" className="hover:text-white transition-colors">
              Demo Accounts
            </Link>
            <Link href="/citizen/twin" className="hover:text-white transition-colors">
              Digital Twin
            </Link>
            <Link href="/gov/heatmap" className="hover:text-white transition-colors">
              City Heatmap
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
