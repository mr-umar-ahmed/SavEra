import { Bell, Droplets, Flame, Home, Zap, type LucideIcon } from "lucide-react";

/**
 * The primary destinations. The same list drives the mobile tab bar and the
 * desktop sidebar so the two can never drift apart.
 *
 * Alerts joined the list in Phase 3, once there was a page for it to reach.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind text colour for the active state; resource pages keep their own hue. */
  activeClass: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Home", icon: Home, activeClass: "text-primary" },
  { href: "/electricity", label: "Power", icon: Zap, activeClass: "text-electricity-fg" },
  { href: "/water", label: "Water", icon: Droplets, activeClass: "text-water-fg" },
  { href: "/lpg", label: "Gas", icon: Flame, activeClass: "text-lpg-fg" },
  { href: "/alerts", label: "Alerts", icon: Bell, activeClass: "text-primary" },
];

/** Marks the deepest matching item, so `/electricity/123` still lights "Power". */
export function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
