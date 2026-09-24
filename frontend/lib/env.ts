/**
 * Public environment variables for the SAVERA frontend.
 *
 * Every accessor reads `process.env.NEXT_PUBLIC_*` with a literal member
 * expression so Next.js can inline the value into browser bundles, and
 * throws a clear error when a value is missing instead of letting a request
 * fail somewhere deep inside Supabase or fetch.
 */

const SETUP_HINT =
  "Copy the frontend block of .env.example to frontend/.env.local and set it.";

function missing(name: string, extra?: string): Error {
  return new Error(
    `Missing environment variable ${name}.${extra ? ` ${extra}` : ""} ${SETUP_HINT}`,
  );
}

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

/** Supabase project URL, e.g. https://abcd.supabase.co */
export function getSupabaseUrl(): string {
  const value = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!value) throw missing("NEXT_PUBLIC_SUPABASE_URL");
  return value.replace(/\/+$/, "");
}

/**
 * Supabase publishable key (`sb_publishable_…`). The legacy anon JWT is also
 * accepted through NEXT_PUBLIC_SUPABASE_ANON_KEY for older projects.
 */
export function getSupabasePublishableKey(): string {
  const value =
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!value) {
    throw missing(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "(the legacy NEXT_PUBLIC_SUPABASE_ANON_KEY is also accepted).",
    );
  }
  return value;
}

/** Path prefix every backend route lives under. */
export const API_BASE_PATH = "/api/v1";

/**
 * Backend origin only (scheme + host + port), e.g. http://localhost:8000.
 * The API client appends `/api/v1` itself; a trailing slash or an accidental
 * `/api/v1` suffix is stripped so both spellings work.
 */
export function getApiUrl(): string {
  const raw = clean(process.env.NEXT_PUBLIC_API_URL);
  if (!raw) throw missing("NEXT_PUBLIC_API_URL", "(backend origin, e.g. http://localhost:8000).");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_API_URL must be an absolute origin such as http://localhost:8000 (got "${raw}"). ${SETUP_HINT}`,
    );
  }
  const origin = parsed.origin;
  const path = parsed.pathname.replace(/\/+$/, "");
  if (path && path !== API_BASE_PATH) {
    throw new Error(
      `NEXT_PUBLIC_API_URL must be the backend origin without a path (got "${raw}"); the client appends ${API_BASE_PATH} itself.`,
    );
  }
  return origin;
}

/** Full base for API requests: `${origin}/api/v1`. */
export function getApiBase(): string {
  return `${getApiUrl()}${API_BASE_PATH}`;
}
