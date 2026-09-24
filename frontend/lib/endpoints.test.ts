import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createElectricityReading,
  createWaterReading,
  getElectricityReadings,
  getWards,
  getWaterReadings,
  putAppliances,
  startLpgCycle,
  uploadBill,
} from "@/lib/endpoints";

type FetchMock = ReturnType<typeof vi.fn>;

const TOKEN = "test-access-token";

function ok(body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function lastCall(fetchMock: FetchMock): { url: URL; init: RequestInit } {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");
  return { url: new URL(String(call[0])), init: (call[1] ?? {}) as RequestInit };
}

describe("endpoints", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    // A fresh Response per call: a body can only be read once.
    fetchMock = vi.fn(async () => ok());
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends every request under /api/v1 with the bearer token", async () => {
    await getWards("Bengaluru", { token: TOKEN });
    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/api/v1/wards");
    expect(url.searchParams.get("city")).toBe("Bengaluru");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("drops query parameters that were left undefined", async () => {
    await getElectricityReadings(undefined, { token: TOKEN });
    expect(lastCall(fetchMock).url.search).toBe("");

    await getWaterReadings(90, { token: TOKEN });
    expect(lastCall(fetchMock).url.searchParams.get("days")).toBe("90");
  });

  it("only asks to overwrite a bill when told to", async () => {
    const body = {
      kwh: 342,
      billing_period_start: "2026-08-01",
      billing_period_end: "2026-08-31",
    };

    await createElectricityReading(body, { token: TOKEN });
    expect(lastCall(fetchMock).url.searchParams.has("overwrite")).toBe(false);

    await createElectricityReading(body, { token: TOKEN, overwrite: true });
    const { url, init } = lastCall(fetchMock);
    expect(url.searchParams.get("overwrite")).toBe("true");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject(body);
  });

  it("never leaks the overwrite flag into the request body", async () => {
    await createElectricityReading(
      { kwh: 1, billing_period_start: "2026-08-01", billing_period_end: "2026-08-31" },
      { token: TOKEN, overwrite: true },
    );
    expect(JSON.parse(String(lastCall(fetchMock).init.body))).not.toHaveProperty("overwrite");
  });

  it("posts a water reading as JSON", async () => {
    await createWaterReading({ liters: 400, reading_date: "2026-09-24" }, { token: TOKEN });
    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/api/v1/readings/water");
    expect(JSON.parse(String(init.body))).toEqual({ liters: 400, reading_date: "2026-09-24" });
  });

  it("wraps the appliance list in the replace-all envelope", async () => {
    await putAppliances([{ type: "ceiling_fan", count: 3, daily_hours: 8 }], { token: TOKEN });
    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/api/v1/profile/appliances");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({
      appliances: [{ type: "ceiling_fan", count: 3, daily_hours: 8 }],
    });
  });

  it("sends a bill photo as multipart, without a JSON content type", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "bill.jpg", { type: "image/jpeg" });
    await uploadBill(file, { token: TOKEN });
    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/api/v1/bills/upload");
    expect(init.body).toBeInstanceOf(FormData);
    // The browser must set its own multipart boundary.
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("defaults a new cylinder to today's chosen size", async () => {
    await startLpgCycle({ start_date: "2026-09-24", cylinder_kg: 14.2 }, { token: TOKEN });
    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/api/v1/lpg/cycles");
    expect(JSON.parse(String(init.body))).toEqual({
      start_date: "2026-09-24",
      cylinder_kg: 14.2,
    });
  });
});
