import { describe, expect, it } from "vitest";
import type { GreenScoreInput, LeaderboardSeedEntry } from "@/types";
import {
  buildLeaderboard,
  computeGreenScore,
  consistencyScore,
  efficiencyFromPercentile,
  efficiencyScore,
  improvementScore,
  percentileLower,
} from "./greenScore";

describe("efficiency mapping", () => {
  it("maps the percentile anchors exactly (p10 → 95, p50 → 60, p90 → 25)", () => {
    expect(efficiencyFromPercentile(0)).toBe(100);
    expect(efficiencyFromPercentile(0.1)).toBe(95);
    expect(efficiencyFromPercentile(0.5)).toBe(60);
    expect(efficiencyFromPercentile(0.9)).toBe(25);
    expect(efficiencyFromPercentile(1)).toBe(5);
  });

  it("interpolates linearly between anchors and clamps outside 0–1", () => {
    expect(efficiencyFromPercentile(0.3)).toBeCloseTo(77.5, 6);
    expect(efficiencyFromPercentile(0.7)).toBeCloseTo(42.5, 6);
    expect(efficiencyFromPercentile(-1)).toBe(100);
    expect(efficiencyFromPercentile(2)).toBe(5);
  });

  it("computes the share of peers with lower consumption, ties counted half", () => {
    const peers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(percentileLower(5, peers)).toBeCloseTo(0.5, 6); // 4 lower + half of 1 tie
    expect(percentileLower(0.5, peers)).toBe(0);
    expect(percentileLower(10, peers)).toBe(1);
    expect(percentileLower(5, [])).toBe(0.5);
  });

  it("scores the median peer 60 and assumes the median without peers", () => {
    expect(efficiencyScore(5, [1, 2, 3, 4, 5, 6, 7, 8, 9])).toBeCloseTo(60, 6);
    expect(efficiencyScore(1, [1, 2, 3, 4, 5, 6, 7, 8, 9])).toBeCloseTo(97.2, 0);
    expect(efficiencyScore(42, [])).toBe(60);
  });

  it("does not let the absolute lowest consumer win automatically — it is a normalised percentile", () => {
    // A frugal home in a frugal ward can score lower than a heavier user in a heavy ward.
    const frugalWard = efficiencyScore(80, [50, 60, 70, 75, 78, 82, 85, 90, 95, 100]);
    const heavyWard = efficiencyScore(150, [200, 210, 220, 230, 240, 250, 260, 270, 280, 300]);
    expect(heavyWard).toBeGreaterThan(frugalWard);
  });
});

describe("improvement and consistency", () => {
  it("maps −20 % → 100, 0 → 60, +20 % → 20 and clamps", () => {
    expect(improvementScore(-20)).toBe(100);
    expect(improvementScore(0)).toBe(60);
    expect(improvementScore(20)).toBe(20);
    expect(improvementScore(-40)).toBe(100);
    expect(improvementScore(30)).toBe(0);
  });

  it("scores consistency as the share of months at or below baseline high", () => {
    expect(consistencyScore(5, 6)).toBeCloseTo(83.333, 2);
    expect(consistencyScore(6, 6)).toBe(100);
    expect(consistencyScore(0, 0)).toBe(0);
  });
});

function peersBelowShare(share: number, n: number, value: number): number[] {
  const below = Math.round(share * n);
  return Array.from({ length: n }, (_, idx) => (idx < below ? value * 0.8 : value * 1.2));
}

function fullInput(): GreenScoreInput {
  return {
    householdId: "H-1024",
    people: 4,
    homeType: "2BHK",
    streams: {
      // 390 kWh / 4 people = 97.5 per person; 20 % of peers use less → p = 0.2 → 86.25
      electricity: { kwh: 390, peers: peersBelowShare(0.2, 100, 97.5), baselineMid: 335, last6AtOrBelow: 5, last6Count: 6 },
      // 19,200 L / 4 = 4,800 per person; 10 % below → 95
      water: { litres: 19200, peers: peersBelowShare(0.1, 100, 4800), baselineMid: 20000, last6AtOrBelow: 6, last6Count: 6 },
      // 17.1 kg / 4 = 4.275; 30 % below → 77.5
      lpg: { kg: 17.1, peers: peersBelowShare(0.3, 100, 4.275), baselineMid: 17, last6AtOrBelow: 4, last6Count: 6 },
    },
  };
}

describe("computeGreenScore", () => {
  it("combines efficiency (50 %), improvement (30 %) and consistency (20 %) across three streams", () => {
    const r = computeGreenScore(fullInput(), "2026-09");
    expect(r.month).toBe("2026-09");
    expect(r.efficiency.electricity).toBe(86);
    expect(r.efficiency.water).toBe(95);
    expect(r.efficiency.lpg).toBe(78);
    // improvement: +16.4 % → 27.2, −4 % → 68, +0.6 % → 58.8 → mean ≈ 51.3
    expect(r.improvement).toBe(51);
    // consistency: 83.3, 100, 66.7 → 83.3
    expect(r.consistency).toBe(83);
    expect(r.weights).toEqual({ efficiency: 0.5, improvement: 0.3, consistency: 0.2 });
    // 0.5 × 86.25 + 0.3 × 51.3 + 0.2 × 83.3 ≈ 75
    expect(r.total).toBe(75);
    expect(r.confidence).toBe("High");
    expect(r.explanation.join(" ")).toMatch(/lowest consumer does not automatically win/);
    expect(r.explanation.join(" ")).toMatch(/median peer = 60/);
    expect(r.inputs.length).toBeGreaterThanOrEqual(5);
  });

  it("renormalises weights when a stream is not tracked and a component cannot be scored", () => {
    const r = computeGreenScore({
      householdId: "H-1",
      people: 2,
      homeType: "1BHK",
      streams: {
        electricity: { kwh: 200, peers: peersBelowShare(0.5, 20, 100), baselineMid: 0, last6AtOrBelow: 2, last6Count: 3 },
      },
    });
    expect(r.efficiency.water).toBeUndefined();
    expect(r.efficiency.lpg).toBeUndefined();
    expect(r.weights.improvement).toBe(0);
    expect(r.weights.efficiency + r.weights.consistency).toBeCloseTo(1, 6);
    expect(r.weights.efficiency).toBeCloseTo(0.5 / 0.7, 3);
    expect(r.improvement).toBe(0);
    expect(r.consistency).toBe(67);
    // 0.714 × 60 + 0.286 × 66.7 ≈ 62
    expect(r.total).toBe(62);
    expect(r.confidence).toBe("Medium");
    expect(r.explanation.some((line) => /Improvement is not scored yet/.test(line))).toBe(true);
  });

  it("returns a zero score with Low confidence when nothing is tracked", () => {
    const r = computeGreenScore({ householdId: "H-2", people: 3, homeType: "3BHK", streams: {} });
    expect(r.total).toBe(0);
    expect(r.confidence).toBe("Low");
    expect(r.weights).toEqual({ efficiency: 0, improvement: 0, consistency: 0 });
    expect(r.explanation[0]).toMatch(/No streams are tracked yet/);
  });

  it("is Low confidence with too few peers", () => {
    const r = computeGreenScore({
      householdId: "H-3",
      people: 1,
      homeType: "other",
      streams: { water: { litres: 100, peers: [90, 110], baselineMid: 100, last6AtOrBelow: 1, last6Count: 1 } },
    });
    expect(r.confidence).toBe("Low");
    expect(r.total).toBeGreaterThan(0);
  });
});

/** 700 Ward 24 participants: 83 score above 86 and 126 had a higher previous score than H-1024. */
function seededWard24(): LeaderboardSeedEntry[] {
  const list: LeaderboardSeedEntry[] = [];
  for (let i = 0; i < 699; i += 1) {
    const score = i === 0 ? 99 : i < 83 ? 87 + (i % 10) : 40 + (i % 46); // 87–99 above · 40–85 below
    const prevScore = i === 0 ? 99 : i < 126 ? 81 + (i % 15) : 30 + (i % 50); // 81–99 above · 30–79 below
    list.push({
      householdId: `H-2${String(i).padStart(3, "0")}`,
      wardId: "ward-24",
      score,
      prevScore,
      publicName: i === 0,
      displayName: i === 0 ? "Ravi K." : undefined,
    });
  }
  list.push({
    householdId: "H-1024",
    wardId: "ward-24",
    score: 86,
    prevScore: 80,
    displayName: "Priya S.",
    publicName: false,
  });
  // Another ward's participants must not affect the Ward 24 ranking.
  for (let i = 0; i < 25; i += 1) {
    list.push({ householdId: `H-3${String(i).padStart(3, "0")}`, wardId: "ward-18", score: 99, prevScore: 99, publicName: false });
  }
  return list;
}

describe("buildLeaderboard", () => {
  it("ranks H-1024 #84 this month (from #127) among 700 Ward 24 participants", () => {
    const r = buildLeaderboard(seededWard24(), { householdId: "H-1024", score: 86 });
    expect(r.wardId).toBe("ward-24");
    expect(r.participants).toBe(700);
    expect(r.you).toEqual({ rank: 84, prevRank: 127, score: 86, delta: 43 });
    expect(r.entries).toHaveLength(11);
    expect(r.entries.slice(0, 10).map((e) => e.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(r.entries[0].score).toBeGreaterThanOrEqual(r.entries[9].score);
    const you = r.entries[10];
    expect(you.isYou).toBe(true);
    expect(you.rank).toBe(84);
    expect(you.householdId).toBe("H-1024");
    expect(you.displayName).toBe("Green Home #84");
    expect(r.entries.filter((e) => e.isYou)).toHaveLength(1);
  });

  it("shows an opted-in display name and hides everyone else behind Green Home #n", () => {
    const r = buildLeaderboard(seededWard24(), { householdId: "H-1024", score: 86 });
    const optedIn = r.entries.find((e) => e.householdId === "H-2000");
    expect(optedIn?.displayName).toBe("Ravi K.");
    for (const e of r.entries) {
      if (e.householdId !== "H-2000") expect(e.displayName).toBe(`Green Home #${e.rank}`);
    }
  });

  it("breaks ties by household id and includes the household in the top 10 only once", () => {
    const entries: LeaderboardSeedEntry[] = [
      { householdId: "H-B", wardId: "w", score: 90, prevScore: 90, publicName: false },
      { householdId: "H-A", wardId: "w", score: 90, prevScore: 50, publicName: false },
      { householdId: "H-C", wardId: "w", score: 70, prevScore: 95, publicName: false },
    ];
    const r = buildLeaderboard(entries, { householdId: "H-A", score: 90 });
    expect(r.entries.map((e) => e.householdId)).toEqual(["H-A", "H-B", "H-C"]);
    expect(r.you).toEqual({ rank: 1, prevRank: 3, score: 90, delta: 2 });
    expect(r.participants).toBe(3);
  });

  it("uses the supplied current score over the seeded one and handles an unseeded household", () => {
    const entries: LeaderboardSeedEntry[] = [
      { householdId: "H-X", wardId: "w", score: 80, prevScore: 80, publicName: false },
      { householdId: "H-Y", wardId: "w", score: 60, prevScore: 60, publicName: false },
    ];
    const seededLow = buildLeaderboard(entries, { householdId: "H-Y", score: 95 });
    expect(seededLow.you.rank).toBe(1);
    expect(seededLow.you.prevRank).toBe(2);
    const newcomer = buildLeaderboard(entries, { householdId: "H-Z", score: 70, wardId: "w" });
    expect(newcomer.participants).toBe(3);
    expect(newcomer.you).toEqual({ rank: 2, prevRank: 2, score: 70, delta: 0 });
  });
});
