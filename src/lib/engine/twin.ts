/**
 * Digital-twin projection (Simulation — Digital Twin Prototype, MASTER_PROMPT §9.1).
 *
 *   kWh/month = Σ over devices that are on: kW × hours/day × 30
 *   AC: each °C of set-point above 24 °C reduces its draw by 4 % (and below 24 °C adds 4 %).
 *   ₹ via `computeBill`; kW now = Σ effective kW of devices that are on.
 *
 * The defaults mirror the H-1024 twin: ≈ 400 kWh/month at the seeded settings.
 */

import { DEMO_TARIFF } from "@/data/catalogue/tariff";
import type { Tariff, TwinDevice } from "@/types";
import { computeBill } from "./tariff";

export const TWIN_DAYS_PER_MONTH = 30;
export const AC_REFERENCE_SETPOINT_C = 24;
export const AC_SAVING_PER_DEGREE = 0.04;

export interface TwinProjection {
  kwhPerMonth: number;
  rupees: number;
  kwNow: number;
}

/** Effective draw of a device, including the AC set-point adjustment. */
export function effectiveKw(device: TwinDevice): number {
  const kw = Math.max(0, device.kw);
  if (device.id !== "ac" || device.setpointC === undefined) return kw;
  const factor = 1 - AC_SAVING_PER_DEGREE * (device.setpointC - AC_REFERENCE_SETPOINT_C);
  return kw * Math.min(1.4, Math.max(0.5, factor));
}

/** Monthly kWh of one device (0 when off). */
export function deviceKwhPerMonth(device: TwinDevice): number {
  if (!device.on) return 0;
  return effectiveKw(device) * Math.max(0, device.hoursPerDay) * TWIN_DAYS_PER_MONTH;
}

export function projectTwin(devices: TwinDevice[], tariff: Tariff = DEMO_TARIFF): TwinProjection {
  const kwhPerMonth = Math.round(devices.reduce((s, d) => s + deviceKwhPerMonth(d), 0) * 10) / 10;
  const kwNow = Math.round(devices.filter((d) => d.on).reduce((s, d) => s + effectiveKw(d), 0) * 1000) / 1000;
  return { kwhPerMonth, rupees: computeBill(kwhPerMonth, tariff).total, kwNow };
}

/** Seeded twin devices for the citizen home scene (≈ 400 kWh/month). */
export const DEFAULT_TWIN_DEVICES: TwinDevice[] = [
  {
    id: "ac",
    label: "Air conditioner (1.5 T)",
    on: true,
    kw: 1.15,
    ratedKw: 1.15,
    setpointC: 24,
    hoursPerDay: 6,
    flexible: true,
    icon: "Snowflake",
  },
  {
    id: "fan",
    label: "Ceiling fans (4)",
    on: true,
    kw: 0.3,
    ratedKw: 0.3,
    hoursPerDay: 8,
    flexible: false,
    icon: "Fan",
  },
  {
    id: "lights",
    label: "Lights (8 LED + 2 tube)",
    on: true,
    kw: 0.16,
    ratedKw: 0.16,
    hoursPerDay: 5.5,
    flexible: false,
    icon: "Lightbulb",
  },
  {
    id: "fridge",
    label: "Refrigerator (260 L)",
    on: true,
    kw: 0.064,
    ratedKw: 0.15,
    hoursPerDay: 24,
    flexible: false,
    icon: "Refrigerator",
  },
  {
    id: "geyser",
    label: "Geyser (2 kW)",
    on: true,
    kw: 2,
    ratedKw: 2,
    hoursPerDay: 0.5,
    flexible: true,
    icon: "Flame",
  },
  {
    id: "tv",
    label: 'Television (55")',
    on: true,
    kw: 0.1,
    ratedKw: 0.1,
    hoursPerDay: 6.5,
    flexible: false,
    icon: "Tv",
  },
];

/** Devices with every flexible load switched off (demand-response "reduced" state). */
export function applyDemandResponse(devices: TwinDevice[]): TwinDevice[] {
  return devices.map((d) => (d.flexible ? { ...d, on: false } : d));
}
