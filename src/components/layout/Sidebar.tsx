"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Sprout, X } from "lucide-react";
import type { Role } from "@/types";
import { CITIZEN_NAV, GOV_NAV, SUPERVISOR_NAV } from "./nav";
import { useSessionStore } from "@/stores/session";
import { HackfinixBadge } from "@/components/features/hackathon/HackfinixBadge";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: Role;
  isOpen?: boolean;
  onClose?: () => void;
}

const ROLE_META: Record<Role, { title: string; subtitle: string; context: string; home: string }> = {
  citizen: {
    title: "Citizen Portal",
    subtitle: "Household Resource Intelligence",
    context: "H-1024 · XYZ Colony",
    home: "/citizen",
  },
  supervisor: {
    title: "Supervisor Portal",
    subtitle: "Ward 24 Operations",
    context: "Ward 24 Desk",
    home: "/supervisor",
  },
  gov: {
    title: "Government Command",
    subtitle: "City-Scale Grid & Utilities",
    context: "Municipal Headquarters",
    home: "/gov",
  },
};

export function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useSessionStore((s) => s.user);

  const navItems = role === "citizen" ? CITIZEN_NAV : role === "supervisor" ? SUPERVISOR_NAV : GOV_NAV;
  const meta = ROLE_META[role];
  const context =
    role === "citizen" && user?.householdId
      ? `${user.householdId} · ${user.householdId === "H-1088" ? "ABC Colony" : "XYZ Colony"}`
      : meta.context;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div onClick={onClose} className="bg-overlay fixed inset-0 z-40 backdrop-blur-sm lg:hidden" />
      )}

      <aside
        className={cn(
          "bg-sidebar border-sidebar-border fixed top-0 bottom-0 left-0 z-40 flex w-68 flex-col border-r transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand header */}
        <div className="border-sidebar-border flex h-20 shrink-0 items-center justify-between border-b px-5">
          <Link href={meta.home} className="group flex items-center gap-3">
            <span className="bg-positive text-positive-foreground flex size-11 items-center justify-center rounded-full shadow-sm transition-transform group-hover:scale-105">
              <Sprout className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="flex items-center gap-2">
                <span className="font-display text-foreground text-xl font-extrabold tracking-wide">
                  SAVERA
                </span>
                <span className="bg-positive-soft text-positive border-positive/25 rounded-md border px-1.5 py-0.5 font-mono text-2xs font-semibold">
                  v2.0
                </span>
              </span>
              <span className="text-muted-foreground block text-sm">{meta.title}</span>
            </span>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-lg p-1.5 transition-colors lg:hidden"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Portal navigation">
          <div className="text-faint px-3 pb-2 font-mono text-xs tracking-[0.14em] uppercase">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isRoot = item.href === "/citizen" || item.href === "/supervisor" || item.href === "/gov";
            const isActive = isRoot
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-[0.9375rem] transition-all",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium",
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icon
                    className={cn(
                      "size-[1.15rem] shrink-0 transition-colors",
                      isActive ? "text-sidebar-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="truncate">{item.title}</span>
                </span>

                {item.badge && (
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-2xs font-semibold tracking-wider uppercase",
                      isActive
                        ? "border-sidebar-primary-foreground/30 text-sidebar-primary-foreground"
                        : "border-border-strong bg-secondary text-soft",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Active context footer */}
        <div className="border-sidebar-border shrink-0 space-y-3 border-t p-4">
          <div className="bg-card border-border rounded-xl border p-3.5 shadow-xs">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Context</span>
              <span className="text-positive font-mono text-xs font-semibold">Raichur, KA</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
                <MapPin className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="text-foreground block truncate text-sm font-bold">{context}</span>
                <span className="text-muted-foreground block truncate text-xs">{meta.subtitle}</span>
              </span>
            </div>
          </div>
          <div className="flex justify-center">
            <HackfinixBadge variant="compact" showDemoLink={false} />
          </div>
        </div>
      </aside>
    </>
  );
}
