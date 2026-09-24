import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "./session";
import { useDataStore } from "./data";
import { useTwinStore } from "./twin";
import { useUiStore } from "./ui";

describe("Stores — Session, Data, Twin, UI", () => {
  beforeEach(() => {
    useSessionStore.getState().logout();
    useDataStore.getState().resetDemo("2026-09-25");
    useTwinStore.getState().reset();
  });

  it("authenticates via login and OTP and allows instant role switching", () => {
    const session = useSessionStore.getState();

    // Login with valid primary citizen email
    const loginRes = session.login("citizen@savera.demo", "savera");
    expect(loginRes.ok).toBe(true);
    expect(useSessionStore.getState().pendingUserId).toBe("u-citizen-1");

    // Invalid OTP
    const badOtp = session.verifyOtp("000000");
    expect(badOtp.ok).toBe(false);

    // Valid OTP
    const goodOtp = session.verifyOtp("123456");
    expect(goodOtp.ok).toBe(true);
    expect(useSessionStore.getState().user?.id).toBe("u-citizen-1");
    expect(useSessionStore.getState().user?.householdId).toBe("H-1024");

    // Instant switch to supervisor
    session.switchAccount("u-supervisor-24");
    expect(useSessionStore.getState().user?.role).toBe("supervisor");
    expect(useSessionStore.getState().user?.wardId).toBe("ward-24");
  });

  it("manages household and appliance updates in useDataStore", () => {
    const data = useDataStore.getState();

    // Update household
    data.updateHousehold("H-1024", { sizeSqft: 1050 });
    expect(useDataStore.getState().households.find((h) => h.id === "H-1024")?.sizeSqft).toBe(1050);

    // Upsert appliance
    data.upsertAppliance({
      id: "app-test-new",
      householdId: "H-1024",
      type: "room_heater",
      category: "cooling",
      label: "Room Heater",
      count: 1,
      hoursPerDay: 2,
      daysPerMonth: 20,
      setupStatus: "complete",
      source: "manual",
      spec: { watts: 1500 },
    });
    expect(useDataStore.getState().appliances.some((a) => a.id === "app-test-new")).toBe(true);

    // Remove appliance
    data.removeAppliance("app-test-new");
    expect(useDataStore.getState().appliances.some((a) => a.id === "app-test-new")).toBe(false);
  });

  it("updates twin simulation devices and responds to DR", () => {
    const twin = useTwinStore.getState();
    twin.setDevice("ac", { setpointC: 25, kw: 1.05 });
    expect(useTwinStore.getState().devices.find((d) => d.id === "ac")?.setpointC).toBe(25);

    twin.setDrReduced(true);
    expect(useTwinStore.getState().drReduced).toBe(true);
    expect(useTwinStore.getState().devices.find((d) => d.id === "ac")?.setpointC).toBe(26);
  });

  it("toggles ui drawer and twin mode states", () => {
    const ui = useUiStore.getState();
    expect(ui.notificationsOpen).toBe(false);
    ui.toggleNotifications();
    expect(useUiStore.getState().notificationsOpen).toBe(true);

    expect(ui.twinMode).toBe("3d");
    ui.toggleTwinMode();
    expect(useUiStore.getState().twinMode).toBe("2d");
  });
});
