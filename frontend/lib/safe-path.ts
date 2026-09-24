/**
 * `next=` redirect target validation, shared by the proxy, the email-link
 * route handler and the auth form.
 *
 * It lives in its own module — with no `next/server` or Supabase import — so a
 * Client Component can use it without dragging server-only code into the
 * browser bundle.
 */

/**
 * Accepts a `next` value only when it is an in-app path: starts with `/` and
 * a letter, never `//` or a scheme. Returns null for anything else, so callers
 * fall back to `/` and an open redirect is impossible.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!/^\/[a-z]/i.test(value)) return null;
  if (value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) return null;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return value;
}
