import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { IsoDateTime } from "@/types";

/**
 * Supervisor LPG alert workflow state (spec 03 §10.5): per-area status and notes.
 * Area-level only — never household data. Cleared by "Reset demo data".
 */
export type LpgAlertStatus = "open" | "monitoring" | "inquiry_requested" | "resolved";

export const LPG_ALERT_STATUS_LABEL: Record<LpgAlertStatus, string> = {
  open: "Open",
  monitoring: "Marked for monitoring",
  inquiry_requested: "Field inquiry requested",
  resolved: "Resolved",
};

export interface LpgAreaNote {
  id: string;
  text: string;
  at: IsoDateTime;
}

export interface LpgAreaOps {
  status: LpgAlertStatus;
  notes: LpgAreaNote[];
  updatedAt: IsoDateTime;
}

interface LpgOpsState {
  areas: Record<string, LpgAreaOps>;
  setStatus(areaId: string, status: LpgAlertStatus): void;
  addNote(areaId: string, note: LpgAreaNote): void;
  reset(): void;
}

const empty = (): LpgAreaOps => ({ status: "open", notes: [], updatedAt: new Date().toISOString() });

export const useLpgOpsStore = create<LpgOpsState>()(
  persist(
    (set) => ({
      areas: {},
      setStatus(areaId, status) {
        set((s) => ({
          areas: {
            ...s.areas,
            [areaId]: { ...(s.areas[areaId] ?? empty()), status, updatedAt: new Date().toISOString() },
          },
        }));
      },
      addNote(areaId, note) {
        set((s) => {
          const prev = s.areas[areaId] ?? empty();
          return {
            areas: {
              ...s.areas,
              [areaId]: { ...prev, notes: [note, ...prev.notes], updatedAt: note.at },
            },
          };
        });
      },
      reset() {
        set({ areas: {} });
      },
    }),
    { name: "savera-lpgops-v1" },
  ),
);
