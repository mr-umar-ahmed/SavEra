/**
 * Green Score (MASTER_PROMPT §8.10) and the ward leaderboard.
 *
 * Pure: no clock, no randomness, no store access. Every number is an estimate and the UI
 * labels it as such. The score is *normalised* — consumption per person compared with ward
 * peers of the same size band — so the absolute lowest consumer does not automatically win.
 *
 * Efficiency (per tracked stream): `p` = share of peers with LOWER per-person consumption
 * (ties count half, i.e. the mid-rank percentile), mapped piecewise-linearly through
 *   p = 0 → 100 · p = 0.10 → 95 · p = 0.50 → 60 · p = 0.90 → 25 · p = 1 → 5
 * and clamped to 5–100. The median peer scores 60; a home using less than 90 % of its peers
 * scores 95.
 * Improvement: % change vs the personal baseline midpoint, −20 % → 100 … +20 % → 20
 * (linear, clamped 0–100). Consistency: share of the last ≤ 6 months at or below baseline
 * high × 100. Weights 50 / 30 / 20 — efficiency split evenly across tracked streams — and
 * renormalised when a component cannot be scored yet.
 */

import type {
  ConfidenceLevel,
  EstimateInput,
  GreenScoreInput,
  GreenScoreResult,
  GreenScoreStreamBase,
  GreenScoreWeights,
  LeaderboardEntry,
  LeaderboardResult,
  LeaderboardSeedEntry,
  MonthKey,
  Stream,
} from "@/types";
import { HOME_TYPE_LABEL, STREAM_LABEL } from "@/types";

/** Base weights before renormalisation (§8.10). */
export const GREEN_SCORE_WEIGHTS: GreenScoreWeights = {
  efficiency: 0.5,
  improvement: 0.3,
  consistency: 0.2,
};

/** Anchor points: share of peers with lower per-person use → efficiency score. */
export const EFFICIENCY_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [0, 100],
  [0.1, 95],
  [0.5, 60],
  [0.9, 25],
  [1, 5],
];

export const EFFICIENCY_BOUNDS = { min: 5, max: 100 } as const;

/** Score assumed for a stream with no peer data yet (the median). */
export const MEDIAN_EFFICIENCY = 60;

/** Improvement mapping: −20 % vs baseline midpoint → 100, +20 % → 20 (linear, clamped 0–100). */
export const IMPROVEMENT_MAP = {
  bestDeltaPct: -20,
  bestScore: 100,
  worstDeltaPct: 20,
  worstScore: 20,
} as const;

export const LEADERBOARD_TOP_N = 10;

/** Minimum peers / months for the confidence bands. */
const CONFIDENCE_RULE = { peers: 10, highMonths: 6, mediumMonths: 2 } as const;

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

const round = (n: number, decimals = 0): number => {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
};

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((acc, x) => acc + x, 0) / xs.length;

const signedPct = (n: number): string => `${n >= 0 ? "+" : "-"}${Math.abs(round(n, 1)).toFixed(1)} %`;

/**
 * Share of peers with lower consumption than `value`, ties counted half (mid-rank
 * percentile). 0 = nobody uses less than you (best), 1 = everybody uses less (worst).
 * Returns 0.5 (the median) when there are no peers.
 */
export function percentileLower(value: number, peers: number[]): number {
  if (peers.length === 0) return 0.5;
  let lower = 0;
  let equal = 0;
  for (const p of peers) {
    if (p < value) lower += 1;
    else if (p === value) equal += 1;
  }
  return (lower + 0.5 * equal) / peers.length;
}

/** Piecewise-linear map through `EFFICIENCY_ANCHORS`, clamped to `EFFICIENCY_BOUNDS`. */
export function efficiencyFromPercentile(p: number): number {
  const x = clamp(p, 0, 1);
  for (let i = 1; i < EFFICIENCY_ANCHORS.length; i += 1) {
    const [x0, y0] = EFFICIENCY_ANCHORS[i - 1];
    const [x1, y1] = EFFICIENCY_ANCHORS[i];
    if (x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return clamp(y0 + t * (y1 - y0), EFFICIENCY_BOUNDS.min, EFFICIENCY_BOUNDS.max);
    }
  }
  return EFFICIENCY_BOUNDS.min;
}

/** Efficiency 0–100 of a per-person value among per-person peer values (lower is better). */
export function efficiencyScore(perPersonValue: number, peers: number[]): number {
  if (peers.length === 0) return MEDIAN_EFFICIENCY;
  return efficiencyFromPercentile(percentileLower(perPersonValue, peers));
}

/** Improvement 0–100 from the % change vs the personal baseline midpoint. */
export function improvementScore(deltaPct: number): number {
  const { bestDeltaPct, bestScore, worstDeltaPct, worstScore } = IMPROVEMENT_MAP;
  const t = (deltaPct - bestDeltaPct) / (worstDeltaPct - bestDeltaPct);
  return clamp(bestScore + t * (worstScore - bestScore), 0, 100);
}

/** Consistency 0–100: share of recent months at or below baseline high. */
export function consistencyScore(atOrBelow: number, count: number): number {
  if (count <= 0) return 0;
  return clamp(atOrBelow / count, 0, 1) * 100;
}

interface TrackedStream {
  stream: Stream;
  value: number;
  unit: string;
  base: GreenScoreStreamBase;
}

function trackedStreams(i: GreenScoreInput): TrackedStream[] {
  const out: TrackedStream[] = [];
  const { electricity, water, lpg } = i.streams;
  if (electricity) out.push({ stream: "electricity", value: electricity.kwh, unit: "kWh", base: electricity });
  if (water) out.push({ stream: "water", value: water.litres, unit: "L", base: water });
  if (lpg) out.push({ stream: "lpg", value: lpg.kg, unit: "kg", base: lpg });
  return out;
}

function confidenceOf(tracked: TrackedStream[]): ConfidenceLevel {
  if (tracked.length === 0) return "Low";
  const peersOk = tracked.every((t) => t.base.peers.length >= CONFIDENCE_RULE.peers);
  const monthsHigh = tracked.every((t) => t.base.last6Count >= CONFIDENCE_RULE.highMonths);
  const monthsMedium = tracked.some((t) => t.base.last6Count >= CONFIDENCE_RULE.mediumMonths);
  if (tracked.length >= 2 && peersOk && monthsHigh) return "High";
  if (peersOk && monthsMedium) return "Medium";
  return "Low";
}

/**
 * Compute the normalised Green Score. `month` is the month the score describes (the result
 * carries it for the history chart); the input contract has no month field, so it is an
 * optional second argument — pass `currentMonth(demoNow)`.
 */
export function computeGreenScore(i: GreenScoreInput, month: MonthKey = ""): GreenScoreResult {
  const people = Math.max(1, Math.round(i.people));
  const tracked = trackedStreams(i);
  const homeLabel = HOME_TYPE_LABEL[i.homeType];
  const inputs: EstimateInput[] = [
    { label: "People", value: String(people) },
    { label: "Home type", value: homeLabel },
  ];

  if (tracked.length === 0) {
    return {
      householdId: i.householdId,
      month,
      total: 0,
      efficiency: {},
      improvement: 0,
      consistency: 0,
      weights: { efficiency: 0, improvement: 0, consistency: 0 },
      explanation: [
        "No streams are tracked yet — add electricity, water or LPG details to receive a Green Score.",
      ],
      confidence: "Low",
      inputs,
    };
  }

  const explanation: string[] = [
    `Scores are normalised per person (${people} ${people === 1 ? "person" : "people"}, ${homeLabel}) and compared with ward peers in the same size band — the lowest consumer does not automatically win.`,
  ];
  const efficiency: GreenScoreResult["efficiency"] = {};
  const effValues: number[] = [];
  const impValues: number[] = [];
  const consValues: number[] = [];
  const deltaLines: string[] = [];
  let monthsAtOrBelow = 0;
  let monthsCounted = 0;

  for (const t of tracked) {
    const label = STREAM_LABEL[t.stream];
    const perPerson = t.value / people;
    const peers = t.base.peers;
    const p = percentileLower(perPerson, peers);
    const eff = efficiencyScore(perPerson, peers);
    efficiency[t.stream] = round(eff);
    effValues.push(eff);
    if (peers.length === 0) {
      explanation.push(
        `${label} efficiency ${MEDIAN_EFFICIENCY}/100 — no peer data yet, so the median score is assumed.`,
      );
    } else {
      explanation.push(
        `${label} efficiency ${round(eff)}/100 — you use less per person than ${round((1 - p) * 100)} % of ${peers.length} comparable homes in your ward (median peer = 60).`,
      );
    }

    if (t.base.baselineMid > 0) {
      const deltaPct = ((t.value - t.base.baselineMid) / t.base.baselineMid) * 100;
      impValues.push(improvementScore(deltaPct));
      deltaLines.push(`${label} ${signedPct(deltaPct)}`);
    }
    if (t.base.last6Count > 0) {
      const count = Math.max(0, Math.round(t.base.last6Count));
      const below = clamp(Math.round(t.base.last6AtOrBelow), 0, count);
      consValues.push(consistencyScore(below, count));
      monthsAtOrBelow += below;
      monthsCounted += count;
    }
    inputs.push({
      label,
      value: `${round(t.value, 1)} ${t.unit} · ${peers.length} peers · baseline mid ${round(t.base.baselineMid, 1)} ${t.unit} · ${t.base.last6Count} months`,
    });
  }

  const raw = {
    efficiency: effValues.length > 0 ? GREEN_SCORE_WEIGHTS.efficiency : 0,
    improvement: impValues.length > 0 ? GREEN_SCORE_WEIGHTS.improvement : 0,
    consistency: consValues.length > 0 ? GREEN_SCORE_WEIGHTS.consistency : 0,
  };
  const weightSum = raw.efficiency + raw.improvement + raw.consistency;
  const weights: GreenScoreWeights = {
    efficiency: round(raw.efficiency / weightSum, 4),
    improvement: round(raw.improvement / weightSum, 4),
    consistency: round(raw.consistency / weightSum, 4),
  };

  const effAvg = mean(effValues);
  const impAvg = impValues.length > 0 ? mean(impValues) : 0;
  const consAvg = consValues.length > 0 ? mean(consValues) : 0;
  const total = round(
    clamp(
      (raw.efficiency / weightSum) * effAvg +
        (raw.improvement / weightSum) * impAvg +
        (raw.consistency / weightSum) * consAvg,
      0,
      100,
    ),
  );

  if (impValues.length > 0) {
    explanation.push(
      `Improvement ${round(impAvg)}/100 — vs your personal baseline midpoint: ${deltaLines.join(", ")} (−20 % → 100, +20 % → 20).`,
    );
  } else {
    explanation.push("Improvement is not scored yet — no personal baseline is available; its weight is redistributed.");
  }
  if (consValues.length > 0) {
    explanation.push(
      `Consistency ${round(consAvg)}/100 — ${monthsAtOrBelow} of ${monthsCounted} recent stream-months were at or below your baseline high.`,
    );
  } else {
    explanation.push("Consistency is not scored yet — no monthly history is available; its weight is redistributed.");
  }
  explanation.push(
    `Weights: efficiency ${round(weights.efficiency * 100)} % (split evenly across ${tracked.length} tracked ${tracked.length === 1 ? "stream" : "streams"}), improvement ${round(weights.improvement * 100)} %, consistency ${round(weights.consistency * 100)} %.`,
  );

  return {
    householdId: i.householdId,
    month,
    total,
    efficiency,
    improvement: round(impAvg),
    consistency: round(consAvg),
    weights,
    explanation,
    confidence: confidenceOf(tracked),
    inputs,
  };
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardYou {
  householdId: string;
  /** The household's current score (overrides the seeded entry's score). */
  score: number;
  /** Ward to rank within; defaults to the seeded entry's ward. */
  wardId?: string;
}

const byScoreDesc =
  (key: "score" | "prevScore") =>
  (a: LeaderboardSeedEntry, b: LeaderboardSeedEntry): number =>
    b[key] - a[key] || a.householdId.localeCompare(b.householdId);

function displayNameOf(e: LeaderboardSeedEntry, rank: number): string {
  return e.publicName && e.displayName ? e.displayName : `Green Home #${rank}`;
}

/**
 * Rank participants within the household's ward by score (desc, ties by household id) and
 * return the top 10 plus the household's own row, with its previous rank (from `prevScore`)
 * and the rank movement (`delta` > 0 = improved).
 */
export function buildLeaderboard(
  entries: LeaderboardSeedEntry[],
  you: LeaderboardYou,
): LeaderboardResult {
  const seeded = entries.find((e) => e.householdId === you.householdId);
  const wardId = you.wardId ?? seeded?.wardId ?? entries[0]?.wardId ?? "";
  const ward: LeaderboardSeedEntry[] = entries
    .filter((e) => e.wardId === wardId)
    .map((e) => (e.householdId === you.householdId ? { ...e, score: you.score } : e));
  if (!seeded || seeded.wardId !== wardId) {
    ward.push({
      householdId: you.householdId,
      wardId,
      score: you.score,
      prevScore: you.score,
      publicName: false,
    });
  }

  const byScore = [...ward].sort(byScoreDesc("score"));
  const byPrev = [...ward].sort(byScoreDesc("prevScore"));
  const rank = byScore.findIndex((e) => e.householdId === you.householdId) + 1;
  const prevRank = byPrev.findIndex((e) => e.householdId === you.householdId) + 1;

  const toEntry = (e: LeaderboardSeedEntry, r: number): LeaderboardEntry => ({
    rank: r,
    householdId: e.householdId,
    displayName: displayNameOf(e, r),
    score: e.score,
    isYou: e.householdId === you.householdId,
  });

  const top = byScore.slice(0, LEADERBOARD_TOP_N).map((e, idx) => toEntry(e, idx + 1));
  if (rank > LEADERBOARD_TOP_N) top.push(toEntry(byScore[rank - 1], rank));

  return {
    entries: top,
    you: { rank, prevRank, score: you.score, delta: prevRank - rank },
    participants: ward.length,
    wardId,
  };
}
