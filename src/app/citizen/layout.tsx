"use client";

import { PortalShell } from "@/components/layout/PortalShell";

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell role="citizen">{children}</PortalShell>;
}
