"use client";

import { PortalShell } from "@/components/layout/PortalShell";

export default function GovLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell role="gov">{children}</PortalShell>;
}
