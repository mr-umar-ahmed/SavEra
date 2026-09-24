import * as React from "react";
import { Check } from "lucide-react";

import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { IsoDateTime, TimelineStep } from "@/types/common";

export interface FlexibleTimelineStep {
  key?: string;
  label?: string;
  title?: string;
  state?: "done" | "active" | "pending";
  status?: "completed" | "current" | "upcoming" | string;
  at?: IsoDateTime;
  timestamp?: string;
  note?: string;
  description?: string;
}

export interface StatusTimelineProps extends Omit<React.ComponentProps<"ol">, "children"> {
  steps: (TimelineStep | FlexibleTimelineStep)[];
  /** Tighter spacing for drawers and cards. */
  compact?: boolean;
}

const STATE_LABEL: Record<"done" | "active" | "pending", string> = {
  done: "Completed",
  active: "In progress",
  pending: "Pending",
};

/**
 * Vertical step timeline: done = emerald check, active = pulsing amber,
 * pending = grey. Shows the timestamp and note for each step.
 */
export function StatusTimeline({
  steps,
  compact = false,
  className,
  ...props
}: StatusTimelineProps) {
  return (
    <ol data-slot="status-timeline" className={cn("relative flex flex-col", className)} {...props}>
      {steps.map((rawStep, i) => {
        const last = i === steps.length - 1;
        const flex = rawStep as FlexibleTimelineStep;
        const key = rawStep.key ?? flex.title ?? `step-${i}`;
        const label = flex.title ?? rawStep.label ?? "";

        let state: "done" | "active" | "pending" = "pending";
        const rawState = flex.status ?? rawStep.state;
        if (rawState === "done" || rawState === "completed") {
          state = "done";
        } else if (rawState === "active" || rawState === "current") {
          state = "active";
        } else {
          state = "pending";
        }

        const note = flex.description ?? rawStep.note;
        const timeStr = flex.timestamp;

        return (
          <li
            key={key}
            data-state={state}
            className={cn("relative flex gap-3", last ? "pb-0" : compact ? "pb-4" : "pb-6")}
          >
            {!last ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-6 bottom-0 left-[11px] w-px",
                  state === "done" ? "bg-emerald-500/50" : "bg-border",
                )}
              />
            ) : null}

            <span
              aria-hidden="true"
              className={cn(
                "relative mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
                state === "done" && "border-emerald-500 bg-emerald-500 text-black",
                state === "active" && "border-amber-500/60 bg-amber-500/15 text-amber-500",
                state === "pending" && "border-border bg-muted text-muted-foreground",
              )}
            >
              {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : null}
              {state === "active" ? (
                <>
                  <span className="absolute inline-flex size-2.5 animate-ping rounded-full bg-amber-500 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                </>
              ) : null}
              {state === "pending" ? (
                <span className="bg-muted-foreground/40 inline-flex size-1.5 rounded-full" />
              ) : null}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    state === "pending" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {label}
                  <span className="sr-only"> — {STATE_LABEL[state]}</span>
                </p>
                {timeStr ? (
                  <span className="text-muted-foreground text-xs tabular-nums">{timeStr}</span>
                ) : rawStep.at ? (
                  <time dateTime={rawStep.at} className="text-muted-foreground text-xs tabular-nums">
                    {formatDateTime(rawStep.at)}
                  </time>
                ) : null}
              </div>
              {note ? (
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{note}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
