import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { withAuth } from "@/lib/api.server";
import { getProfile } from "@/lib/endpoints";

/**
 * Every signed-in page. The profile is fetched once here and handed to the
 * shell, and anyone who has not picked a ward yet is sent through onboarding
 * first — without it there is no ward to compare against and no household size
 * to normalise by.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await withAuth((ctx) => getProfile(ctx));
  if (!profile.onboarding_complete) redirect("/onboarding");
  return <AppShell profile={profile}>{children}</AppShell>;
}
