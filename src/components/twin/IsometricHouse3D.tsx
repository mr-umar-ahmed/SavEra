"use client";

import React, { useState } from "react";
import { useTwinStore } from "@/stores/twin";
import {
  AirVent,
  Fan,
  Lightbulb,
  Power,
  Refrigerator,
  Flame,
  Tv,
  Sun,
  Moon,
  Zap,
  Sparkles,
  Layers,
  Thermometer,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import type { TwinDeviceId } from "@/types";

interface RoomMeta {
  id: string;
  name: string;
  icon: string;
  gridArea: string;
  devices: TwinDeviceId[];
  ambientTemp: number;
}

const ROOMS: RoomMeta[] = [
  {
    id: "living_room",
    name: "Living Room",
    icon: "🛋️",
    gridArea: "col-span-1 md:col-span-2 row-span-1",
    devices: ["ac", "fan", "tv", "lights"],
    ambientTemp: 27,
  },
  {
    id: "kitchen",
    name: "Kitchen & Dining",
    icon: "🍳",
    gridArea: "col-span-1 row-span-1",
    devices: ["fridge", "lights", "water_pump"],
    ambientTemp: 29,
  },
  {
    id: "bedroom",
    name: "Master Bedroom",
    icon: "🛏️",
    gridArea: "col-span-1 md:col-span-2 row-span-1",
    devices: ["fan", "lights"],
    ambientTemp: 26,
  },
  {
    id: "bathroom",
    name: "Bath & Utility",
    icon: "🚿",
    gridArea: "col-span-1 row-span-1",
    devices: ["geyser", "washing_machine"],
    ambientTemp: 28,
  },
  {
    id: "porch",
    name: "Garage & EV Nook",
    icon: "🚗",
    gridArea: "col-span-1 md:col-span-3 row-span-1",
    devices: ["ev_charger"],
    ambientTemp: 31,
  },
];

export function IsometricHouse3D() {
  const devices = useTwinStore((s) => s.devices);
  const setDevice = useTwinStore((s) => s.setDevice);

  const [selectedRoomId, setSelectedRoomId] = useState<string>("living_room");
  const [selectedDeviceId, setSelectedDeviceId] = useState<TwinDeviceId | null>("ac");
  const [timeOfDay, setTimeOfDay] = useState<"day" | "sunset" | "night">("day");
  const [solarGenerationKw, setSolarGenerationKw] = useState<number>(2.4);

  const getDevice = (id: TwinDeviceId) => devices.find((d) => d.id === id);

  const toggleDevice = (id: TwinDeviceId, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const d = getDevice(id);
    if (d) {
      setDevice(id, { on: !d.on });
    }
  };

  const selectedDevice = selectedDeviceId ? getDevice(selectedDeviceId) : null;
  const activeRoom = ROOMS.find((r) => r.id === selectedRoomId) ?? ROOMS[0];

  const totalLoadKw = devices
    .filter((d) => d.on)
    .reduce((sum, d) => sum + d.kw, 0);

  const netGridKw = Math.max(0, totalLoadKw - solarGenerationKw);
  const netExportKw = Math.max(0, solarGenerationKw - totalLoadKw);

  return (
    <div className="relative w-full rounded-3xl border border-border bg-card overflow-hidden shadow-2xl transition-all">
      {/* Visual Environment Atmosphere Layer */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
          timeOfDay === "day"
            ? "bg-gradient-to-b from-amber-500/5 via-transparent to-transparent opacity-80"
            : timeOfDay === "sunset"
            ? "bg-gradient-to-b from-rose-500/10 via-amber-500/5 to-transparent opacity-90"
            : "bg-gradient-to-b from-indigo-950/20 via-transparent to-background/50 opacity-95"
        }`}
      />

      {/* Top Controls & Time-of-Day Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-border/80 bg-muted/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-positive/15 border border-positive/30 flex items-center justify-center text-positive shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-positive">
                3D Isometric Spatial Model
              </span>
              <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-positive/20 text-positive">
                Live Simulation
              </span>
            </div>
            <h3 className="text-sm font-bold text-foreground">Interactive Household Layout</h3>
          </div>
        </div>

        {/* Time of Day Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-2xs font-mono text-muted-foreground hidden sm:inline">Lighting:</span>
          <div className="flex items-center p-1 rounded-xl bg-muted border border-border text-xs">
            <button
              onClick={() => {
                setTimeOfDay("day");
                setSolarGenerationKw(2.8);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                timeOfDay === "day"
                  ? "bg-amber-500/20 text-amber-ink font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="h-3.5 w-3.5 text-amber-ink" />
              <span>Day (Sun)</span>
            </button>
            <button
              onClick={() => {
                setTimeOfDay("sunset");
                setSolarGenerationKw(1.1);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                timeOfDay === "sunset"
                  ? "bg-rose-500/20 text-rose-ink font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-rose-ink" />
              <span>Evening</span>
            </button>
            <button
              onClick={() => {
                setTimeOfDay("night");
                setSolarGenerationKw(0);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                timeOfDay === "night"
                  ? "bg-indigo-500/20 text-indigo-ink font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="h-3.5 w-3.5 text-indigo-ink" />
              <span>Night Peak</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Twin Content Area: 3D Layout + Inspector */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6">
        {/* Left Side: 3D Floorplan Stage (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          {/* Rooftop Solar Bar */}
          <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-ink">
                <Sun className="h-4 w-4" />
              </div>
              <div>
                <span className="text-2xs font-mono font-bold text-foreground">
                  Rooftop Solar PV Array (3.2 kWp)
                </span>
                <span className="text-2xs text-muted-foreground block">
                  Solar Generating:{" "}
                  <strong className="text-amber-ink font-mono">{solarGenerationKw.toFixed(1)} kW</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-2xs text-faint block">Grid Draw</span>
                <span className="font-bold text-foreground">{netGridKw.toFixed(2)} kW</span>
              </div>
              {netExportKw > 0 && (
                <div className="text-right">
                  <span className="text-2xs text-positive block">Export Feed</span>
                  <span className="font-bold text-positive">+{netExportKw.toFixed(2)} kW</span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Isometric Rooms Floorplan */}
          <div className="relative rounded-3xl border border-border/80 bg-background/60 p-4 sm:p-6 backdrop-blur-xl min-h-[360px] flex items-center justify-center overflow-hidden">
            {/* Ambient isometric floor grid */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* Simulated Energy Pulse Particles Flow Line */}
            <div className="absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1 rounded-full bg-positive/10 border border-positive/20 text-positive text-2xs font-mono">
              <span className="size-2 rounded-full bg-positive animate-ping" />
              <span>Smart Meter Telemetry: Active Sync</span>
            </div>

            {/* Room Blocks Matrix */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              {ROOMS.map((room) => {
                const isSelected = selectedRoomId === room.id;
                const roomDevices = room.devices.map(getDevice).filter(Boolean);
                const activeCount = roomDevices.filter((d) => d?.on).length;
                const roomKw = roomDevices
                  .filter((d) => d?.on)
                  .reduce((sum, d) => sum + (d?.kw ?? 0), 0);

                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      if (room.devices.length > 0) {
                        setSelectedDeviceId(room.devices[0]);
                      }
                    }}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between group ${
                      isSelected
                        ? "border-positive bg-positive/[0.08] shadow-lg ring-1 ring-positive scale-[1.02]"
                        : "border-border/70 bg-card hover:border-border hover:bg-muted/60 hover:shadow-md"
                    } ${room.gridArea}`}
                  >
                    {/* Active load halo glow */}
                    {activeCount > 0 && (
                      <div className="absolute -top-10 -right-10 size-24 rounded-full bg-positive/10 blur-xl pointer-events-none" />
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{room.icon}</span>
                          <span className="font-bold text-xs text-foreground group-hover:text-positive transition-colors">
                            {room.name}
                          </span>
                        </div>
                        <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-muted text-soft border border-border">
                          {room.ambientTemp}°C
                        </span>
                      </div>

                      {/* Device Badges inside Room */}
                      <div className="flex flex-wrap gap-2 my-2">
                        {roomDevices.map((dev) => {
                          if (!dev) return null;
                          const isDevActive = dev.on;
                          const isDevSelected = selectedDeviceId === dev.id;

                          return (
                            <button
                              key={dev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRoomId(room.id);
                                setSelectedDeviceId(dev.id);
                              }}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-2xs font-medium transition-all ${
                                isDevSelected
                                  ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/10"
                                  : isDevActive
                                  ? "bg-positive/15 text-positive border border-positive/30"
                                  : "bg-muted/80 text-muted-foreground border border-border/60 hover:text-foreground"
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  isDevActive ? "bg-positive animate-pulse" : "bg-faint"
                                }`}
                              />
                              <span>{dev.label.split(" ")[0]}</span>
                              <span className="font-mono text-3xs opacity-80">
                                {isDevActive ? `${dev.kw}kW` : "off"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 mt-2 flex items-center justify-between text-2xs font-mono text-soft">
                      <span>{activeCount} Active Devices</span>
                      <span className="font-bold text-positive">{roomKw.toFixed(2)} kW</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Device Inspector & Live Telemetry Gauge (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Appliance Parameter Inspector */}
          <div className="p-5 rounded-3xl border border-border bg-inset backdrop-blur-xl shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-positive" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                  Appliance Controller
                </h4>
              </div>
              <span className="text-2xs font-mono text-positive bg-positive/10 border border-positive/20 px-2 py-0.5 rounded-full">
                {activeRoom.name}
              </span>
            </div>

            {selectedDevice ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-foreground">{selectedDevice.label}</h5>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      Rated: {selectedDevice.ratedKw} kW · {selectedDevice.flexible ? "Flexible (DR)" : "Fixed Load"}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDevice(selectedDevice.id)}
                    className={`p-2 rounded-xl transition-all ${
                      selectedDevice.on
                        ? "bg-positive text-positive-foreground shadow-md shadow-positive/20"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    title={selectedDevice.on ? "Turn Off" : "Turn On"}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>

                {/* Simulated Live Wattage Readout */}
                <div className="p-3 rounded-2xl bg-card border border-border/80 flex items-center justify-between font-mono">
                  <span className="text-xs text-soft">Simulated Power Draw:</span>
                  <span className="text-base font-bold text-foreground">
                    {selectedDevice.on ? `${selectedDevice.kw} kW` : "0.00 kW"}
                  </span>
                </div>

                {/* Specific Control Sliders */}
                {selectedDevice.id === "ac" && selectedDevice.on && (
                  <div className="space-y-2 p-3 rounded-2xl bg-card border border-border/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Thermometer className="h-3.5 w-3.5 text-cyan-ink" />
                        <span>Thermostat Setpoint:</span>
                      </span>
                      <span className="font-bold text-foreground font-mono">
                        {selectedDevice.setpointC ?? 24} °C
                      </span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={30}
                      step={1}
                      value={selectedDevice.setpointC ?? 24}
                      onChange={(e) => {
                        const sp = Number(e.target.value);
                        const newKw = Math.round((1.5 - (sp - 20) * 0.05) * 100) / 100;
                        setDevice("ac", { setpointC: sp, kw: Math.max(0.6, newKw) });
                      }}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-3xs font-mono text-faint">
                      <span>18°C (Max Cooling)</span>
                      <span>24°C (Baseline)</span>
                      <span>30°C (Eco)</span>
                    </div>
                    <p className="text-3xs text-positive pt-1">
                      💡 Setting AC to 26°C reduces monthly load by ~30 kWh (save ₹240).
                    </p>
                  </div>
                )}

                {selectedDevice.id === "geyser" && selectedDevice.on && (
                  <div className="space-y-2 p-3 rounded-2xl bg-card border border-border/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Operating Schedule:</span>
                      <span className="font-bold text-foreground font-mono">Morning Off-Peak</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-2xs">
                      <button
                        onClick={() => setDevice("geyser", { kw: 1.8, hoursPerDay: 0.5 })}
                        className="py-1 px-2 rounded-lg bg-positive/10 text-positive border border-positive/20 font-medium"
                      >
                        Eco Heat (6:00 AM)
                      </button>
                      <button
                        onClick={() => setDevice("geyser", { kw: 2.0, hoursPerDay: 1.0 })}
                        className="py-1 px-2 rounded-lg bg-muted text-soft hover:bg-secondary"
                      >
                        Continuous
                      </button>
                    </div>
                  </div>
                )}

                {/* Operating hours slider */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-card border border-border/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Daily Usage:</span>
                    <span className="font-bold text-foreground font-mono">
                      {selectedDevice.hoursPerDay} hrs / day
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={24}
                    value={selectedDevice.hoursPerDay}
                    onChange={(e) => setDevice(selectedDevice.id, { hoursPerDay: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                Click any room or appliance on the floorplan to inspect live parameters.
              </p>
            )}
          </div>

          {/* Real-Time Total Telemetry Metrics */}
          <div className="p-4 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-lg space-y-3 font-mono text-xs">
            <span className="text-2xs text-muted-foreground uppercase tracking-wider block">
              Active Household Balance
            </span>
            <div className="flex items-center justify-between text-soft">
              <span>Total Load:</span>
              <span className="font-bold text-foreground">{totalLoadKw.toFixed(2)} kW</span>
            </div>
            <div className="flex items-center justify-between text-soft">
              <span>Solar Supply:</span>
              <span className="font-bold text-amber-ink">-{solarGenerationKw.toFixed(1)} kW</span>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="font-bold text-foreground">Net Grid Draw:</span>
              <span className={`font-bold ${netGridKw > 0 ? "text-amber-ink" : "text-positive"}`}>
                {netGridKw.toFixed(2)} kW
              </span>
            </div>
            <div className="flex items-center justify-between text-2xs text-muted-foreground pt-1">
              <span>Carbon Rate:</span>
              <span>{(netGridKw * 710).toFixed(0)} g CO₂ / hr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
