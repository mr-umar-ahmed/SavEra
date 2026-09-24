import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch, buildUrl, messageFromBody } from "@/lib/api";
import { getApiBase, getApiUrl } from "@/lib/env";

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(status: number, body?: unknown, statusText = ""): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
}

function lastRequest(fetchMock: FetchMock): { url: string; init: RequestInit } {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error("fetch was not called");
  return { url: String(call[0]), init: (call[1] ?? {}) as RequestInit };
}

describe("env", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the origin without a trailing slash and appends /api/v1", () => {
    expect(getApiUrl()).toBe("http://localhost:8000");
    expect(getApiBase()).toBe("http://localhost:8000/api/v1");
  });

  it("throws a clear error when NEXT_PUBLIC_API_URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(() => getApiUrl()).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});

describe("apiFetch", () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("builds the URL under /api/v1, sends JSON headers and the bearer token", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: "abc" }));

    const result = await apiFetch<{ id: string }>("/profile", {
      method: "PATCH",
      body: { name: "Ananya" },
      token: "tok-123",
      query: { limit: 12, skip: undefined, city: "Bengaluru" },
    });

    expect(result).toEqual({ id: "abc" });
    const { url, init } = lastRequest(fetchMock);
    expect(url).toBe("http://localhost:8000/api/v1/profile?limit=12&city=Bengaluru");
    expect(init.method).toBe("PATCH");
    expect(init.cache).toBe("no-store");
    expect(init.body).toBe(JSON.stringify({ name: "Ananya" }));
    const headers = init.headers as Record<string, string>;
    expect(headers.Accept).toBe("application/json");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBe("Bearer tok-123");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("omits Authorization and Content-Type when there is no token or body", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    await apiFetch("/wards");
    const { init } = lastRequest(fetchMock);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["Content-Type"]).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it("passes FormData through untouched and lets the browser set the multipart boundary", async () => {
    fetchMock.mockResolvedValue(jsonResponse(202, { id: "job-1", status: "pending" }));
    const form = new FormData();
    form.append("file", new Blob(["x"], { type: "image/jpeg" }), "bill.jpg");

    const job = await apiFetch<{ id: string; status: string }>("/bills/upload", {
      method: "POST",
      body: form,
      token: "t",
    });

    expect(job.status).toBe("pending");
    const { init } = lastRequest(fetchMock);
    expect(init.body).toBe(form);
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("maps a 404 to ApiError with the status, code and backend detail", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { detail: "Cycle not found" }, "Not Found"));

    const err = await apiFetch("/lpg/cycles/nope").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    const apiErr = err as ApiError;
    expect(apiErr.status).toBe(404);
    expect(apiErr.code).toBe("http_404");
    expect(apiErr.message).toBe("Cycle not found");
    expect(apiErr.details).toEqual({ detail: "Cycle not found" });
  });

  it("prefers the backend code and flattens 422 validation details", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        detail: [{ loc: ["body", "kwh"], msg: "Input should be greater than 0", type: "greater_than" }],
      }),
    );
    const err = (await apiFetch("/readings/electricity", { method: "POST", body: { kwh: 0 } }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(err.status).toBe(422);
    expect(err.message).toBe("kwh: Input should be greater than 0");

    fetchMock.mockResolvedValue(jsonResponse(409, { code: "overlap", detail: "Billing period overlaps" }));
    const conflict = (await apiFetch("/readings/electricity", { method: "POST", body: {} }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(conflict.code).toBe("overlap");
    expect(conflict.isConflict).toBe(true);
  });

  it("returns undefined for a 204 response", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const result = await apiFetch<void>("/profile/push-token", { method: "DELETE", token: "t" });
    expect(result).toBeUndefined();
  });

  it("times out and surfaces a network ApiError", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    const pending = apiFetch("/insights/dashboard", { timeoutMs: 50 });
    const assertion = expect(pending).rejects.toMatchObject({
      status: 0,
      code: "network",
      details: { timeout: true },
    });
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
  });

  it("wraps a failed fetch (server down) as ApiError(0, 'network')", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = (await apiFetch("/profile").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.code).toBe("network");
    expect(err.isNetwork).toBe(true);
  });

  it("reports a caller-initiated abort as 'aborted', not as a network failure", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const pending = apiFetch("/alerts", { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ status: 0, code: "aborted" });
  });
});

describe("helpers", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("buildUrl drops null/undefined query values", () => {
    expect(buildUrl("/alerts", { unread_only: true, limit: null, before: undefined })).toBe(
      "http://localhost:8000/api/v1/alerts?unread_only=true",
    );
    expect(buildUrl("/wards")).toBe("http://localhost:8000/api/v1/wards");
  });

  it("messageFromBody falls back to statusText then a generic sentence", () => {
    expect(messageFromBody({ message: "nope" }, 400)).toBe("nope");
    expect(messageFromBody("plain text", 500)).toBe("plain text");
    expect(messageFromBody(undefined, 502, "Bad Gateway")).toBe("Bad Gateway");
    expect(messageFromBody(undefined, 502)).toBe("Request failed (502)");
  });
});
