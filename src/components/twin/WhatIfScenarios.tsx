"use client";

import React from "react";
import { useTwinStore } from "@/stores/twin";
import { Sparkles, Zap, Sun, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function WhatIfScenarios() {
  const setDevice = useTwinStore((s) => s.setDevice);
  const setDrReduced = useTwinStore((s) => s.setDrReduced);
  const reset = useTwinStore((s) => s.reset);

  const applyScenario = (name: string, action: () => void) => {
    action();
    toast.success(`Applied scenario: ${name}`);
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 backdrop-blur-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-positive/10 border border-positive/20 flex items-center justify-center text-positive">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Interactive What-If Simulation Scenarios</h4>
            <p className="text-xs text-muted-foreground">
              Simulate operational policy shifts, smart scheduling, and grid peak demand response.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            reset();
            toast.info("Reset Digital Twin to baseline configuration");
          }}
          className="h-8 gap-1.5 border-border bg-muted hover:bg-secondary text-xs text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Reset Baseline</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Scenario 1: Eco Comfort */}
        <div
          onClick={() =>
            applyScenario("Eco Comfort Mode", () => {
              setDevice("ac", { on: true, setpointC: 26, kw: 0.95 });
              setDevice("fan", { on: true, kw: 0.25 });
              setDevice("geyser", { on: false });
              setDrReduced(false);
            })
          }
          className="cursor-pointer p-4 rounded-2xl border border-border/80 bg-muted/40 hover:bg-muted hover:border-positive/50 transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground group-hover:text-positive transition-colors">
                🌿 Eco Comfort Mode
              </span>
              <span className="text-3xs font-mono text-positive bg-positive/10 px-1.5 py-0.5 rounded">
                -35 kWh/mo
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AC raised from 24°C to 26°C with BLDC fan assist. Geyser shifted to off-peak morning.
            </p>
          </div>
          <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between text-2xs text-soft font-mono">
            <span>Est. Savings:</span>
            <span className="font-bold text-positive">₹270 / mo</span>
          </div>
        </div>

        {/* Scenario 2: Demand Response */}
        <div
          onClick={() =>
            applyScenario("Grid Peak Shaving (ADR)", () => {
              setDevice("ac", { on: true, setpointC: 27, kw: 0.75 });
              setDevice("geyser", { on: false });
              setDevice("tv", { on: true, kw: 0.08 });
              setDrReduced(true);
            })
          }
          className="cursor-pointer p-4 rounded-2xl border border-border/80 bg-muted/40 hover:bg-muted hover:border-amber-500/50 transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground group-hover:text-amber-ink transition-colors">
                ⚡ Demand Response (DR)
              </span>
              <span className="text-3xs font-mono text-amber-ink bg-amber-500/10 px-1.5 py-0.5 rounded">
                Grid Support
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Simulates OpenADR automatic load curtailment during city 6:00–10:00 PM peak stress hours.
            </p>
          </div>
          <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between text-2xs text-soft font-mono">
            <span>Load Relieved:</span>
            <span className="font-bold text-amber-ink">-1.15 kW</span>
          </div>
        </div>

        {/* Scenario 3: Solar Maximizer */}
        <div
          onClick={() =>
            applyScenario("Solar Maximizer", () => {
              setDevice("ac", { on: true, setpointC: 24, kw: 1.15 });
              setDevice("geyser", { on: true, kw: 1.8, hoursPerDay: 1 });
              setDevice("fridge", { on: true, kw: 0.08 });
              setDrReduced(false);
            })
          }
          className="cursor-pointer p-4 rounded-2xl border border-border/80 bg-muted/40 hover:bg-muted hover:border-amber-400/50 transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground group-hover:text-amber-500 transition-colors">
                ☀️ Solar Maximizer
              </span>
              <span className="text-3xs font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                Self-Powered
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Synchronizes heavy thermal and washing loads with daytime 3.2 kWp solar generation peak.
            </p>
          </div>
          <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between text-2xs text-soft font-mono">
            <span>Net Grid Draw:</span>
            <span className="font-bold text-positive">~0.00 kW</span>
          </div>
        </div>

        {/* Scenario 4: Vacation Mode */}
        <div
          onClick={() =>
            applyScenario("Away / Vacation Mode", () => {
              setDevice("ac", { on: false, kw: 0 });
              setDevice("fan", { on: false, kw: 0 });
              setDevice("lights", { on: false, kw: 0 });
              setDevice("geyser", { on: false, kw: 0 });
              setDevice("tv", { on: false, kw: 0 });
              setDevice("fridge", { on: true, kw: 0.05, hoursPerDay: 24 });
              setDrReduced(false);
            })
          }
          className="cursor-pointer p-4 rounded-2xl border border-border/80 bg-muted/40 hover:bg-muted hover:border-cyan-500/50 transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground group-hover:text-cyan-ink transition-colors">
                🏖️ Away / Vacation
              </span>
              <span className="text-3xs font-mono text-cyan-ink bg-cyan-500/10 px-1.5 py-0.5 rounded">
                Standby Only
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Shuts down cooling, entertainment, and heating. Retains only inverter refrigerator.
            </p>
          </div>
          <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between text-2xs text-soft font-mono">
            <span>Baseload:</span>
            <span className="font-bold text-positive">0.05 kW</span>
          </div>
        </div>
      </div>
    </div>
  );
}
