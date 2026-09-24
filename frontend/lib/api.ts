/**
 * Low-level typed fetch wrapper for the SAVERA backend (`${API_URL}/api/v1`).
 *
 * Transport-agnostic: it never looks up a session itself. `lib/api.server.ts`
 * and `lib/api.client.ts` supply the bearer token and decide what a 401 means
 * in their environment. Call sites in the UI go through `lib/endpoints.ts`.
 */
import { getApiBase } from "@/lib/env";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Query-string values; `undefined` and `null` entries are dropped. */
export type QueryValue = string | number | boolean | null | undefined;

/** Paths are always given relative to `/api/v1` and must start with `/`. */
export type ApiPath = `/${string}`;

export interface ApiOptions {
  method?: ApiMethod;
  /** JSON-encoded unless it is a FormData instance (multipart upload). */
  body?: unknown | FormData;
  /** Supabase access token; omitted when null/undefined. */
  token?: string | null;
  signal?: AbortSignal;
  /** Abort after this many milliseconds (default 8000). */
  timeoutMs?: number;
  cache?: RequestCache;
  query?: Record<string, QueryValue>;
  /** Extra headers merged last (rarely needed). */
  headers?: Record<string, string>;
}

export const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Every failure of `apiFetch` is an ApiError.
 *  - `status` is the HTTP status, or 0 when the request never completed.
 *  - `code` is the backend's `code` field when present, else `http_<status>`,
 *    `network` (unreachable / timed out) or `aborted` (caller cancelled).
 *  - `details` is the parsed response body (or a `{ cause }` object).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isNetwork(): boolean {
    return this.status === 0 && this.code === "network";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

/** Builds `${base}${path}?${query}` with empty values dropped. */
export function buildUrl(path: ApiPath, query?: Record<string, QueryValue>): string {
  const url = `${getApiBase()}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url;
}

interface ValidationItem {
  loc?: unknown[];
  msg?: string;
}

/**
 * Turns a FastAPI error body into one human sentence.
 * FastAPI uses `{detail: string}` for HTTPException and
 * `{detail: [{loc, msg, type}]}` for 422 validation errors; the backend may
 * also send `{message}` or `{code, detail}`.
 */
export function messageFromBody(body: unknown, status: number, statusText = ""): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const detail = record.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const parts = detail
        .map((item) => {
          const v = item as ValidationItem;
          if (!v || typeof v.msg !== "string") return null;
          const field = Array.isArray(v.loc)
            ? v.loc.filter((p) => p !== "body" && p !== "query" && p !== "path").join(".")
            : "";
          return field ? `${field}: ${v.msg}` : v.msg;
        })
        .filter((p): p is string => Boolean(p));
      if (parts.length) return parts.join("; ");
    }
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
  }
  if (typeof body === "string" && body.trim()) return body.trim();
  return statusText || `Request failed (${status})`;
}

function codeFromBody(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const code = (body as Record<string, unknown>).code;
    if (typeof code === "string" && code) return code;
  }
  return `http_${status}`;
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Performs one request against the backend and returns the decoded JSON body.
 * Resolves `undefined` for 204/205 or an empty body. Throws ApiError otherwise.
 */
export async function apiFetch<T>(path: ApiPath, opts: ApiOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    token,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cache = "no-store",
    query,
    headers: extraHeaders,
  } = opts;

  const url = buildUrl(path, query);
  const headers: Record<string, string> = { Accept: "application/json" };
  const multipart = isFormData(body);
  if (body !== undefined && !multipart) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  Object.assign(headers, extraHeaders);

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
      cache,
      signal: controller.signal,
    });
  } catch (cause) {
    if (timedOut) {
      throw new ApiError(0, "network", "The server took too long to respond — please try again.", {
        timeout: true,
        cause,
      });
    }
    if (signal?.aborted) {
      throw new ApiError(0, "aborted", "Request was cancelled.", { cause });
    }
    throw new ApiError(0, "network", "Could not reach the SAVERA server — check your connection.", {
      cause,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }

  if (res.status === 204 || res.status === 205) return undefined as T;

  const parsed = await readBody(res);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      codeFromBody(parsed, res.status),
      messageFromBody(parsed, res.status, res.statusText),
      parsed,
    );
  }
  return parsed as T;
}

/** One-line, user-facing description of any thrown value (for toasts). */
export function describeError(err: unknown, fallback = "Something went wrong — please try again."): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
