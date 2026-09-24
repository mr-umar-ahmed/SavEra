"use client";

import { PortalShell } from "@/components/layout/PortalShell";

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell role="supervisor">{children}</PortalShell>;
}
