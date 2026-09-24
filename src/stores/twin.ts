import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TwinDevice, TwinDeviceId } from "@/types";

export interface TwinState {
  devices: TwinDevice[];
  baselineMonthlyKwh: number;
  appliedRecommendationIds: string[];
  drReduced: boolean;
  setDevice(id: TwinDeviceId, patch: Partial<TwinDevice>): void;
  applyRecommendation(id: string, patch?: Record<string, number | boolean>): void;
  setDrReduced(v: boolean): void;
  reset(): void;
}

export const DEFAULT_TWIN_DEVICES: TwinDevice[] = [
  {
    id: "ac",
    label: "Split AC 1.5 T",
    on: true,
    kw: 1.15,
    ratedKw: 1.5,
    setpointC: 24,
    hoursPerDay: 6,
    flexible: true,
    icon: "air-vent",
  },
  {
    id: "fan",
    label: "Ceiling Fans (x4)",
    on: true,
    kw: 0.3,
    ratedKw: 0.3,
    hoursPerDay: 8,
    flexible: false,
    icon: "fan",
  },
  {
    id: "lights",
    label: "LED Lights (x8)",
    on: true,
    kw: 0.08,
    ratedKw: 0.08,
    hoursPerDay: 5,
    flexible: false,
    icon: "lightbulb",
  },
  {
    id: "fridge",
    label: "Refrigerator 260 L",
    on: true,
    kw: 0.065,
    ratedKw: 0.15,
    hoursPerDay: 24,
    flexible: false,
    icon: "refrigerator",
  },
  {
    id: "geyser",
    label: "Storage Geyser 15 L",
    on: false,
    kw: 0,
    ratedKw: 2.0,
    hoursPerDay: 0.5,
    flexible: true,
    icon: "flame",
  },
  {
    id: "tv",
    label: '55" LED TV',
    on: true,
    kw: 0.1,
    ratedKw: 0.1,
    hoursPerDay: 6,
    flexible: false,
    icon: "tv",
  },
];

export const useTwinStore = create<TwinState>()(
  persist(
    (set) => ({
      devices: DEFAULT_TWIN_DEVICES,
      baselineMonthlyKwh: 350,
      appliedRecommendationIds: [],
      drReduced: false,

      setDevice(id, patch) {
        set((state) => ({
          devices: state.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        }));
      },

      applyRecommendation(id, patch) {
        set((state) => {
          let nextDevices = state.devices;
          if (patch) {
            // AC setpoint change
            if ("setpointC" in patch && typeof patch.setpointC === "number") {
              const sp = patch.setpointC;
              nextDevices = nextDevices.map((d) =>
                d.id === "ac"
                  ? {
                      ...d,
                      setpointC: sp,
                      kw: sp >= 26 ? 0.95 : sp === 25 ? 1.05 : 1.15,
                    }
                  : d,
              );
            }
          }
          return {
            devices: nextDevices,
            appliedRecommendationIds: [...new Set([...state.appliedRecommendationIds, id])],
          };
        });
      },

      setDrReduced(v) {
        set((state) => ({
          drReduced: v,
          devices: state.devices.map((d) => {
            if (d.id === "ac") {
              return {
                ...d,
                setpointC: v ? 26 : 24,
                kw: v ? 0.95 : 1.15,
              };
            }
            if (d.id === "geyser" && v) {
              return { ...d, on: false, kw: 0 };
            }
            return d;
          }),
        }));
      },

      reset() {
        set({
          devices: DEFAULT_TWIN_DEVICES,
          baselineMonthlyKwh: 350,
          appliedRecommendationIds: [],
          drReduced: false,
        });
      },
    }),
    {
      name: "savera-twin-v1",
    },
  ),
);
