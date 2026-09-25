"use client";

import * as React from "react";
import { Check, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ChoiceOption<V extends string = string> {
  value: V;
  label: string;
  description?: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

interface ChoiceGridBase<V extends string> {
  options: ReadonlyArray<ChoiceOption<V>>;
  /** Number of columns at `sm` and up (always 1 column below `sm` unless `columns` is 2). */
  columns?: 1 | 2 | 3 | 4;
  /** Accessible group name. */
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export type ChoiceGridProps<V extends string = string> = ChoiceGridBase<V> &
  (
    | {
        multiple?: false;
        value: V | null | undefined;
        onChange: (value: V) => void;
      }
    | {
        multiple: true;
        value: ReadonlyArray<V>;
        onChange: (value: V[]) => void;
      }
  );

const COLUMNS = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
} as const;

/**
 * Selectable option cards (single or multi). Keyboard: Tab into the group,
 * arrow keys move between options, Space / Enter select.
 */
export function ChoiceGrid<V extends string = string>(props: ChoiceGridProps<V>) {
  const { options, columns = 2, label, disabled = false, size = "md", className } = props;
  const multiple = props.multiple === true;
  const listRef = React.useRef<HTMLDivElement>(null);

  const isSelected = (v: V): boolean =>
    multiple
      ? (props.value as ReadonlyArray<V>).includes(v)
      : (props.value as V | null | undefined) === v;

  const toggle = (v: V) => {
    if (props.multiple === true) {
      const current = props.value;
      const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
      props.onChange(next);
    } else {
      props.onChange(v);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
    );
    if (buttons.length === 0) return;
    const pos = buttons.findIndex((b) => b === e.currentTarget);
    const start = pos === -1 ? index : pos;
    let nextIndex = start;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIndex = (start + 1) % buttons.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      nextIndex = (start - 1 + buttons.length) % buttons.length;
    if (e.key === "Home") nextIndex = 0;
    if (e.key === "End") nextIndex = buttons.length - 1;
    buttons[nextIndex]?.focus();
  };

  // Roving tabindex: for single-select, only the selected (or first) option is tabbable.
  const firstEnabled = options.findIndex((o) => !o.disabled);
  const tabbableIndex = multiple
    ? -1
    : Math.max(
        options.findIndex((o) => !o.disabled && isSelected(o.value)),
        firstEnabled,
      );

  return (
    <div
      ref={listRef}
      data-slot="choice-grid"
      role={multiple ? "group" : "radiogroup"}
      aria-label={label}
      className={cn("grid gap-2.5", COLUMNS[columns], className)}
    >
      {options.map((opt, i) => {
        const selected = isSelected(opt.value);
        const Icon = opt.icon;
        const isDisabled = disabled || opt.disabled;
        return (
          <button
            key={opt.value}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={selected}
            disabled={isDisabled}
            tabIndex={multiple ? 0 : i === tabbableIndex ? 0 : -1}
            onClick={() => toggle(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "group focus-visible:ring-ring/60 relative flex cursor-pointer items-start gap-3 rounded-2xl border text-left transition-all outline-none focus-visible:ring-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
              size === "sm" ? "p-3" : "p-4",
              selected
                ? "border-positive/60 bg-positive/10 shadow-md"
                : "border-border bg-card/60 hover:border-foreground/25 hover:bg-secondary",
            )}
          >
            {Icon ? (
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex shrink-0 items-center justify-center rounded-xl border transition-colors",
                  size === "sm" ? "size-8" : "size-9",
                  selected
                    ? "border-positive/40 bg-positive/15 text-positive"
                    : "border-border bg-muted text-muted-foreground group-hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block leading-tight font-semibold",
                  size === "sm" ? "text-sm" : "text-sm sm:text-base",
                  selected ? "text-foreground" : "text-foreground/90",
                )}
              >
                {opt.label}
              </span>
              {opt.description ? (
                <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                  {opt.description}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center border transition-colors",
                multiple ? "rounded-md" : "rounded-full",
                selected
                  ? "border-positive bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-transparent",
              )}
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
