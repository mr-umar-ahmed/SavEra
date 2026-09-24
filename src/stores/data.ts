import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Appliance,
  Broadcast,
  BroadcastInput,
  CarbonInputs,
  ConsentGrant,
  ConsentSource,
  DrEvent,
  DrEventInput,
  ElectricityBill,
  Household,
  ImportedFields,
  LpgBooking,
  LpgCylinder,
  Notification,
  NotificationInput,
  NotificationTarget,
  OfficialAlert,
  OfficialAlertInput,
  Reminder,
  SeedDb,
  ServiceTransaction,
  SetupSection,
  SetupStatus,
  WaterCase,
  WaterReport,
} from "@/types";
import { buildSeed, SEED_VERSION } from "@/data/seed";
import { newId } from "@/lib/ids";
import { groupReportsIntoCases } from "@/lib/engine/water";

export interface DataState extends SeedDb {
  seedVersion: string;
  seededFor: string;

  ensureSeeded(now: string): void;
  resetDemo(now: string): void;

  // Household / electricity
  updateHousehold(id: string, patch: Partial<Household>): void;
  upsertAppliance(a: Appliance): void;
  removeAppliance(id: string): void;
  setSectionStatus(householdId: string, section: SetupSection, status: SetupStatus): void;
  addBill(b: ElectricityBill): void;

  // Water
  addWaterReport(r: WaterReport): { report: WaterReport; case: WaterCase | null };
  updateWaterCase(id: string, patch: Partial<WaterCase>): WaterCase;

  // LPG
  addCylinder(c: LpgCylinder): void;
  finishCylinder(id: string, finishDate: string): void;
  upsertLpgBooking(b: LpgBooking): void;

  // Green / carbon
  setLeaderboardVisibility(householdId: string, publicName: boolean): void;
  setCarbonInputs(householdId: string, inputs: CarbonInputs): void;

  // Notifications
  pushNotification(n: NotificationInput): Notification;
  markNotificationRead(id: string, userId?: string): void;
  markAllRead(target: NotificationTarget, userId?: string): void;

  // Official alerts + DR
  publishAlert(a: OfficialAlertInput): OfficialAlert;
  updateAlert(id: string, patch: Partial<OfficialAlert>): OfficialAlert;
  createDrEvent(e: DrEventInput): DrEvent;
  updateDrEvent(id: string, patch: Partial<DrEvent>): DrEvent;
  respondToDrEvent(id: string, householdId: string, response: "approve" | "auto" | "decline"): DrEvent;
  pushBroadcast(b: BroadcastInput): Broadcast;

  // Connect / services
  grantConsent(g: ConsentGrant): void;
  revokeConsent(source: ConsentSource): void;
  applyImport(householdId: string, source: ConsentSource, fields: ImportedFields): void;
  addTransaction(t: ServiceTransaction): void;
  updateTransaction(ref: string, patch: Partial<ServiceTransaction>): void;
  addReminder(r: Reminder): void;
}

const initialSeed = buildSeed("2026-09-25");

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      ...initialSeed,
      seedVersion: SEED_VERSION,
      seededFor: "2026-09-25",

      ensureSeeded(now: string) {
        const { seedVersion, seededFor, households } = get();
        if (!households || households.length === 0 || seedVersion !== SEED_VERSION || seededFor !== now) {
          const fresh = buildSeed(now);
          set({
            ...fresh,
            seedVersion: SEED_VERSION,
            seededFor: now,
          });
        }
      },

      resetDemo(now: string) {
        const fresh = buildSeed(now);
        set({
          ...fresh,
          seedVersion: SEED_VERSION,
          seededFor: now,
        });
      },

      updateHousehold(id, patch) {
        set((state) => ({
          households: state.households.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        }));
      },

      upsertAppliance(a) {
        set((state) => {
          const exists = state.appliances.some((item) => item.id === a.id);
          return {
            appliances: exists
              ? state.appliances.map((item) => (item.id === a.id ? a : item))
              : [...state.appliances, a],
          };
        });
      },

      removeAppliance(id) {
        set((state) => ({
          appliances: state.appliances.filter((a) => a.id !== id),
        }));
      },

      setSectionStatus(householdId, section, status) {
        set((state) => ({
          households: state.households.map((h) =>
            h.id === householdId
              ? {
                  ...h,
                  sections: {
                    ...h.sections,
                    [section]: status,
                  },
                }
              : h,
          ),
        }));
      },

      addBill(b) {
        set((state) => ({
          bills: [...state.bills.filter((item) => item.id !== b.id), b],
        }));
      },

      addWaterReport(r) {
        const state = get();
        const area = state.areas.find((a) => a.id === r.areaId);
        const schedule = state.waterSchedules.find((s) => s.areaId === r.areaId);

        let attachedCase: WaterCase | null = null;
        const allReports = [...state.waterReports, r];

        if (area && schedule) {
          const updatedCases = groupReportsIntoCases({
            reports: allReports,
            area,
            schedule,
            existing: state.waterCases,
            now: r.date,
          });

          // Identify if a case was created or updated
          attachedCase =
            updatedCases.find((c) => c.areaId === r.areaId && c.state !== "resolved" && c.state !== "not_confirmed") ??
            null;

          const finalReport = attachedCase ? { ...r, caseId: attachedCase.id, status: "grouped" as const } : r;

          set({
            waterReports: [...state.waterReports, finalReport],
            waterCases: updatedCases,
          });

          return { report: finalReport, case: attachedCase };
        }

        set({ waterReports: allReports });
        return { report: r, case: null };
      },

      updateWaterCase(id, patch) {
        let updated: WaterCase | undefined;
        set((state) => {
          const list = state.waterCases.map((c) => {
            if (c.id === id) {
              updated = { ...c, ...patch, updatedAt: new Date().toISOString() };
              return updated;
            }
            return c;
          });
          return { waterCases: list };
        });
        if (!updated) {
          throw new Error(`WaterCase ${id} not found`);
        }
        return updated;
      },

      addCylinder(c) {
        set((state) => ({
          cylinders: [c, ...state.cylinders],
        }));
      },

      finishCylinder(id, finishDate) {
        set((state) => ({
          cylinders: state.cylinders.map((c) => (c.id === id ? { ...c, finishDate } : c)),
        }));
      },

      upsertLpgBooking(b) {
        set((state) => {
          const exists = state.lpgBookings.some((item) => item.id === b.id);
          return {
            lpgBookings: exists
              ? state.lpgBookings.map((item) => (item.id === b.id ? b : item))
              : [b, ...state.lpgBookings],
          };
        });
      },

      setLeaderboardVisibility(householdId, publicName) {
        set((state) => ({
          leaderboard: state.leaderboard.map((e) =>
            e.householdId === householdId ? { ...e, publicName } : e,
          ),
          households: state.households.map((h) =>
            h.id === householdId ? { ...h, displayNamePublic: publicName } : h,
          ),
        }));
      },

      setCarbonInputs(householdId, inputs) {
        set((state) => {
          const exists = state.carbonInputs.some((c) => c.householdId === householdId);
          return {
            carbonInputs: exists
              ? state.carbonInputs.map((c) => (c.householdId === householdId ? inputs : c))
              : [...state.carbonInputs, inputs],
          };
        });
      },

      pushNotification(n) {
        const notif: Notification = {
          ...n,
          id: newId("ntf"),
          createdAt: new Date().toISOString(),
          readBy: [],
        };
        set((state) => ({
          notifications: [notif, ...state.notifications],
        }));
        return notif;
      },

      markNotificationRead(id, userId) {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id
              ? {
                  ...n,
                  readBy: userId && !n.readBy.includes(userId) ? [...n.readBy, userId] : n.readBy,
                }
              : n,
          ),
        }));
      },

      markAllRead(target, userId) {
        set((state) => ({
          notifications: state.notifications.map((n) => {
            if (n.target.role === target.role) {
              return {
                ...n,
                readBy: userId && !n.readBy.includes(userId) ? [...n.readBy, userId] : n.readBy,
              };
            }
            return n;
          }),
        }));
      },

      publishAlert(a) {
        const alert: OfficialAlert = {
          ...a,
          id: newId("alert"),
          publishedAt: new Date().toISOString(),
          status: a.status ?? "active",
          updates: [
            {
              at: new Date().toISOString(),
              text: `Published by ${a.publishedBy} Department`,
              status: a.status ?? "active",
            },
          ],
        };
        set((state) => ({
          officialAlerts: [alert, ...state.officialAlerts],
        }));
        return alert;
      },

      updateAlert(id, patch) {
        let updated: OfficialAlert | undefined;
        set((state) => {
          const alerts = state.officialAlerts.map((a) => {
            if (a.id === id) {
              const newUpdates = patch.status && patch.status !== a.status
                ? [...a.updates, { at: new Date().toISOString(), text: `Status updated to ${patch.status}`, status: patch.status }]
                : a.updates;
              updated = { ...a, ...patch, updates: newUpdates };
              return updated;
            }
            return a;
          });
          return { officialAlerts: alerts };
        });
        if (!updated) throw new Error(`Alert ${id} not found`);
        return updated;
      },

      createDrEvent(e) {
        const ev: DrEvent = {
          ...e,
          id: newId("dr"),
          createdAt: new Date().toISOString(),
          responses: {},
          optedInHouseholds: e.optedInHouseholds ?? 0,
          avertedMw: e.avertedMw ?? 0,
        };
        set((state) => ({
          drEvents: [ev, ...state.drEvents],
        }));
        return ev;
      },

      updateDrEvent(id, patch) {
        let updated: DrEvent | undefined;
        set((state) => {
          const events = state.drEvents.map((e) => {
            if (e.id === id) {
              updated = { ...e, ...patch };
              return updated;
            }
            return e;
          });
          return { drEvents: events };
        });
        if (!updated) throw new Error(`DrEvent ${id} not found`);
        return updated;
      },

      respondToDrEvent(id, householdId, response) {
        let updated: DrEvent | undefined;
        set((state) => {
          const events = state.drEvents.map((e) => {
            if (e.id === id) {
              const nextResponses = { ...e.responses, [householdId]: response };
              updated = {
                ...e,
                responses: nextResponses,
                optedInHouseholds: e.optedInHouseholds + (e.responses[householdId] ? 0 : 1),
                avertedMw: Math.round((e.avertedMw + (response === "decline" ? 0 : 0.005)) * 1000) / 1000,
              };
              return updated;
            }
            return e;
          });
          return { drEvents: events };
        });
        if (!updated) throw new Error(`DrEvent ${id} not found`);
        return updated;
      },

      pushBroadcast(b) {
        const item: Broadcast = {
          ...b,
          id: newId("bc"),
          at: new Date().toISOString(),
        };
        set((state) => ({
          broadcasts: [item, ...state.broadcasts],
        }));
        return item;
      },

      grantConsent(g) {
        set((state) => ({
          consents: [...state.consents.filter((c) => c.source !== g.source || c.householdId !== g.householdId), g],
        }));
      },

      revokeConsent(source) {
        set((state) => ({
          consents: state.consents.map((c) =>
            c.source === source ? { ...c, status: "revoked", revokedAt: new Date().toISOString() } : c,
          ),
        }));
      },

      applyImport(householdId, _source, fields) {
        set((state) => {
          const nextHouseholds = fields.household
            ? state.households.map((h) => (h.id === householdId ? { ...h, ...fields.household } : h))
            : state.households;

          const nextBills = fields.bills ? [...state.bills, ...fields.bills] : state.bills;
          const nextAppliances = fields.appliances ? [...state.appliances, ...fields.appliances] : state.appliances;
          const nextCylinders = fields.cylinders ? [...state.cylinders, ...fields.cylinders] : state.cylinders;

          return {
            households: nextHouseholds,
            bills: nextBills,
            appliances: nextAppliances,
            cylinders: nextCylinders,
          };
        });
      },

      addTransaction(t) {
        set((state) => ({
          transactions: [t, ...state.transactions],
        }));
      },

      updateTransaction(ref, patch) {
        set((state) => ({
          transactions: state.transactions.map((t) => (t.ref === ref ? { ...t, ...patch } : t)),
        }));
      },

      addReminder(r) {
        set((state) => ({
          reminders: [r, ...state.reminders],
        }));
      },
    }),
    {
      name: "savera-data-v1",
    },
  ),
);
