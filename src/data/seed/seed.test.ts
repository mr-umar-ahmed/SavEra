import { describe, expect, it } from "vitest";
import { buildSeed, SEED_VERSION } from "./index";
import { buildLeaderboard } from "@/lib/engine/greenScore";
import { analyzeLpg } from "@/lib/engine/lpg";

describe("Seed Generator", () => {
  const now = "2026-09-25";
  const seed = buildSeed(now);

  it("produces a valid SEED_VERSION and all collections populated", () => {
    expect(SEED_VERSION).toBe("1.1.0");
    expect(seed.users.length).toBe(6);
    expect(seed.zones.length).toBe(3);
    expect(seed.wards.length).toBe(8);
    expect(seed.areas.length).toBeGreaterThanOrEqual(24);
    expect(seed.households.length).toBeGreaterThanOrEqual(60);
    expect(seed.appliances.length).toBeGreaterThanOrEqual(100);
    expect(seed.bills.length).toBeGreaterThanOrEqual(200);
    expect(seed.waterSchedules.length).toBeGreaterThanOrEqual(4);
    expect(seed.waterCases.length).toBeGreaterThanOrEqual(4);
    expect(seed.waterReports.length).toBeGreaterThanOrEqual(150);
    expect(seed.fieldAssistants.length).toBe(4);
    expect(seed.cylinders.length).toBeGreaterThanOrEqual(6);
    expect(seed.areaAggregates.length).toBeGreaterThanOrEqual(24 * 3);
    expect(seed.industrialUnits.length).toBe(8);
    expect(seed.ghgActivity.length).toBe(8);
    expect(seed.drEvents.length).toBe(3);
    expect(seed.officialAlerts.length).toBe(3);
    expect(seed.notifications.length).toBeGreaterThanOrEqual(6);
    expect(seed.leaderboard.length).toBe(700);
  });

  it("anchors fixed identities exactly as defined in ARCHITECTURE §7", () => {
    // Households
    const h1024 = seed.households.find((h) => h.id === "H-1024");
    expect(h1024).toBeDefined();
    expect(h1024?.name).toBe("Priya Sharma");
    expect(h1024?.areaId).toBe("area-xyz");
    expect(h1024?.wardId).toBe("ward-24");

    const h1088 = seed.households.find((h) => h.id === "H-1088");
    expect(h1088).toBeDefined();
    expect(h1088?.name).toBe("Anand Kulkarni");
    expect(h1088?.areaId).toBe("area-abc");

    // Water cases
    const caseXyz = seed.waterCases.find((c) => c.id === "case-xyz-001");
    expect(caseXyz).toBeDefined();
    expect(caseXyz?.state).toBe("under_review");
    expect(caseXyz?.reportCount).toBe(78);

    // DR Events
    const dr001 = seed.drEvents.find((d) => d.id === "dr-001");
    expect(dr001).toBeDefined();
    expect(dr001?.status).toBe("active");
  });

  it("calibrates H-1024 Green Score rank #84 (prev #127) among 700 Ward 24 participants", () => {
    const lbResult = buildLeaderboard(seed.leaderboard, { householdId: "H-1024", score: 86 });
    expect(lbResult.participants).toBe(700);
    expect(lbResult.you.rank).toBe(84);
    expect(lbResult.you.prevRank).toBe(127);
    expect(lbResult.you.delta).toBe(43);
  });

  it("calibrates LPG cycles: current cylinder started 18 days ago with typical ≈ 0.57 kg/day", () => {
    const h1024Cyls = seed.cylinders.filter((c) => c.householdId === "H-1024");
    const lpgAnalysis = analyzeLpg(h1024Cyls, now);
    expect(lpgAnalysis.current?.daysUsed).toBe(18);
    expect(lpgAnalysis.typicalKgPerDay).toBeGreaterThanOrEqual(0.55);
    expect(lpgAnalysis.typicalKgPerDay).toBeLessThanOrEqual(0.60);
    expect(lpgAnalysis.status).toBe("normal");
  });

  it("is fully deterministic for a given date", () => {
    const seed1 = buildSeed("2026-09-25");
    const seed2 = buildSeed("2026-09-25");
    expect(JSON.stringify(seed1)).toBe(JSON.stringify(seed2));
  });
});
