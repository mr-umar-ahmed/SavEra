import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TwinDevice, TwinDeviceId } from "@/types";

export interface TwinDevicesList extends Array<TwinDevice> {
  ac: TwinDevice;
  fan: TwinDevice;
  lights: TwinDevice;
  fridge: TwinDevice;
  geyser: TwinDevice;
  tv: TwinDevice;
  washing_machine: TwinDevice;
  water_pump: TwinDevice;
  ev_charger: TwinDevice;
  [key: string]: any;
}

export interface TwinState {
  devices: TwinDevicesList;
  baselineMonthlyKwh: number;
  appliedRecommendationIds: string[];
  drReduced: boolean;
  setDevice(id: TwinDeviceId, patch: Partial<TwinDevice>): void;
  setAcTemp(tempC: number): void;
  toggleDevice(id: TwinDeviceId): void;
  applyRecommendation(id: string, patch?: Record<string, number | boolean>): void;
  applyApplianceStrategy(strategyId: string): void;
  revertApplianceStrategy(strategyId: string): void;
  setDrReduced(v: boolean): void;
  reset(): void;
}

export const DEFAULT_RAW_DEVICES: TwinDevice[] = [
  {
    id: "ac",
    label: "Split AC 1.5 T (5-Star)",
    on: true,
    kw: 1.15,
    ratedKw: 1.5,
    setpointC: 24,
    tempC: 24,
    hoursPerDay: 6,
    flexible: true,
    icon: "air-vent",
    room: "living_room",
  },
  {
    id: "geyser",
    label: "Storage Geyser 15 L (2 kW)",
    on: false,
    kw: 0,
    ratedKw: 2.0,
    hoursPerDay: 0.5,
    flexible: true,
    icon: "flame",
    room: "bathroom",
  },
  {
    id: "fridge",
    label: "Inverter Refrigerator 260 L",
    on: true,
    kw: 0.065,
    ratedKw: 0.15,
    hoursPerDay: 24,
    flexible: false,
    icon: "refrigerator",
    room: "kitchen",
  },
  {
    id: "fan",
    label: "Ceiling Fans (x4 BLDC/Induction)",
    on: true,
    kw: 0.3,
    ratedKw: 0.3,
    hoursPerDay: 8,
    flexible: false,
    icon: "fan",
    room: "living_room",
  },
  {
    id: "lights",
    label: "LED Architectural Fixtures (x8)",
    on: true,
    kw: 0.08,
    ratedKw: 0.08,
    hoursPerDay: 5,
    flexible: false,
    icon: "lightbulb",
    room: "living_room",
  },
  {
    id: "tv",
    label: '55" 4K Smart OLED TV & Media Hub',
    on: true,
    kw: 0.1,
    ratedKw: 0.1,
    hoursPerDay: 6,
    flexible: false,
    icon: "tv",
    room: "living_room",
  },
  {
    id: "washing_machine",
    label: "Smart Inverter Washer (7 kg)",
    on: false,
    kw: 0,
    ratedKw: 1.2,
    hoursPerDay: 0.75,
    flexible: true,
    icon: "waves",
    room: "utility",
  },
  {
    id: "water_pump",
    label: "Sump Booster Pump (1 HP / 750W)",
    on: false,
    kw: 0,
    ratedKw: 0.75,
    hoursPerDay: 0.6,
    flexible: true,
    icon: "droplets",
    room: "utility",
  },
  {
    id: "ev_charger",
    label: "EV Home Fast Charger (3.3 kW)",
    on: false,
    kw: 0,
    ratedKw: 3.3,
    hoursPerDay: 2.5,
    flexible: true,
    icon: "zap",
    room: "outdoor",
  },
];

export function wrapDevices(list: TwinDevice[]): TwinDevicesList {
  const arr = [...list] as TwinDevicesList;
  for (const d of list) {
    if (d.setpointC !== undefined && d.tempC === undefined) {
      d.tempC = d.setpointC;
    }
    (arr as any)[d.id] = d;
  }
  return arr;
}

export const DEFAULT_TWIN_DEVICES = wrapDevices(DEFAULT_RAW_DEVICES);

export const useTwinStore = create<TwinState>()(
  persist(
    (set) => ({
      devices: DEFAULT_TWIN_DEVICES,
      baselineMonthlyKwh: 350,
      appliedRecommendationIds: [],
      drReduced: false,

      setDevice(id, patch) {
        set((state) => {
          const next = state.devices.map((d) => {
            if (d.id === id) {
              const updated = { ...d, ...patch };
              if (updated.setpointC !== undefined) {
                updated.tempC = updated.setpointC;
              }
              return updated;
            }
            return d;
          });
          return { devices: wrapDevices(next) };
        });
      },

      setAcTemp(tempC) {
        set((state) => {
          const next = state.devices.map((d) => {
            if (d.id === "ac") {
              const kw = tempC >= 26 ? 0.95 : tempC === 25 ? 1.05 : 1.15;
              return { ...d, setpointC: tempC, tempC, kw };
            }
            return d;
          });
          return { devices: wrapDevices(next) };
        });
      },

      toggleDevice(id) {
        set((state) => {
          const next = state.devices.map((d) => {
            if (d.id === id) {
              const nextOn = !d.on;
              let kw = 0;
              if (nextOn) {
                if (d.id === "geyser") kw = 2.0;
                else if (d.id === "ac") kw = d.setpointC && d.setpointC >= 26 ? 0.95 : 1.15;
                else if (d.ratedKw > 0) kw = d.ratedKw;
                else kw = 0.1;
              }
              return { ...d, on: nextOn, kw };
            }
            return d;
          });
          return { devices: wrapDevices(next) };
        });
      },

      applyApplianceStrategy(strategyId) {
        set((state) => {
          let nextDevices = [...state.devices];
          if (strategyId === "ac_26") {
            nextDevices = nextDevices.map((d) =>
              d.id === "ac"
                ? { ...d, setpointC: 26, tempC: 26, kw: 0.95, strategyApplied: true }
                : d,
            );
          } else if (strategyId === "geyser_standby") {
            nextDevices = nextDevices.map((d) =>
              d.id === "geyser"
                ? { ...d, on: false, kw: 0, strategyApplied: true }
                : d,
            );
          } else if (strategyId === "fridge_eco") {
            nextDevices = nextDevices.map((d) =>
              d.id === "fridge"
                ? { ...d, kw: 0.05, strategyApplied: true }
                : d,
            );
          } else if (strategyId === "fan_bldc") {
            nextDevices = nextDevices.map((d) =>
              d.id === "fan"
                ? { ...d, kw: 0.11, strategyApplied: true }
                : d,
            );
          } else if (strategyId === "lights_harvesting") {
            nextDevices = nextDevices.map((d) =>
              d.id === "lights"
                ? { ...d, kw: 0.045, strategyApplied: true }
                : d,
            );
          } else if (strategyId === "tv_vampire") {
            nextDevices = nextDevices.map((d) =>
              d.id === "tv"
                ? { ...d, strategyApplied: true }
                : d,
            );
          } else if (strategyId === "washer_solar") {
            nextDevices = nextDevices.map((d) =>
              d.id === "washing_machine"
                ? { ...d, strategyApplied: true }
                : d,
            );
          } else if (strategyId === "pump_automation") {
            nextDevices = nextDevices.map((d) =>
              d.id === "water_pump"
                ? { ...d, strategyApplied: true }
                : d,
            );
          } else if (strategyId === "ev_offpeak") {
            nextDevices = nextDevices.map((d) =>
              d.id === "ev_charger"
                ? { ...d, strategyApplied: true }
                : d,
            );
          }

          return {
            devices: wrapDevices(nextDevices),
            appliedRecommendationIds: [...new Set([...state.appliedRecommendationIds, strategyId])],
          };
        });
      },

      revertApplianceStrategy(strategyId) {
        set((state) => {
          let nextDevices = [...state.devices];
          if (strategyId === "ac_26") {
            nextDevices = nextDevices.map((d) =>
              d.id === "ac"
                ? { ...d, setpointC: 24, tempC: 24, kw: 1.15, strategyApplied: false }
                : d,
            );
          } else if (strategyId === "geyser_standby") {
            nextDevices = nextDevices.map((d) =>
              d.id === "geyser"
                ? { ...d, strategyApplied: false }
                : d,
            );
          } else if (strategyId === "fridge_eco") {
            nextDevices = nextDevices.map((d) =>
              d.id === "fridge"
                ? { ...d, kw: 0.065, strategyApplied: false }
                : d,
            );
          } else if (strategyId === "fan_bldc") {
            nextDevices = nextDevices.map((d) =>
              d.id === "fan"
                ? { ...d, kw: 0.3, strategyApplied: false }
                : d,
            );
          } else if (strategyId === "lights_harvesting") {
            nextDevices = nextDevices.map((d) =>
              d.id === "lights"
                ? { ...d, kw: 0.08, strategyApplied: false }
                : d,
            );
          } else if (strategyId === "tv_vampire") {
            nextDevices = nextDevices.map((d) =>
              d.id === "tv"
                ? { ...d, strategyApplied: false }
                : d,
            );
          } else if (strategyId === "washer_solar") {
            nextDevices = nextDevices.map((d) =>
              d.id === "washing_machine"
                ? { ...d, strategyApplied: false }
                : d,
            );
          } else if (strategyId === "pump_automation") {
            nextDevices = nextDevices.map((d) =>
              d.id === "water_pump"
                ? { ...d, strategyApplied: false }
                : d,
            );
          } else if (strategyId === "ev_offpeak") {
            nextDevices = nextDevices.map((d) =>
              d.id === "ev_charger"
                ? { ...d, strategyApplied: false }
                : d,
            );
          }

          return {
            devices: wrapDevices(nextDevices),
            appliedRecommendationIds: state.appliedRecommendationIds.filter((id) => id !== strategyId),
          };
        });
      },

      applyRecommendation(id, patch) {
        set((state) => {
          let nextDevices: TwinDevice[] = [...state.devices];
          if (patch) {
            if ("setpointC" in patch && typeof patch.setpointC === "number") {
              const sp = patch.setpointC;
              nextDevices = nextDevices.map((d) =>
                d.id === "ac"
                  ? {
                      ...d,
                      setpointC: sp,
                      tempC: sp,
                      kw: sp >= 26 ? 0.95 : sp === 25 ? 1.05 : 1.15,
                    }
                  : d,
              );
            }
          }
          return {
            devices: wrapDevices(nextDevices),
            appliedRecommendationIds: [...new Set([...state.appliedRecommendationIds, id])],
          };
        });
      },

      setDrReduced(v) {
        set((state) => ({
          drReduced: v,
          devices: wrapDevices(
            state.devices.map((d) => {
              if (d.id === "ac") {
                return {
                  ...d,
                  setpointC: v ? 26 : 24,
                  tempC: v ? 26 : 24,
                  kw: v ? 0.95 : 1.15,
                };
              }
              if (d.id === "geyser" && v) {
                return { ...d, on: false, kw: 0 };
              }
              return d;
            }),
          ),
        }));
      },

      reset() {
        set({
          devices: wrapDevices(DEFAULT_RAW_DEVICES),
          baselineMonthlyKwh: 350,
          appliedRecommendationIds: [],
          drReduced: false,
        });
      },
    }),
    {
      name: "savera-twin-v1",
      merge: (persistedState: any, currentState: TwinState) => {
        if (!persistedState || !Array.isArray(persistedState.devices)) {
          return currentState;
        }
        return {
          ...currentState,
          ...persistedState,
          devices: wrapDevices(persistedState.devices),
        };
      },
    },
  ),
);
