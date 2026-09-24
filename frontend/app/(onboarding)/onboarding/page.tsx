import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { withAuth } from "@/lib/api.server";
import { getApplianceTypes, getAppliances, getProfile, getWards } from "@/lib/endpoints";

export const metadata: Metadata = { title: "Set up your home" };

/**
 * Day-one setup. It lives outside the app shell on purpose: there is nothing
 * to navigate to until a ward is chosen, so showing tabs would only offer
 * dead ends.
 */
export default async function OnboardingPage() {
  const { profile, wards, catalog, appliances } = await withAuth(async (ctx) => {
    const profile = await getProfile(ctx);
    const [wards, catalog, appliances] = await Promise.all([
      getWards(profile.city, ctx),
      getApplianceTypes(ctx),
      getAppliances(ctx),
    ]);
    return { profile, wards, catalog, appliances };
  });

  // Someone who already finished setup and typed the URL belongs on the home page.
  if (profile.onboarding_complete && appliances.length > 0) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 px-safe">
      <Logo className="mb-8" />
      <OnboardingFlow profile={profile} wards={wards} catalog={catalog} appliances={appliances} />
    </div>
  );
}
