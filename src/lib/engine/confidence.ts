/**
 * Confidence rule (MASTER_PROMPT §8.3), thresholds from `CONFIDENCE`:
 *   High   = ≥ 6 bills AND ≥ 80 % appliance detail
 *   Medium = ≥ 2 bills OR ≥ 50 % detail
 *   Low    = otherwise (≤ 1 bill and < 50 % detail)
 *
 * "2–5 bills" in the prompt is read as "at least 2 bills but not qualifying for High": a
 * household with 12 bills and 30 % detail is Medium, not Low.
 */

import { CONFIDENCE } from "@/data/catalogue/thresholds";
import type { ConfidenceLevel, EstimateInput } from "@/types";

export interface ConfidenceInput {
  billCount: number;
  /** Appliance detail score 0..1 (`applianceDetailScore`). */
  detailScore: number;
}

export function computeConfidence({ billCount, detailScore }: ConfidenceInput): ConfidenceLevel {
  const bills = Math.max(0, Math.floor(billCount));
  const detail = Number.isFinite(detailScore) ? detailScore : 0;
  if (bills >= CONFIDENCE.highBills && detail >= CONFIDENCE.highDetail) return "High";
  if (bills >= CONFIDENCE.mediumBillsMin || detail >= CONFIDENCE.mediumDetail) return "Medium";
  return "Low";
}

/** Inputs listed in the confidence tooltip, e.g. "12 bills · 77 % appliance detail". */
export function confidenceInputs({ billCount, detailScore }: ConfidenceInput): EstimateInput[] {
  return [
    { label: "Bills", value: `${billCount} ${billCount === 1 ? "bill" : "bills"}` },
    { label: "Appliance detail", value: `${Math.round(detailScore * 100)} %` },
  ];
}

/** One-line reason, e.g. "Based on 12 bills and 77 % appliance detail". */
export function describeConfidence(i: ConfidenceInput): string {
  return `Based on ${i.billCount} ${i.billCount === 1 ? "bill" : "bills"} and ${Math.round(
    i.detailScore * 100,
  )} % appliance detail`;
}

/** What would raise the confidence level, as short actionable lines. */
export function whatWouldRaiseConfidence(i: ConfidenceInput): string[] {
  const level = computeConfidence(i);
  const lines: string[] = [];
  if (level === "High") return lines;
  if (i.billCount < CONFIDENCE.highBills) {
    lines.push(
      `Add ${CONFIDENCE.highBills - i.billCount} more ${
        CONFIDENCE.highBills - i.billCount === 1 ? "bill" : "bills"
      } (${CONFIDENCE.highBills}+ unlock seasonal baselines)`,
    );
  }
  if (i.detailScore < CONFIDENCE.highDetail) {
    lines.push(
      `Complete appliance details to ${Math.round(CONFIDENCE.highDetail * 100)} % (now ${Math.round(
        i.detailScore * 100,
      )} %)`,
    );
  }
  return lines;
}
