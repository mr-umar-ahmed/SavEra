/**
 * LPG write API (Phase 4). Every call awaits a short simulated latency, writes through the
 * store actions and returns an `ApiResult`. Booking is simulated (MASTER_PROMPT §2.7).
 */

import { fail, ok, type ApiResult } from "@/types";
import type {
  HouseholdGas,
  IsoDate,
  LpgBooking,
  LpgBookingStatus,
  LpgCylinder,
  Reminder,
  SetupStatus,
} from "@/types";
import { LPG_BOOKING_STATUS_LABEL } from "@/types";
import { useDataStore } from "@/stores/data";
import { useSessionStore } from "@/stores/session";
import { useLpgOpsStore } from "@/stores/lpgOps";
import { addDays, daysBetween } from "@/lib/dates";
import { formatDate, formatIN } from "@/lib/format";
import { newId } from "@/lib/ids";
import { delay, simulateBooking } from "./simulated";

export const BOOKING_FLOW: LpgBookingStatus[] = [
  "requested",
  "confirmed",
  "out_for_delivery",
  "delivered",
];

const openCylinderOf = (householdId: string): LpgCylinder | undefined =>
  useDataStore
    .getState()
    .cylinders.filter((c) => c.householdId === householdId && !c.finishDate)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

function notifyHousehold(
  householdId: string,
  n: { title: string; body: string; href: string; type?: "lpg" | "reminder" | "service" },
): void {
  useDataStore.getState().pushNotification({
    target: { role: "citizen", householdIds: [householdId] },
    type: n.type ?? "lpg",
    stream: "lpg",
    title: n.title,
    body: n.body,
    href: n.href,
    simulated: n.type === "service" ? true : undefined,
  });
}

export interface FinishedSummary {
  cylinderId: string;
  days: number;
  kgPerDay: number;
}

export const lpgApi = {
  /** Save the Gas & Heating setup; optionally start tracking the first cylinder. */
  async saveSetup(
    householdId: string,
    input: {
      gas?: HouseholdGas;
      status: SetupStatus;
      firstCylinder?: { refillDate: IsoDate; startDate: IsoDate; sizeKg: number; provider: string };
    },
  ): Promise<ApiResult<{ addedCylinder?: LpgCylinder }>> {
    await delay();
    const store = useDataStore.getState();
    if (input.gas) store.updateHousehold(householdId, { gas: input.gas });
    store.setSectionStatus(householdId, "gas", input.status);
    let addedCylinder: LpgCylinder | undefined;
    if (input.firstCylinder && !openCylinderOf(householdId)) {
      addedCylinder = {
        id: newId("cyl"),
        householdId,
        source: "manual",
        ...input.firstCylinder,
      };
      store.addCylinder(addedCylinder);
    }
    return ok({ addedCylinder });
  },

  /** Mark the cylinder in use as finished. */
  async finishCurrent(householdId: string, finishDate: IsoDate): Promise<ApiResult<FinishedSummary>> {
    await delay();
    const open = openCylinderOf(householdId);
    if (!open) return fail("There is no cylinder in use to finish.");
    if (finishDate < open.startDate) return fail("The finish date cannot be before the start date.");
    useDataStore.getState().finishCylinder(open.id, finishDate);
    const days = Math.max(1, daysBetween(open.startDate, finishDate));
    return ok({
      cylinderId: open.id,
      days,
      kgPerDay: Math.round((open.sizeKg / days) * 100) / 100,
    });
  },

  /** Add a new cylinder; when one is still open, `finishOpenOn` finishes it first. */
  async addCylinder(input: {
    householdId: string;
    sizeKg: number;
    refillDate: IsoDate;
    startDate: IsoDate;
    provider: string;
    finishOpenOn?: IsoDate;
  }): Promise<ApiResult<{ cylinder: LpgCylinder; finished?: FinishedSummary }>> {
    const open = openCylinderOf(input.householdId);
    let finished: FinishedSummary | undefined;
    if (open) {
      if (!input.finishOpenOn) return fail("Mark the current cylinder as finished first.");
      const res = await lpgApi.finishCurrent(input.householdId, input.finishOpenOn);
      if (!res.ok) return res;
      finished = res.data;
    } else {
      await delay();
    }
    if (input.startDate < input.refillDate) {
      return fail("The start date cannot be before the refill date.");
    }
    const cylinder: LpgCylinder = {
      id: newId("cyl"),
      householdId: input.householdId,
      sizeKg: input.sizeKg,
      refillDate: input.refillDate,
      startDate: input.startDate,
      provider: input.provider,
      source: "manual",
    };
    useDataStore.getState().addCylinder(cylinder);
    return ok({ cylinder, finished });
  },

  /** Reminder N days before the estimated refill date (+ a citizen notification). */
  async setRefillReminder(
    householdId: string,
    refillDate: IsoDate,
    daysBefore: number,
  ): Promise<ApiResult<Reminder>> {
    await delay();
    const due = addDays(refillDate, -daysBefore);
    const reminder: Reminder = {
      id: newId("rem"),
      householdId,
      title: "Book LPG refill",
      body: `Estimated refill around ${formatDate(refillDate)} — reminder ${daysBefore} day${daysBefore === 1 ? "" : "s"} before.`,
      dueAt: `${due}T09:00:00.000Z`,
      kind: "lpg_refill",
      createdAt: new Date().toISOString(),
    };
    useDataStore.getState().addReminder(reminder);
    notifyHousehold(householdId, {
      type: "reminder",
      title: `Reminder set for ${formatDate(due)}`,
      body: `We will remind you to book your LPG refill ${daysBefore} day${daysBefore === 1 ? "" : "s"} before the estimated refill date (${formatDate(refillDate)}).`,
      href: "/citizen/gas#refill",
    });
    return ok(reminder);
  },

  /** Simulated refill booking — starts at "Requested". */
  async bookRefill(householdId: string, sizeKg = 14.2): Promise<ApiResult<LpgBooking>> {
    const active = useDataStore
      .getState()
      .lpgBookings.find((b) => b.householdId === householdId && b.status !== "delivered");
    if (active) return fail(`Booking ${active.ref} is already in progress.`);
    const booking = await simulateBooking(householdId, sizeKg);
    useDataStore.getState().upsertLpgBooking(booking);
    notifyHousehold(householdId, {
      type: "service",
      title: `Refill booking ${booking.ref} requested (simulated)`,
      body: "Your simulated refill request was recorded. Status updates will appear here.",
      href: "/citizen/gas#booking",
    });
    return ok(booking);
  },

  /** Demo control: advance a simulated booking to its next status. */
  async advanceBooking(bookingId: string): Promise<ApiResult<LpgBooking>> {
    await delay(300);
    const booking = useDataStore.getState().lpgBookings.find((b) => b.id === bookingId);
    if (!booking) return fail("Booking not found.");
    const idx = BOOKING_FLOW.indexOf(booking.status);
    if (idx < 0 || idx >= BOOKING_FLOW.length - 1) return fail("This booking is already delivered.");
    const status = BOOKING_FLOW[idx + 1];
    const at = new Date().toISOString();
    const next: LpgBooking = {
      ...booking,
      status,
      updatedAt: at,
      history: [...booking.history, { status, at }],
    };
    useDataStore.getState().upsertLpgBooking(next);
    const demoNow = useSessionStore.getState().demoNow;
    const body =
      status === "confirmed"
        ? `Delivery expected by ${formatDate(addDays(demoNow, 2))} (simulated).`
        : status === "out_for_delivery"
          ? "Your cylinder is out for delivery (simulated)."
          : "Cylinder delivered (simulated). Start tracking it from Update Cylinder.";
    notifyHousehold(booking.householdId, {
      type: "service",
      title: `Booking ${booking.ref}: ${LPG_BOOKING_STATUS_LABEL[status]}`,
      body,
      href: status === "delivered" ? "/citizen/gas/cylinder" : "/citizen/gas#booking",
    });
    return ok(next);
  },

  /** Higher-consumption notice for the cylinder in use (sent once per cylinder). */
  async notifyHigherConsumption(householdId: string, deltaPct: number): Promise<ApiResult<boolean>> {
    const open = openCylinderOf(householdId);
    const marker = open ? `/citizen/gas#insight-${open.id}` : "/citizen/gas#insight";
    const exists = useDataStore
      .getState()
      .notifications.some(
        (n) =>
          n.href === marker ||
          (n.title.startsWith("Higher LPG consumption detected") &&
            n.target.householdIds?.includes(householdId)),
      );
    if (exists) return ok(false);
    notifyHousehold(householdId, {
      title: "Higher LPG consumption detected — review safety guidance",
      body: `Your current cylinder is being used about ${Math.round(deltaPct)} % faster than your typical pattern. Possible leakage — check for safety.`,
      href: marker,
    });
    return ok(true);
  },

  // ---------------------------------------------------------------- supervisor (area level)

  async markForMonitoring(areaId: string): Promise<ApiResult<void>> {
    await delay(250);
    useLpgOpsStore.getState().setStatus(areaId, "monitoring");
    return ok(undefined);
  },

  async requestFieldInquiry(areaId: string, areaName: string, wardId: string): Promise<ApiResult<void>> {
    await delay();
    useLpgOpsStore.getState().setStatus(areaId, "inquiry_requested");
    useDataStore.getState().pushNotification({
      target: { role: "gov", departments: ["gas"] },
      type: "lpg",
      stream: "lpg",
      title: `Field inquiry requested — ${areaName}`,
      body: `The ${wardId.replace("ward-", "Ward ")} supervisor requested a field inquiry into above-baseline LPG consumption in ${areaName}. Aggregate data only.`,
      href: "/gov/gas",
    });
    return ok(undefined);
  },

  async resolveAlert(areaId: string): Promise<ApiResult<void>> {
    await delay(250);
    useLpgOpsStore.getState().setStatus(areaId, "resolved");
    return ok(undefined);
  },

  async addNote(areaId: string, text: string): Promise<ApiResult<void>> {
    const trimmed = text.trim();
    if (!trimmed) return fail("Write a note first.");
    await delay(200);
    useLpgOpsStore
      .getState()
      .addNote(areaId, { id: newId("note"), text: trimmed, at: new Date().toISOString() });
    return ok(undefined);
  },

  /** Share the ward's estimated requirement with the LPG Distribution Cell. */
  async shareRequirement(wardLabel: string, cylinders: number, kg: number): Promise<ApiResult<void>> {
    await delay();
    useDataStore.getState().pushNotification({
      target: { role: "gov", departments: ["gas"] },
      type: "lpg",
      stream: "lpg",
      title: `Estimated LPG requirement shared — ${wardLabel}`,
      body: `${wardLabel} next-month estimate: ${formatIN(kg)} kg ≈ ${formatIN(cylinders)} cylinders (14.2 kg, incl. 5 % buffer). Planning information only.`,
      href: "/gov/gas#forecast",
    });
    return ok(undefined);
  },
};
