"use client";

import { useState } from "react";
import type { Role } from "@/types";
import { RoleGuard } from "./RoleGuard";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { MobileTabBar } from "./MobileTabBar";
import { VoiceAssistant } from "@/components/voice/VoiceAssistant";

interface PortalShellProps {
  role: Role;
  children: React.ReactNode;
}

export function PortalShell({ role, children }: PortalShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RoleGuard role={role}>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Fixed Desktop / Off-canvas Mobile Sidebar */}
        <Sidebar
          role={role}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-68">
          <TopBar onOpenSidebar={() => setSidebarOpen(true)} />

          <main className="animate-fade-up mx-auto w-full max-w-[88rem] flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-8">
            {children}
          </main>
        </div>

        {/* Global Floating Elements */}
        <MobileTabBar role={role} onMore={() => setSidebarOpen(true)} />
        <NotificationsDrawer />
        <VoiceAssistant />
      </div>
    </RoleGuard>
  );
}
