import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/safe-path";

describe("safeNextPath", () => {
  it("accepts in-app paths, with query and fragment", () => {
    expect(safeNextPath("/electricity")).toBe("/electricity");
    expect(safeNextPath("/water?days=30")).toBe("/water?days=30");
    expect(safeNextPath("/lpg#current")).toBe("/lpg#current");
  });

  it("trims surrounding whitespace", () => {
    expect(safeNextPath("  /profile  ")).toBe("/profile");
  });

  it.each([
    ["a protocol-relative URL", "//evil.example.com/steal"],
    ["an absolute URL", "https://evil.example.com"],
    ["a scheme-like path", "/javascript:alert(1)"],
    ["a backslash escape", "/\\evil.example.com"],
    ["a header-injection attempt", "/ok\r\nSet-Cookie: a=b"],
    ["a bare path without a leading slash", "electricity"],
    ["an empty value", ""],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s", (_label, value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});
