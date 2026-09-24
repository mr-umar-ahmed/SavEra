"use client";

import * as React from "react";

import type { GradientSpec } from "./chartTheme";

export interface ChartDefsProps {
  gradients: ReadonlyArray<GradientSpec>;
}

/** Renders `<linearGradient>` definitions produced by `gradientDefs()`. */
export function ChartDefs({ gradients }: ChartDefsProps) {
  return (
    <defs>
      {gradients.map((g) => (
        <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
          {g.stops.map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
          ))}
        </linearGradient>
      ))}
    </defs>
  );
}
