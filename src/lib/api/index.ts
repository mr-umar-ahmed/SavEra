import { fail, ok, type ApiResult } from "@/types";
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
  LpgBooking,
  LpgCylinder,
  Notification,
  NotificationInput,
  NotificationTarget,
  OfficialAlert,
  OfficialAlertInput,
  Reminder,
  ServiceTransaction,
  SetupSection,
  SetupStatus,
  WaterCase,
  WaterReport,
} from "@/types";
import { useDataStore } from "@/stores/data";
import { delay, simulateBooking, simulateImport, simulatePayment } from "./simulated";

export const api = {
  household: {
    async update(id: string, patch: Partial<Household>): Promise<ApiResult<Household>> {
      await delay();
      useDataStore.getState().updateHousehold(id, patch);
      const updated = useDataStore.getState().households.find((h) => h.id === id);
      return updated ? ok(updated) : fail("Household not found");
    },
    async setSectionStatus(
      householdId: string,
      section: SetupSection,
      status: SetupStatus,
    ): Promise<ApiResult<void>> {
      await delay(200);
      useDataStore.getState().setSectionStatus(householdId, section, status);
      return ok(undefined);
    },
  },

  electricity: {
    async upsertAppliance(a: Appliance): Promise<ApiResult<Appliance>> {
      await delay();
      useDataStore.getState().upsertAppliance(a);
      return ok(a);
    },
    async removeAppliance(id: string): Promise<ApiResult<void>> {
      await delay();
      useDataStore.getState().removeAppliance(id);
      return ok(undefined);
    },
    async addBill(b: ElectricityBill): Promise<ApiResult<ElectricityBill>> {
      await delay();
      useDataStore.getState().addBill(b);
      return ok(b);
    },
  },

  water: {
    async addReport(r: WaterReport): Promise<ApiResult<{ report: WaterReport; case: WaterCase | null }>> {
      await delay(400);
      const res = useDataStore.getState().addWaterReport(r);
      return ok(res);
    },
    async updateCase(id: string, patch: Partial<WaterCase>): Promise<ApiResult<WaterCase>> {
      await delay();
      try {
        const updated = useDataStore.getState().updateWaterCase(id, patch);
        return ok(updated);
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  },

  lpg: {
    async addCylinder(c: LpgCylinder): Promise<ApiResult<LpgCylinder>> {
      await delay();
      useDataStore.getState().addCylinder(c);
      return ok(c);
    },
    async finishCylinder(id: string, finishDate: string): Promise<ApiResult<void>> {
      await delay();
      useDataStore.getState().finishCylinder(id, finishDate);
      return ok(undefined);
    },
    async upsertBooking(b: LpgBooking): Promise<ApiResult<LpgBooking>> {
      await delay();
      useDataStore.getState().upsertLpgBooking(b);
      return ok(b);
    },
    async bookRefill(householdId: string): Promise<ApiResult<LpgBooking>> {
      const booking = await simulateBooking(householdId);
      useDataStore.getState().upsertLpgBooking(booking);
      return ok(booking);
    },
  },

  green: {
    async setVisibility(householdId: string, publicName: boolean): Promise<ApiResult<void>> {
      await delay();
      useDataStore.getState().setLeaderboardVisibility(householdId, publicName);
      return ok(undefined);
    },
  },

  carbon: {
    async setInputs(householdId: string, inputs: CarbonInputs): Promise<ApiResult<CarbonInputs>> {
      await delay();
      useDataStore.getState().setCarbonInputs(householdId, inputs);
      return ok(inputs);
    },
  },

  notifications: {
    async push(n: NotificationInput): Promise<ApiResult<Notification>> {
      await delay(150);
      const notif = useDataStore.getState().pushNotification(n);
      return ok(notif);
    },
    async markRead(id: string, userId?: string): Promise<ApiResult<void>> {
      useDataStore.getState().markNotificationRead(id, userId);
      return ok(undefined);
    },
    async markAllRead(target: NotificationTarget, userId?: string): Promise<ApiResult<void>> {
      useDataStore.getState().markAllRead(target, userId);
      return ok(undefined);
    },
  },

  alerts: {
    async publish(input: OfficialAlertInput): Promise<ApiResult<OfficialAlert>> {
      await delay();
      const alert = useDataStore.getState().publishAlert(input);
      return ok(alert);
    },
    async update(id: string, patch: Partial<OfficialAlert>): Promise<ApiResult<OfficialAlert>> {
      await delay();
      try {
        const alert = useDataStore.getState().updateAlert(id, patch);
        return ok(alert);
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  },

  dr: {
    async create(input: DrEventInput): Promise<ApiResult<DrEvent>> {
      await delay();
      const event = useDataStore.getState().createDrEvent(input);
      return ok(event);
    },
    async update(id: string, patch: Partial<DrEvent>): Promise<ApiResult<DrEvent>> {
      await delay();
      try {
        const event = useDataStore.getState().updateDrEvent(id, patch);
        return ok(event);
      } catch (e) {
        return fail((e as Error).message);
      }
    },
    async respond(
      id: string,
      householdId: string,
      response: "approve" | "auto" | "decline",
    ): Promise<ApiResult<DrEvent>> {
      await delay();
      try {
        const event = useDataStore.getState().respondToDrEvent(id, householdId, response);
        return ok(event);
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  },

  grid: {
    async pushBroadcast(input: BroadcastInput): Promise<ApiResult<Broadcast>> {
      await delay();
      const broadcast = useDataStore.getState().pushBroadcast(input);
      return ok(broadcast);
    },
  },

  connect: {
    async grantConsent(grant: ConsentGrant): Promise<ApiResult<ConsentGrant>> {
      await delay();
      useDataStore.getState().grantConsent(grant);
      return ok(grant);
    },
    async revokeConsent(source: ConsentSource): Promise<ApiResult<void>> {
      await delay();
      useDataStore.getState().revokeConsent(source);
      return ok(undefined);
    },
    async importFromSource(householdId: string, source: ConsentSource): Promise<ApiResult<void>> {
      const imported = await simulateImport(source);
      useDataStore.getState().applyImport(householdId, source, imported);
      return ok(undefined);
    },
  },

  services: {
    async payBill(
      householdId: string,
      billDueId: string,
      amount: number,
    ): Promise<ApiResult<ServiceTransaction>> {
      const txn = await simulatePayment(householdId, amount, "Electricity Bill Payment");
      useDataStore.getState().addTransaction(txn);
      // Mark bill paid
      useDataStore.setState((state) => ({
        billsDue: state.billsDue.map((b) =>
          b.id === billDueId ? { ...b, status: "paid", paidRef: txn.ref } : b,
        ),
      }));
      return ok(txn);
    },
    async addReminder(reminder: Reminder): Promise<ApiResult<Reminder>> {
      await delay();
      useDataStore.getState().addReminder(reminder);
      return ok(reminder);
    },
  },
};
