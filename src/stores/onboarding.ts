import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * First-run ("welcome") state for the citizen electricity portal.
 *
 * A citizen who has never completed or skipped the guided setup is redirected from
 * `/citizen/electricity` to `/citizen/onboarding` (see `useFirstRunGate`). Decisions are
 * keyed by user id so every demo persona and every signed-up user gets the flow exactly once.
 * "Reset demo data" clears this store together with the demo database.
 */

export type OnboardingOutcome = "completed" | "skipped";

export interface OnboardingRecord {
  outcome: OnboardingOutcome;
  /** Wall-clock ISO timestamp of the decision (presentation only, never used by the engine). */
  at: string;
  householdSaved: boolean;
  billUploaded: boolean;
  /** Number of previous bills attached during onboarding. */
  previousBills: number;
  /** Number of appliances confirmed during onboarding. */
  applianceCount: number;
}

export interface OnboardingState {
  /** First-run decisions by user id. Absent = the user has never seen the flow. */
  records: Record<string, OnboardingRecord>;
  /** Last step reached per user, so an interrupted flow resumes where it left off. */
  drafts: Record<string, number>;

  complete(userId: string, info?: Partial<Omit<OnboardingRecord, "outcome" | "at">>): void;
  skip(userId: string): void;
  setDraftStep(userId: string, step: number): void;
  /** Clears one user's record (or everything when `userId` is omitted). */
  reset(userId?: string): void;
}

const EMPTY_INFO = {
  householdSaved: false,
  billUploaded: false,
  previousBills: 0,
  applianceCount: 0,
} satisfies Omit<OnboardingRecord, "outcome" | "at">;

/** `true` when `userId` has neither completed nor skipped the first-run flow. */
export function needsOnboarding(records: Record<string, OnboardingRecord>, userId?: string | null): boolean {
  if (!userId) return false;
  return !records[userId];
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      records: {},
      drafts: {},

      complete(userId, info) {
        set((state) => {
          const drafts = { ...state.drafts };
          delete drafts[userId];
          return {
            records: {
              ...state.records,
              [userId]: {
                outcome: "completed",
                at: new Date().toISOString(),
                ...EMPTY_INFO,
                ...info,
              },
            },
            drafts,
          };
        });
      },

      skip(userId) {
        set((state) => {
          const drafts = { ...state.drafts };
          delete drafts[userId];
          return {
            records: {
              ...state.records,
              [userId]: { outcome: "skipped", at: new Date().toISOString(), ...EMPTY_INFO },
            },
            drafts,
          };
        });
      },

      setDraftStep(userId, step) {
        set((state) => ({ drafts: { ...state.drafts, [userId]: step } }));
      },

      reset(userId) {
        if (!userId) {
          set({ records: {}, drafts: {} });
          return;
        }
        set((state) => {
          const records = { ...state.records };
          const drafts = { ...state.drafts };
          delete records[userId];
          delete drafts[userId];
          return { records, drafts };
        });
      },
    }),
    {
      name: "savera-onboarding-v1",
    },
  ),
);
