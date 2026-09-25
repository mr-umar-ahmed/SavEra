"use client";

import * as React from "react";
import { FileText } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { confidenceTone, type ConfidenceLevel, type EstimateInput } from "@/types/common";

import { TONE_CLASSES } from "./tone";

export interface EstimatedChipProps {
  /** Confidence of the estimate. Omit to render a plain `Estimated` chip. */
  confidence?: ConfidenceLevel;
  /** Inputs that fed the estimate; strings or `{ label, value }` pairs. Shown in the tooltip. */
  inputs?: ReadonlyArray<string | EstimateInput>;
  /** Optional one-line explanation shown above the input list. */
  note?: string;
  size?: "sm" | "md";
  className?: string;
}

function normalise(input: string | EstimateInput): EstimateInput {
  return typeof input === "string" ? { label: input } : input;
}

/**
 * Mandatory label for every derived number (MASTER_PROMPT §2.1):
 * `Estimated · Medium confidence` with a tooltip listing the inputs used.
 * Outline: emerald for High, amber for Medium, grey for Low.
 */
export function EstimatedChip({
  confidence,
  inputs = [],
  note,
  size = "md",
  className,
}: EstimatedChipProps) {
  const tone = confidence ? confidenceTone(confidence) : "unknown";
  const t = TONE_CLASSES[tone];
  const rows = inputs.map(normalise);
  const label = confidence ? `Estimated · ${confidence} confidence` : "Estimated";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-slot="estimated-chip"
          role="status"
          tabIndex={0}
          aria-label={`${label}. ${rows.length > 0 ? `Based on ${rows.length} inputs.` : ""}`.trim()}
          className={cn(
            "inline-flex w-fit max-w-full min-w-0 cursor-help items-center gap-1.5 border font-semibold outline-none focus-visible:ring-2",
            size === "sm"
              ? "rounded-xl px-2 py-0.5 text-2xs leading-tight"
              : "rounded-full px-2.5 py-1 text-xs whitespace-nowrap",
            t.text,
            t.bgSoft,
            t.border,
            t.ring,
            className,
          )}
        >
          <FileText aria-hidden="true" className={size === "sm" ? "size-3 shrink-0" : "size-3.5 shrink-0"} />
          <span>
            Estimated
            {confidence ? (
              <>
                <span className="opacity-60"> · </span>
                {confidence} confidence
              </>
            ) : null}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-xs">
        <p className="font-semibold">Estimated value</p>
        <p className="text-muted-foreground mt-0.5">
          {note ??
            (confidence
              ? `${confidence} confidence — computed from the inputs below, not measured.`
              : "Computed from the inputs below, not measured.")}
        </p>
        {rows.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {rows.map((row, i) => (
              <li key={`${row.label}-${i}`} className="flex items-baseline gap-2">
                <span className="text-muted-foreground shrink-0">•</span>
                <span>
                  <span className="text-foreground">{row.label}</span>
                  {row.value ? <span className="text-muted-foreground"> — {row.value}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground mt-2">
            Based on the household details and bills available so far.
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
