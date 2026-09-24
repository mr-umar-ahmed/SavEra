"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import type { Role } from "@/types";
import { CITIZEN_NAV, GOV_NAV, SUPERVISOR_NAV } from "./nav";
import { useSessionStore } from "@/stores/session";

interface SidebarProps {
  role: Role;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useSessionStore((s) => s.user);

  const navItems =
    role === "citizen"
      ? CITIZEN_NAV
      : role === "supervisor"
      ? SUPERVISOR_NAV
      : GOV_NAV;

  const roleTitle =
    role === "citizen"
      ? "Citizen Portal"
      : role === "supervisor"
      ? "Supervisor Portal"
      : "Government Command";

  const roleSubtitle =
    role === "citizen"
      ? "Household Resource Intelligence"
      : role === "supervisor"
      ? "Ward 24 Operations"
      : "City-Scale Grid & Utilities";

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col bg-[#070D0A]/95 border-r border-white/10 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 shrink-0">
          <Link
            href={role === "citizen" ? "/citizen" : role === "supervisor" ? "/supervisor" : "/gov"}
            className="flex items-center gap-2.5 group"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4 text-[#050B08]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-base text-white font-sans">
                  SAV<span className="text-emerald-400">ERA</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium -mt-0.5">{roleTitle}</p>
            </div>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === `/citizen` || item.href === `/supervisor` || item.href === `/gov`
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm shadow-emerald-950"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? "text-emerald-400" : "text-white/40 group-hover:text-white/80"
                    }`}
                  />
                  <span className="truncate">{item.title}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                      isActive
                        ? "bg-emerald-500/30 text-emerald-200"
                        : "bg-white/10 text-white/60 group-hover:text-white/90"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Scope / Bottom footer */}
        <div className="p-3 border-t border-white/10 shrink-0 bg-black/30">
          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2.5">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-white/60">Active Context</span>
              <span className="text-emerald-400 font-mono font-medium">Raichur, KA</span>
            </div>
            <p className="text-xs font-semibold text-white truncate">
              {user?.displayNamePublic ? "Public Citizen" : user?.role === "citizen" ? "H-1024 · XYZ Colony" : user?.role === "supervisor" ? "Ward 24 Desk" : "Municipal Headquarters"}
            </p>
            <p className="text-[10px] text-white/40 truncate">{roleSubtitle}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
