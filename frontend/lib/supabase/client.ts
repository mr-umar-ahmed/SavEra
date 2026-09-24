"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isAuthError } from "@supabase/supabase-js";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";

/**
 * Browser Supabase client. `createBrowserClient` returns a per-tab singleton
 * that persists the session in cookies so the proxy and Server Components can
 * read it. Call this inside handlers/effects, never at module scope, so
 * prerendering never touches it.
 */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
}

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "That email and password don't match. Try again, or use a magic link instead.",
  email_not_confirmed: "Please confirm your email first — open the link we sent you.",
  user_already_exists: "An account with this email already exists — sign in instead.",
  email_exists: "An account with this email already exists — sign in instead.",
  weak_password: "Choose a stronger password with at least 8 characters.",
  same_password: "Choose a password you haven't used before.",
  signup_disabled: "Sign-ups are closed right now. Please try again later.",
  otp_expired: "That link has expired or was already used. Send a new one.",
  otp_disabled: "Email links are turned off for this project. Use your password instead.",
  over_email_send_rate_limit: "Too many emails were sent to this address — wait a minute and try again.",
  over_request_rate_limit: "Too many attempts — wait a minute and try again.",
  email_address_invalid: "That doesn't look like a valid email address.",
  email_address_not_authorized: "This email address can't be used to sign up here.",
  validation_failed: "Please check the details you entered and try again.",
  request_timeout: "The sign-in service took too long to respond — please try again.",
  user_banned: "This account is currently blocked. Contact support for help.",
};

/**
 * Maps a Supabase AuthError (or anything else thrown by an auth call) to one
 * friendly sentence for a toast or inline message. Never leaks raw codes.
 */
export function authErrorMessage(err: unknown): string {
  if (isAuthError(err)) {
    if (err.code && AUTH_MESSAGES[err.code]) return AUTH_MESSAGES[err.code];
    const text = err.message.toLowerCase();
    if (text.includes("invalid login credentials")) return AUTH_MESSAGES.invalid_credentials;
    if (text.includes("email not confirmed")) return AUTH_MESSAGES.email_not_confirmed;
    if (text.includes("already registered")) return AUTH_MESSAGES.user_already_exists;
    if (text.includes("rate limit")) return AUTH_MESSAGES.over_email_send_rate_limit;
    if (text.includes("password should be")) return AUTH_MESSAGES.weak_password;
    if (text.includes("fetch") || text.includes("network")) {
      return "Could not reach the sign-in service — check your connection and try again.";
    }
    return err.message || "Something went wrong — please try again.";
  }
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
    return "Could not reach the sign-in service — check your connection and try again.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong — please try again.";
}
