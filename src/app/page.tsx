"use client";

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
  Leaf,
  Layers,
  Repeat,
  Shield,
  Sparkles,
  TrendingDown,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050B08] text-white selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#050B08]/80 backdrop-blur-xl">
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

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        {/* Glow gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Powered Household-to-City Resource Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
            Intelligent Energy, Water & LPG <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Action Platform</span>
          </h1>

          <p className="text-base sm:text-lg text-white/70 max-w-3xl mx-auto leading-relaxed mb-10">
            SAVERA is an AI-powered resource intelligence and action platform that measures household electricity, water and LPG usage, builds personalised baselines, detects abnormal consumption, predicts next-month consumption and cost, gives actionable recommendations, connects citizens with utility services, and — through digital simulation, authorised integrations, compatible hardware and human-verified government workflows — helps translate digital insight into real-world resource-saving action.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/auth" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:from-emerald-400 hover:to-teal-400 font-bold px-8 h-12 text-sm gap-2 shadow-xl shadow-emerald-500/25"
              >
                <span>Launch Demo Environment</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/citizen/electricity" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white/15 bg-white/[0.03] hover:bg-white/10 text-white font-medium px-8 h-12 text-sm"
              >
                Explore Citizen Dashboard
              </Button>
            </Link>
          </div>

          {/* Impact Stats Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto pt-6 border-t border-white/10 text-left">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-bold font-mono text-emerald-400">14.2%</span>
                <TrendingDown className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-xs font-semibold text-white">Peak Load Averted</div>
              <div className="text-[10px] text-white/40 mt-0.5">Estimated via Automated DR</div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-bold font-mono text-teal-400">3.2M L</span>
                <Droplet className="h-4 w-4 text-teal-400" />
              </div>
              <div className="text-xs font-semibold text-white">Water Supply Monitored</div>
              <div className="text-[10px] text-white/40 mt-0.5">Ward 24 Daily Planned Supply</div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-bold font-mono text-cyan-400">45,230</span>
                <Users className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="text-xs font-semibold text-white">Participating Habitats</div>
              <div className="text-[10px] text-white/40 mt-0.5">Simulated smart grid meters</div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-bold font-mono text-amber-400">842 MW</span>
                <Zap className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-xs font-semibold text-white">City Grid Demand</div>
              <div className="text-[10px] text-white/40 mt-0.5">Live Raichur telemetry feed</div>
            </div>
          </div>
        </div>
      </section>

      {/* The Closed Loop Section */}
      <section className="py-20 border-t border-white/10 bg-[#070D0A]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">The Closed-Loop Intelligence Cycle</h2>
            <p className="text-sm text-white/60 mt-3">
              How household telemetry translates into community and city-scale conservation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {[
              { step: "01", name: "Measure", desc: "Bills, smart scans & sensor telemetry", icon: BarChart3 },
              { step: "02", name: "Analyse", desc: "Personalised baselines & anomaly detection", icon: Sparkles },
              { step: "03", name: "Predict", desc: "Next-month kWh, costs & refill dates", icon: TrendingDown },
              { step: "04", name: "Recommend", desc: "Ranked actions with projected ROI", icon: CheckCircle2 },
              { step: "05", name: "Act", desc: "Simulation twin & demand response", icon: Cpu },
              { step: "06", name: "Learn", desc: "Closed-loop feedback raises accuracy", icon: Repeat },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-emerald-400">{s.step}</span>
                    <Icon className="h-4 w-4 text-white/40" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{s.name}</h3>
                  <p className="text-xs text-white/50 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The Three Portals */}
      <section className="py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Three Portals, One Data Loop</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">Tailored Workflows Across Every Tier</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Portal 1: Citizen */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
              <div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Citizen Portal</h3>
                <p className="text-xs text-white/60 leading-relaxed mb-6">
                  Digitise your home, understand where power went, track LPG cylinders with refill forecasting, submit water supply experience, and earn your Green Score.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Appliance-level reconciliation & forecast</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>LPG refill prediction & safety guidance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Green Score #84/700 with peer ranking</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/citizen">
                  <Button className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">
                    Access Citizen Portal
                  </Button>
                </Link>
              </div>
            </div>

            {/* Portal 2: Supervisor */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 flex flex-col justify-between hover:border-teal-500/40 transition-all">
              <div>
                <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Area Supervisor / Councillor</h3>
                <p className="text-xs text-white/60 leading-relaxed mb-6">
                  Monitor your ward, review AI-grouped water supply alerts, dispatch field verifications with live GPS simulation, and coordinate with departments.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                    <span>Ward 24 AI alert grouping (XYZ Colony)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                    <span>Field verification workflow & forward to board</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                    <span>Area LPG & electricity demand monitoring</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/supervisor">
                  <Button className="w-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs">
                    Access Supervisor Portal
                  </Button>
                </Link>
              </div>
            </div>

            {/* Portal 3: Government */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
              <div>
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
                  <Globe className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Government Department</h3>
                <p className="text-xs text-white/60 leading-relaxed mb-6">
                  City-scale intelligence for Electricity, Water, and Gas. Manage Automated Demand Response (ADR), GIS heatmaps, and publish official alerts.
                </p>
                <ul className="space-y-2.5 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                    <span>City grid 842 MW telemetry & ADR dispatch</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Water board 12.4M L forecast & scheduling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Industrial environmental GIS & GHG accounting</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link href="/gov">
                  <Button className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs">
                    Access Government Portal
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-[#030604] text-xs text-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">SAVERA</span>
            <span>·</span>
            <span>Civic Resource Intelligence Architecture</span>
            <span>·</span>
            <span className="font-mono text-emerald-400">Raichur, Karnataka</span>
          </div>

          <div className="flex items-center gap-4">
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
