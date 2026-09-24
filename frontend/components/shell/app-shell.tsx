import Link from "next/link";
import type { ReactNode } from "react";

import { Logo, LogoMark } from "@/components/brand/logo";
import { AccountMenu } from "@/components/shell/account-menu";
import { BottomNav } from "@/components/shell/bottom-nav";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import type { Profile } from "@/lib/types";

/**
 * The signed-in frame: a tab bar under 768 px and a fixed sidebar above it.
 *
 * Nothing inside `main` is wider than the 390 px reference viewport minus the
 * 16 px gutters, and the bottom padding reserves room for the tab bar plus the
 * iOS safe area so the last card is never trapped underneath it.
 */
export function AppShell({ profile, children }: { profile: Profile; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar py-4 md:flex">
        <Link href="/" className="focus-ring mb-6 rounded-lg px-5">
          <Logo />
        </Link>
        <SidebarNav />
        <div className="mt-auto px-5 pt-4">
          <p className="text-xs text-muted-foreground">
            Estimates from your own readings — nothing here is metered by us.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-2 pt-safe backdrop-blur md:px-8">
          <Link href="/" className="focus-ring flex items-center gap-2 rounded-lg md:hidden">
            <LogoMark className="size-7" />
            <span className="font-display text-lg font-extrabold tracking-tight">SAVERA</span>
          </Link>
          <span className="hidden text-sm text-muted-foreground md:block">
            {profile.ward_name ? `${profile.ward_name}, ${profile.city}` : profile.city}
          </span>
          <AccountMenu
            name={profile.name}
            email={profile.email}
            wardName={profile.ward_name}
          />
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
