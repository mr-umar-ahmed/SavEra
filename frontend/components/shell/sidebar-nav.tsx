"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, isActive } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

/** Desktop counterpart of the tab bar (md and up). */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="px-3">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring flex touch-target items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  active
                    ? cn("bg-sidebar-accent", item.activeClass)
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
