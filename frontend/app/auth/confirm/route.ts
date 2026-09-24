import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/supabase/proxy";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: ReadonlySet<string> = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

/**
 * Landing route for magic-link and sign-up confirmation emails.
 *
 * Supabase email templates are configured as
 * `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink|email`,
 * so this handler exchanges `token_hash` + `type` for a session via
 * `verifyOtp`. The default (un-customised) templates redirect here with a
 * PKCE `code` instead, which is exchanged the same way. On success the user
 * lands on `next` (validated) or `/`; on failure on `/login?error=link_expired`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next")) ?? "/";

  let verified = false;
  if (tokenHash && type && OTP_TYPES.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    verified = !error;
  } else if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  }

  if (verified) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const failure = new URL("/login", origin);
  failure.searchParams.set("error", "link_expired");
  return NextResponse.redirect(failure);
}
