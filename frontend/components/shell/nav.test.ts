import { describe, expect, it } from "vitest";

import { NAV_ITEMS, isActive } from "@/components/shell/nav";

describe("NAV_ITEMS", () => {
  it("points every tab at a route that exists", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/",
      "/electricity",
      "/water",
      "/lpg",
    ]);
  });

  it("has a unique destination per tab", () => {
    expect(new Set(NAV_ITEMS.map((item) => item.href)).size).toBe(NAV_ITEMS.length);
  });
});

describe("isActive", () => {
  it("lights Home only on the home page", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/", "/water")).toBe(false);
  });

  it("stays lit on a child route", () => {
    expect(isActive("/electricity", "/electricity")).toBe(true);
    expect(isActive("/electricity", "/electricity/abc123")).toBe(true);
  });

  it("does not light a tab whose path is merely a prefix of another", () => {
    expect(isActive("/water", "/water-quality")).toBe(false);
  });

  it("lights exactly one tab for any app route", () => {
    for (const pathname of ["/", "/electricity", "/water", "/lpg", "/lpg/2026"]) {
      const lit = NAV_ITEMS.filter((item) => isActive(item.href, pathname));
      expect(lit).toHaveLength(1);
    }
  });
});
