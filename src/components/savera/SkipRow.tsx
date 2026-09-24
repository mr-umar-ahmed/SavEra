"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SkipRowProps extends React.ComponentProps<"div"> {
  /** "Don't know" — hidden when omitted. */
  onDontKnow?: () => void;
  /** "Skip for now". */
  onSkip?: () => void;
  /** "Set up later". */
  onLater?: () => void;
  disabled?: boolean;
  align?: "left" | "center" | "right";
  label?: string;
}

/**
 * Never-block-the-user row (MASTER_PROMPT §2.3):
 * `Don't know · Skip for now · Set up later` as ghost buttons.
 */
export function SkipRow({
  onDontKnow,
  onSkip,
  onLater,
  disabled = false,
  align = "left",
  label,
  className,
  ...props
}: SkipRowProps) {
  const items: { label: string; onClick: () => void }[] = [];
  if (onDontKnow) items.push({ label: "Don't know", onClick: onDontKnow });
  if (onSkip) items.push({ label: "Skip for now", onClick: onSkip });
  if (onLater) items.push({ label: "Set up later", onClick: onLater });

  return (
    <div
      data-slot="skip-row"
      className={cn(
        "flex flex-wrap items-center gap-1",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        className,
      )}
      {...props}
    >
      {label && <span className="text-xs text-muted-foreground mr-2">{label}</span>}
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 || label ? (
            <span aria-hidden="true" className="text-muted-foreground/60 select-none">
              ·
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={item.onClick}
          >
            {item.label}
          </Button>
        </React.Fragment>
      ))}
    </div>
  );
}
