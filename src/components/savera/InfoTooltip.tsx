"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface InfoTooltipProps {
  content: React.ReactNode;
  /** Custom trigger; defaults to a small info icon button. */
  children?: React.ReactNode;
  /** Accessible name for the default icon button. */
  label?: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/** Small "i" button that reveals explanatory text on hover / focus. */
export function InfoTooltip({
  content,
  children,
  label = "More information",
  side = "top",
  className,
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children ?? (
          <button
            type="button"
            aria-label={label}
            className={cn(
              "text-muted-foreground hover:text-foreground focus-visible:ring-ring/60 inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2",
              className,
            )}
          >
            <Info aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
