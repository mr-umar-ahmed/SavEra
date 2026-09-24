import type { ConfidenceLevel, EstimateInput, MonthKey } from "./common";
import type { HomeType } from "./household";

/** Peer-comparison inputs shared by every stream (MASTER_PROMPT §8.10). */
export interface GreenScoreStreamBase {
  /** Peer consumption per person for the same ward and size band, already normalised. */
  peers: number[];
  /** Personal baseline midpoint (same unit as the stream value). */
  baselineMid: number;
  /** Of the last N months, how many were at or below baseline high. */
  last6AtOrBelow: number;
  /** N (≤6) months available for the consistency term. */
  last6Count: number;
}

export interface GreenScoreElectricityInput extends GreenScoreStreamBase {
  kwh: number;
}

export interface GreenScoreWaterInput extends GreenScoreStreamBase {
  litres: number;
}

export interface GreenScoreLpgInput extends GreenScoreStreamBase {
  kg: number;
}

export interface GreenScoreInput {
  householdId: string;
  people: number;
  homeType: HomeType;
  streams: {
    electricity?: GreenScoreElectricityInput;
    water?: GreenScoreWaterInput;
    lpg?: GreenScoreLpgInput;
  };
}

export interface GreenScoreWeights {
  efficiency: number;
  improvement: number;
  consistency: number;
}

/** Normalised Green Score 0–100 with its components. */
export interface GreenScoreResult {
  householdId: string;
  month: MonthKey;
  total: number;
  /** Per-stream efficiency 0–100 (median peer = 60). */
  efficiency: { electricity?: number; water?: number; lpg?: number };
  improvement: number;
  consistency: number;
  /** Effective weights after renormalising for untracked streams. */
  weights: GreenScoreWeights;
  /** Plain-language lines explaining the normalisation. */
  explanation: string[];
  confidence: ConfidenceLevel;
  inputs: EstimateInput[];
}

/** Seeded leaderboard participant (ward-scoped). */
export interface LeaderboardSeedEntry {
  householdId: string;
  wardId: string;
  score: number;
  prevScore: number;
  displayName?: string;
  /** Opt-in: show `displayName` instead of "Green Home #n". */
  publicName: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  householdId: string;
  /** "Green Home #n" unless the participant opted in. */
  displayName: string;
  score: number;
  isYou: boolean;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  you: { rank: number; prevRank: number; score: number; delta: number };
  participants: number;
  wardId: string;
}

/** One point of the citizen's rank/score history (Progress screen). */
export interface GreenScoreHistoryPoint {
  householdId: string;
  month: MonthKey;
  score: number;
  rank: number;
}
