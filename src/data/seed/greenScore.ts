import type { CarbonInputs, GreenScoreHistoryPoint, LeaderboardSeedEntry } from "@/types";
import { monthKeyAtOffset } from "../fixtures/shared";
import { H1024_ID } from "../fixtures/h1024";
import { H1088_ID } from "../fixtures/h1088";

export function seedGreenScore(now: string): {
  leaderboard: LeaderboardSeedEntry[];
  greenScoreHistory: GreenScoreHistoryPoint[];
  carbonInputs: CarbonInputs[];
} {
  const leaderboard: LeaderboardSeedEntry[] = [];

  // Seed 699 participants in Ward 24
  for (let i = 0; i < 699; i++) {
    // Exactly 83 score > 86 (i = 0..82)
    // Exactly 126 have prevScore > 80 (i = 0..125)
    const isTop = i === 0;
    const score = isTop ? 98 : i < 83 ? 87 + (i % 10) : 42 + (i % 44); // 87–96 above, 42–85 below
    const prevScore = isTop ? 97 : i < 126 ? 81 + (i % 15) : 32 + (i % 48); // 81–95 above, 32–79 below

    leaderboard.push({
      householdId: `H-2${String(i).padStart(3, "0")}`,
      wardId: "ward-24",
      score,
      prevScore,
      publicName: isTop,
      displayName: isTop ? "Ravi K." : undefined,
    });
  }

  // Add H-1024 as participant #700
  leaderboard.push({
    householdId: H1024_ID,
    wardId: "ward-24",
    score: 86,
    prevScore: 80,
    publicName: false,
    displayName: "Priya S.",
  });

  // 6 months progress history for H-1024: ranks 145 -> 84 (+61 positions overall, +43 in latest month)
  const historyMilestones = [
    { offset: -5, score: 71, rank: 145 },
    { offset: -4, score: 74, rank: 138 },
    { offset: -3, score: 76, rank: 134 },
    { offset: -2, score: 79, rank: 129 },
    { offset: -1, score: 80, rank: 127 },
    { offset: 0, score: 86, rank: 84 },
  ];

  const greenScoreHistory: GreenScoreHistoryPoint[] = historyMilestones.map((m) => ({
    householdId: H1024_ID,
    month: monthKeyAtOffset(now, m.offset),
    score: m.score,
    rank: m.rank,
  }));

  const carbonInputs: CarbonInputs[] = [
    {
      householdId: H1024_ID,
      commuteMode: "two_wheeler",
      kmPerWeek: 60,
      diet: "vegetarian",
      flightsPerYear: 1,
      shopping: "medium",
      updatedAt: `${now}T10:00:00.000Z`,
    },
    {
      householdId: H1088_ID,
      commuteMode: "bus",
      kmPerWeek: 45,
      diet: "non_veg_occasional",
      flightsPerYear: 0,
      shopping: "low",
      updatedAt: `${now}T11:00:00.000Z`,
    },
  ];

  return { leaderboard, greenScoreHistory, carbonInputs };
}
