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

/** Title-cases the second path segment (`/citizen/green-score` → "Green Score"). */
function sectionTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const raw = segments.length > 1 ? segments[1] : (segments[0] ?? "dashboard");
  if (segments.length === 1) return "Home";
  return raw
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function TopBar({ onOpenSidebar }: TopBarProps) {
  const pathname = usePathname();
  const toggleNotifications = useUiStore((s) => s.toggleNotifications);
  const { unreadCount } = useNotifications();
  const currentTitle = sectionTitle(pathname);

  return (
    <header className="bg-background/90 border-border sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b px-3 backdrop-blur-md sm:px-4 lg:px-10">
      {/* Left: mobile menu + breadcrumb */}
      <div className="flex items-center gap-3">
        {onOpenSidebar && (
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenSidebar}
            className="size-10 lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </Button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-base">
          <span className="text-foreground hidden font-bold tracking-wide sm:inline-block">SAVERA</span>
          <span className="text-faint hidden sm:inline-block">/</span>
          <span className="text-primary max-w-[7.5rem] truncate font-semibold sm:max-w-none">{currentTitle}</span>
        </nav>
      </div>

      {/* Right: global controls */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleNotifications}
          className="relative h-10 gap-2 px-2.5 text-sm font-semibold has-[>svg]:px-2.5 sm:px-4 sm:has-[>svg]:px-3.5"
          aria-label={`Alerts${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="size-[1.1rem]" />
          <span className="hidden sm:inline-block">Alerts</span>
          {unreadCount > 0 && (
            <span className="bg-tone-critical ring-background absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-2xs font-bold text-white ring-2">
              {unreadCount}
            </span>
          )}
        </Button>

        <RoleSwitcher />
        <ResetDemoButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
