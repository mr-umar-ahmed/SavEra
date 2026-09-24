import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { DEMO_OTP, DEMO_PASSWORD, findAccount, findAccountByUserId } from "@/lib/auth/accounts";
import { SEED_USERS } from "@/data/seed/users";

export interface SessionState {
  user: User | null;
  pendingUserId: string | null;
  demoNow: string;
  login(identifier: string, password: string): { ok: boolean; error?: string };
  verifyOtp(code: string): { ok: boolean; error?: string };
  logout(): void;
  switchAccount(userId: string): void;
  setDisplayNamePublic(v: boolean): void;
  setDemoNow(now: string): void;
}

const DEFAULT_DEMO_NOW = "2026-09-25";

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      user: SEED_USERS[0], // Defaults to primary citizen (Priya Sharma, H-1024)
      pendingUserId: null,
      demoNow: DEFAULT_DEMO_NOW,

      login(identifier, password) {
        const account = findAccount(identifier);
        if (!account) {
          return { ok: false, error: "Account not found with this email or mobile" };
        }
        if (password !== DEMO_PASSWORD) {
          return { ok: false, error: "Incorrect password. Demo password is 'savera'" };
        }
        set({ pendingUserId: account.userId });
        return { ok: true };
      },

      verifyOtp(code) {
        const { pendingUserId } = get();
        if (!pendingUserId) {
          return { ok: false, error: "No pending login found" };
        }
        if (code !== DEMO_OTP) {
          return { ok: false, error: "Invalid OTP. Demo OTP is '123456'" };
        }
        const foundUser = SEED_USERS.find((u) => u.id === pendingUserId);
        if (!foundUser) {
          return { ok: false, error: "User profile not found" };
        }
        set({ user: foundUser, pendingUserId: null });
        return { ok: true };
      },

      logout() {
        set({ user: null, pendingUserId: null });
      },

      switchAccount(userId) {
        const account = findAccountByUserId(userId);
        if (!account) return;
        const foundUser = SEED_USERS.find((u) => u.id === userId);
        if (foundUser) {
          set({ user: foundUser, pendingUserId: null });
        }
      },

      setDisplayNamePublic(v) {
        const { user } = get();
        if (!user) return;
        set({ user: { ...user, displayNamePublic: v } });
      },

      setDemoNow(now) {
        set({ demoNow: now });
      },
    }),
    {
      name: "savera-session-v1",
    },
  ),
);
