import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 proxy (formerly middleware): refreshes the Supabase session and
 * redirects unauthenticated visitors to /login. Runs on the Node.js runtime.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match every path except static assets and files that never need auth:
     * - _next/static, _next/image
     * - favicon.ico, manifest.webmanifest, icons/, firebase-messaging-sw.js
     * - images (svg, png, jpg, jpeg, gif, webp, ico)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|firebase-messaging-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
