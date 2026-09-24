"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";
import { ResetDemoButton } from "./ResetDemoButton";
import { ThemeToggle } from "./ThemeToggle";
import { useUiStore } from "@/stores/ui";
import { useNotifications } from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  onOpenSidebar?: () => void;
}

export function TopBar({ onOpenSidebar }: TopBarProps) {
  const pathname = usePathname();
  const toggleNotifications = useUiStore((s) => s.toggleNotifications);
  const { unreadCount } = useNotifications();

  // Generate clean section title from pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const currentTitle =
    pathSegments.length > 1
      ? pathSegments[1]
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : pathSegments[0]
      ? pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1)
      : "Dashboard";

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-white/10 bg-[#050B08]/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8">
      {/* Left side: Mobile menu toggle + Breadcrumb / Portal label */}
      <div className="flex items-center gap-3">
        {onOpenSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSidebar}
            className="lg:hidden h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-white/90 tracking-wide hidden sm:inline-block">
            SAVERA
          </span>
          <span className="text-white/30 hidden sm:inline-block">/</span>
          <span className="font-medium text-emerald-400 capitalize">{currentTitle}</span>
        </div>
      </div>

      {/* Right side: Global controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Notifications trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleNotifications}
          className="relative h-8 w-8 sm:w-auto sm:px-2.5 gap-1.5 border-white/10 bg-[#0A0F0D] text-white/80 hover:text-white hover:bg-white/10 rounded-full"
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5 text-white/70" />
          <span className="hidden sm:inline-block text-xs font-medium">Alerts</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-mono font-bold text-black shadow-sm shadow-emerald-500/50">
              {unreadCount}
            </span>
          )}
        </Button>

        {/* Persona Switcher */}
        <RoleSwitcher />

        {/* Reset Demo button */}
        <ResetDemoButton />

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
