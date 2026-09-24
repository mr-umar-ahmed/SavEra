import { describe, expect, it } from "vitest";

import { confidenceLabel } from "@/components/bills/bill-upload";
import { initialsFor } from "@/components/shell/account-menu";

describe("confidenceLabel", () => {
  it("never claims certainty — the best it says is that the photo was clear", () => {
    expect(confidenceLabel(100).text).toBe("Read clearly");
    expect(confidenceLabel(85).tone).toBe("good");
  });

  it("asks for a check in the band the backend flags for review", () => {
    // The backend's REVIEW_THRESHOLD is 70; 70..84 is readable but unverified.
    expect(confidenceLabel(84)).toEqual({ text: "Read, please check", tone: "warn" });
    expect(confidenceLabel(70)).toEqual({ text: "Read, please check", tone: "warn" });
  });

  it("warns below the review threshold", () => {
    expect(confidenceLabel(69).tone).toBe("bad");
    expect(confidenceLabel(0).tone).toBe("bad");
  });

  it("handles a job that never produced a score", () => {
    expect(confidenceLabel(null)).toEqual({ text: "Not read", tone: "bad" });
  });
});

describe("initialsFor", () => {
  it("uses the first two names", () => {
    expect(initialsFor("Ananya Rao", "a@example.com")).toBe("AR");
    expect(initialsFor("Deepa Lakshmi Nair", "d@example.com")).toBe("DL");
  });

  it("falls back to one initial for a single name", () => {
    expect(initialsFor("Rohan", "r@example.com")).toBe("R");
  });

  it("falls back to the email when there is no name", () => {
    expect(initialsFor(null, "deepa@example.com")).toBe("DE");
    expect(initialsFor("   ", "deepa@example.com")).toBe("DE");
  });
});
