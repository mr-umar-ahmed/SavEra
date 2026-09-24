import type { Metadata } from "next";

import { ProfileEditor } from "@/components/profile/profile-editor";
import { withAuth } from "@/lib/api.server";
import { getApplianceTypes, getAppliances, getProfile, getWards } from "@/lib/endpoints";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { profile, wards, catalog, appliances } = await withAuth(async (ctx) => {
    const profile = await getProfile(ctx);
    const [wards, catalog, appliances] = await Promise.all([
      getWards(profile.city, ctx),
      getApplianceTypes(ctx),
      getAppliances(ctx),
    ]);
    return { profile, wards, catalog, appliances };
  });

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          What we use to compare fairly and to break your bill down.
        </p>
      </header>
      <ProfileEditor profile={profile} wards={wards} catalog={catalog} appliances={appliances} />
    </div>
  );
}
