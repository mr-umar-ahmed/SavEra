"use client";

import { useState } from "react";
import type { Role } from "@/types";
import { RoleGuard } from "./RoleGuard";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { VoiceAssistant } from "@/components/voice/VoiceAssistant";

interface PortalShellProps {
  role: Role;
  children: React.ReactNode;
}

export function PortalShell({ role, children }: PortalShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RoleGuard role={role}>
      <div className="min-h-screen bg-[#050B08] text-foreground flex">
        {/* Fixed Desktop / Off-canvas Mobile Sidebar */}
        <Sidebar
          role={role}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          <TopBar onOpenSidebar={() => setSidebarOpen(true)} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
            {children}
          </main>
        </div>

        {/* Global Floating Elements */}
        <NotificationsDrawer />
        <VoiceAssistant />
      </div>
    </RoleGuard>
  );
}
