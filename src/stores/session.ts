import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DemoAccount, User } from "@/types";
import { DEMO_OTP, DEMO_PASSWORD, findAccount, findAccountByUserId, DEMO_ACCOUNTS } from "@/lib/auth/accounts";
import { SEED_USERS } from "@/data/seed/users";
import { useDataStore } from "./data";
import { createDynamicUserData, type SignUpInput } from "@/lib/auth/signUpHelper";

export interface SessionState {
  user: User | null;
  pendingUserId: string | null;
  demoNow: string;
  registeredUsers: User[];
  registeredAccounts: DemoAccount[];
  signUp(data: SignUpInput): { ok: boolean; user?: User; error?: string };
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
      registeredUsers: [],
      registeredAccounts: [],

      signUp(data) {
        const emailClean = data.email.trim().toLowerCase();
        const mobileClean = data.mobile.trim();

        const { registeredAccounts } = get();
        const existingInRegistered = registeredAccounts.some(
          (a) => a.email.toLowerCase() === emailClean || (a.mobile && a.mobile === mobileClean),
        );
        const existingInDemo = DEMO_ACCOUNTS.some(
          (a) => a.email.toLowerCase() === emailClean || (a.mobile && a.mobile === mobileClean),
        );

        if (existingInRegistered || existingInDemo) {
          return { ok: false, error: "An account already exists with this email or mobile." };
        }

        const now = get().demoNow;
        const result = createDynamicUserData(data, now);

        // Populate data store with household, starter appliances, and 12-month billing history
        const dataStore = useDataStore.getState();
        if (result.household) {
          dataStore.addHousehold(result.household);
        }
        if (result.appliances.length > 0) {
          dataStore.addAppliances(result.appliances);
        }
        if (result.bills.length > 0) {
          dataStore.addBills(result.bills);
        }

        set((state) => ({
          registeredUsers: [...state.registeredUsers, result.user],
          registeredAccounts: [...state.registeredAccounts, result.account],
          pendingUserId: result.user.id,
        }));

        return { ok: true, user: result.user };
      },

      login(identifier, password) {
        const clean = identifier.trim().toLowerCase();
        const { registeredAccounts } = get();

        const registeredAcc = registeredAccounts.find(
          (a) => a.email.toLowerCase() === clean || (a.mobile && a.mobile === clean),
        );
        const account = registeredAcc || findAccount(identifier);

        if (!account) {
          return { ok: false, error: "Account not found with this email or mobile" };
        }
        if (password !== account.password && password !== DEMO_PASSWORD) {
          return { ok: false, error: "Incorrect password. Demo password is 'savera'" };
        }
        set({ pendingUserId: account.userId });
        return { ok: true };
      },

      verifyOtp(code) {
        const { pendingUserId, registeredUsers } = get();
        if (!pendingUserId) {
          return { ok: false, error: "No pending login found" };
        }
        if (code !== DEMO_OTP) {
          return { ok: false, error: "Invalid OTP. Demo OTP is '123456'" };
        }
        const allUsers = [...registeredUsers, ...SEED_USERS];
        const foundUser = allUsers.find((u) => u.id === pendingUserId);
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
        const { registeredAccounts, registeredUsers } = get();
        const allAccounts = [...registeredAccounts, ...DEMO_ACCOUNTS];
        const account = allAccounts.find((a) => a.userId === userId);
        if (!account) return;

        const allUsers = [...registeredUsers, ...SEED_USERS];
        const foundUser = allUsers.find((u) => u.id === userId);
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
