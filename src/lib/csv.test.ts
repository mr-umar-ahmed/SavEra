import { describe, expect, it } from "vitest";

import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes a header row and quotes cells that need it", () => {
    const csv = toCsv(
      [
        { area: "ABC Colony", kg: 4900, note: 'said "high", check' },
        { area: "DEF Colony", kg: 3950, note: undefined },
      ],
      [
        { header: "Area", value: (r) => r.area },
        { header: "Consumption (kg)", value: (r) => r.kg },
        { header: "Note", value: (r) => r.note },
      ],
    );
    expect(csv).toBe(
      'Area,Consumption (kg),Note\r\nABC Colony,4900,"said ""high"", check"\r\nDEF Colony,3950,',
    );
  });
});
