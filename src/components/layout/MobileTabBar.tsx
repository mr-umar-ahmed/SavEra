"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, type LucideIcon } from "lucide-react";

import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import { CITIZEN_NAV, GOV_NAV, SUPERVISOR_NAV, type NavItem } from "./nav";

interface MobileTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Short labels for the four primary destinations per role; the fifth slot is "More" (opens the drawer). */
const TAB_CONFIG: Record<Role, { source: NavItem[]; picks: Array<[href: string, label: string]> }> = {
  citizen: {
    source: CITIZEN_NAV,
    picks: [
      ["/citizen", "Home"],
      ["/citizen/electricity", "Electricity"],
      ["/citizen/water", "Water"],
      ["/citizen/gas", "LPG"],
    ],
  },
  supervisor: {
    source: SUPERVISOR_NAV,
    picks: [
      ["/supervisor", "Ward"],
      ["/supervisor/water", "Water"],
      ["/supervisor/gas", "LPG"],
      ["/supervisor/electricity", "Grid"],
    ],
  },
  gov: {
    source: GOV_NAV,
    picks: [
      ["/gov", "Command"],
      ["/gov/electricity", "Grid"],
      ["/gov/water", "Water"],
      ["/gov/gas", "LPG"],
    ],
  },
};

function tabsFor(role: Role): MobileTab[] {
  const { source, picks } = TAB_CONFIG[role];
  return picks.flatMap(([href, label]) => {
    const item = source.find((n) => n.href === href);
    return item ? [{ href, label, icon: item.icon }] : [];
  });
}

const ROOTS = new Set(["/citizen", "/supervisor", "/gov"]);

function isActivePath(pathname: string, href: string): boolean {
  if (ROOTS.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface MobileTabBarProps {
  role: Role;
  /** Opens the off-canvas sidebar (the "More" tab). */
  onMore: () => void;
}

/**
 * Thumb-reach bottom navigation for phones and small tablets (hidden at `lg`, where the
 * sidebar is fixed). Four primary destinations per role plus "More", which opens the full
 * navigation drawer. Respects the iOS home-indicator safe area.
 */
export function MobileTabBar({ role, onMore }: MobileTabBarProps) {
  const pathname = usePathname();
  const tabs = tabsFor(role);
  const anyTabActive = tabs.some((t) => isActivePath(pathname, t.href));

  return (
    <nav
      aria-label="Primary (mobile)"
      className="bg-card/95 border-border fixed inset-x-0 bottom-0 z-30 border-t shadow-[0_-8px_24px_-16px_rgb(58_38_20/0.25)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActivePath(pathname, tab.href);
          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-full flex-col items-center justify-center gap-1 outline-none transition-colors focus-visible:bg-muted",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent",
                  )}
                >
                  <Icon className="size-[1.15rem]" aria-hidden />
                </span>
                <span className={cn("truncate text-2xs font-semibold tracking-wide", active && "font-bold")}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <button
            type="button"
            onClick={onMore}
            aria-label="Open full navigation"
            className={cn(
              "flex h-full w-full flex-col items-center justify-center gap-1 outline-none transition-colors focus-visible:bg-muted",
              !anyTabActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                !anyTabActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent",
              )}
            >
              <Menu className="size-[1.15rem]" aria-hidden />
            </span>
            <span className={cn("text-2xs font-semibold tracking-wide", !anyTabActive && "font-bold")}>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
