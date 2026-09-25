"use client";

import { useTwinStore } from "@/stores/twin";
import { AirVent, Fan, Lightbulb, Power, Refrigerator, Zap } from "lucide-react";
import { formatIN } from "@/lib/format";
import type { TwinDeviceId } from "@/types";

export function Twin2DFallback() {
  const devices = useTwinStore((s) => s.devices);
  const setDevice = useTwinStore((s) => s.setDevice);

  const getDevice = (id: TwinDeviceId) => devices.find((d) => d.id === id);

  const toggle = (id: TwinDeviceId) => {
    const d = getDevice(id);
    if (d) setDevice(id, { on: !d.on });
  };

  const ac = getDevice("ac");
  const fan = getDevice("fan");
  const lights = getDevice("lights");
  const fridge = getDevice("fridge");
  const geyser = getDevice("geyser");

  const totalKw = devices
    .filter((d) => d.on)
    .reduce((sum, d) => sum + d.kw, 0);

  const monthlyEstimatedKwh = Math.round(
    devices
      .filter((d) => d.on)
      .reduce((sum, d) => sum + d.kw * d.hoursPerDay * 30, 0)
  );

  return (
    <div className="relative w-full rounded-2xl border border-border bg-inset p-6 overflow-hidden">
      {/* Schematic Floorplan Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">2D Architectural Layout Schematic</span>
            <span className="text-2xs font-mono px-2 py-0.5 rounded bg-positive/15 text-positive border border-positive/25">
              Interactive 2D Twin
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Household H-1024 · 3BHK Habitat Model</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-inset px-3 py-1.5 rounded-lg border border-border/60">
            <Zap className="h-3.5 w-3.5 text-amber-ink" />
            <span className="text-muted-foreground">Active Load:</span>
            <span className="font-bold text-foreground">{totalKw.toFixed(2)} kW</span>
          </div>
          <div className="flex items-center gap-1.5 bg-inset px-3 py-1.5 rounded-lg border border-border/60">
            <span className="text-muted-foreground">Proj:</span>
            <span className="font-bold text-positive">{formatIN(monthlyEstimatedKwh)} kWh/mo</span>
          </div>
        </div>
      </div>

      {/* Interactive Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
        {/* Room 1: Master Living & Cooling */}
        <div className="rounded-xl border border-border bg-muted/60 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-positive">Living Room</span>
              <span className="text-2xs text-faint">Zone A</span>
            </div>

            {/* AC Control */}
            {ac && (
              <div className="p-3 rounded-lg bg-inset border border-border/60 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AirVent className={`h-4 w-4 ${ac.on ? "text-cyan-ink" : "text-faint"}`} />
                    <div>
                      <div className="text-xs font-medium text-foreground">{ac.label}</div>
                      <div className="text-2xs text-faint">{ac.on ? `${ac.kw} kW` : "Standby"}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle("ac")}
                    className={`p-1.5 rounded-md transition-colors ${
                      ac.on ? "bg-positive/20 text-positive border border-positive/30" : "bg-muted text-faint hover:text-foreground"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                </div>

                {ac.on && ac.setpointC && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <span className="text-muted-foreground">Setpoint:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDevice("ac", { setpointC: Math.max(18, ac.setpointC! - 1) })}
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-secondary text-foreground font-mono"
                      >
                        -
                      </button>
                      <span className="font-bold text-cyan-ink font-mono">{ac.setpointC}°C</span>
                      <button
                        onClick={() => setDevice("ac", { setpointC: Math.min(30, ac.setpointC! + 1) })}
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-secondary text-foreground font-mono"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ceiling Fan */}
            {fan && (
              <div className="p-3 rounded-lg bg-inset border border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fan className={`h-4 w-4 ${fan.on ? "text-positive animate-spin" : "text-faint"}`} />
                    <div>
                      <div className="text-xs font-medium text-foreground">{fan.label}</div>
                      <div className="text-2xs text-faint">{fan.on ? `${fan.kw} kW` : "Off"}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle("fan")}
                    className={`p-1.5 rounded-md transition-colors ${
                      fan.on ? "bg-positive/20 text-positive border border-positive/30" : "bg-muted text-faint hover:text-foreground"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Room 2: Kitchen */}
        <div className="rounded-xl border border-border bg-muted/60 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-ink">Kitchen & Dining</span>
              <span className="text-2xs text-faint">Zone B</span>
            </div>

            {/* Refrigerator */}
            {fridge && (
              <div className="p-3 rounded-lg bg-inset border border-border/60 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Refrigerator className={`h-4 w-4 ${fridge.on ? "text-teal-ink" : "text-faint"}`} />
                    <div>
                      <div className="text-xs font-medium text-foreground">{fridge.label}</div>
                      <div className="text-2xs text-faint">{fridge.kw} kW (Continuous)</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle("fridge")}
                    className={`p-1.5 rounded-md transition-colors ${
                      fridge.on ? "bg-teal-500/20 text-teal-ink border border-teal-500/30" : "bg-muted text-faint hover:text-foreground"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* LED Lights */}
            {lights && (
              <div className="p-3 rounded-lg bg-inset border border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className={`h-4 w-4 ${lights.on ? "text-amber-ink" : "text-faint"}`} />
                    <div>
                      <div className="text-xs font-medium text-foreground">{lights.label}</div>
                      <div className="text-2xs text-faint">{lights.on ? `${lights.kw} kW` : "Off"}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle("lights")}
                    className={`p-1.5 rounded-md transition-colors ${
                      lights.on ? "bg-amber-500/20 text-amber-ink border border-amber-500/30" : "bg-muted text-faint hover:text-foreground"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Room 3: Utility & Bath */}
        <div className="rounded-xl border border-border bg-muted/60 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-ink">Bath & Utility</span>
              <span className="text-2xs text-faint">Zone C</span>
            </div>

            {/* Geyser */}
            {geyser && (
              <div className="p-3 rounded-lg bg-inset border border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={`h-4 w-4 ${geyser.on ? "text-rose-ink" : "text-faint"}`} />
                    <div>
                      <div className="text-xs font-medium text-foreground">{geyser.label}</div>
                      <div className="text-2xs text-faint">{geyser.on ? `${geyser.kw} kW (High load)` : "Off"}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle("geyser")}
                    className={`p-1.5 rounded-md transition-colors ${
                      geyser.on ? "bg-rose-500/20 text-rose-ink border border-rose-500/30" : "bg-muted text-faint hover:text-foreground"
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
