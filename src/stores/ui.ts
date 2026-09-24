import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UiState {
  notificationsOpen: boolean;
  voiceOpen: boolean;
  twinMode: "3d" | "2d";
  reducedMotion: boolean;

  setNotificationsOpen(open: boolean): void;
  toggleNotifications(): void;
  setVoiceOpen(open: boolean): void;
  toggleVoice(): void;
  setTwinMode(mode: "3d" | "2d"): void;
  toggleTwinMode(): void;
  setReducedMotion(v: boolean): void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      notificationsOpen: false,
      voiceOpen: false,
      twinMode: "3d",
      reducedMotion: false,

      setNotificationsOpen(open) {
        set({ notificationsOpen: open });
      },

      toggleNotifications() {
        set((state) => ({ notificationsOpen: !state.notificationsOpen }));
      },

      setVoiceOpen(open) {
        set({ voiceOpen: open });
      },

      toggleVoice() {
        set((state) => ({ voiceOpen: !state.voiceOpen }));
      },

      setTwinMode(mode) {
        set({ twinMode: mode });
      },

      toggleTwinMode() {
        set((state) => ({ twinMode: state.twinMode === "3d" ? "2d" : "3d" }));
      },

      setReducedMotion(v) {
        set({ reducedMotion: v });
      },
    }),
    {
      name: "savera-ui-v1",
    },
  ),
);
