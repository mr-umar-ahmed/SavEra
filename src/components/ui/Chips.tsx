"use client";

import React from "react";
import { EstimatedChip as BaseEstimatedChip } from "@/components/savera/EstimatedChip";

export function SimulationPrototypeBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border border-teal-ink/30 bg-teal-ink/10 text-teal-ink shadow-sm">
      <span className="size-2 rounded-full bg-teal-ink animate-pulse" />
      <span>Simulation Prototype</span>
    </div>
  );
}

type BaseEstimatedChipProps = React.ComponentProps<typeof BaseEstimatedChip>;

export function EstimatedChip({
  confidence = "high",
  ...props
}: Omit<BaseEstimatedChipProps, "confidence"> & {
  confidence?: "high" | "medium" | "low" | string;
}) {
  const normalizedConfidence =
    confidence === "high" ? "High" : confidence === "low" ? "Low" : "Medium";
  return <BaseEstimatedChip confidence={normalizedConfidence} {...props} />;
}
