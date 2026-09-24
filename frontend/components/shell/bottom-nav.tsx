"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, isActive } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

/**
 * Thumb-reach tab bar, mobile only (the sidebar takes over at md). Fixed to the
 * bottom with a safe-area inset so it clears the iOS home indicator; the shell
 * reserves the matching space so nothing hides behind it.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-safe backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring flex touch-target flex-col items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors",
                  active ? item.activeClass : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
