import * as React from "react";

import { cn } from "@/lib/utils";

export interface DefinitionItem {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Small muted line under the value. */
  hint?: React.ReactNode;
  /** Chip rendered next to the value (e.g. `EstimatedChip`, `LabelChip`). */
  chip?: React.ReactNode;
}

export interface CopyRowProps
  extends DefinitionItem, Omit<React.ComponentProps<"div">, "children"> {
  /** `row` puts label and value side by side; `stack` puts the label above. */
  layout?: "row" | "stack";
  dense?: boolean;
}

/** One label / value pair; rendered inside a `<dl>` by `DefinitionList`. */
export function CopyRow({
  label,
  value,
  hint,
  chip,
  layout = "row",
  dense = false,
  className,
  ...props
}: CopyRowProps) {
  return (
    <div
      data-slot="copy-row"
      className={cn(
        layout === "row" ? "flex items-start justify-between gap-4" : "flex flex-col gap-1",
        dense ? "py-1.5" : "py-2.5",
        className,
      )}
      {...props}
    >
      <dt className="text-muted-foreground shrink-0 text-xs font-semibold tracking-wide uppercase">
        {label}
      </dt>
      <dd className={cn("min-w-0", layout === "row" ? "text-right" : "text-left")}>
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            layout === "row" ? "justify-end" : "justify-start",
          )}
        >
          <span className="text-foreground text-sm font-semibold tabular-nums">{value}</span>
          {chip}
        </div>
        {hint ? <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p> : null}
      </dd>
    </div>
  );
}

export interface DefinitionListProps extends React.ComponentProps<"dl"> {
  items: ReadonlyArray<DefinitionItem>;
  columns?: 1 | 2 | 3;
  layout?: "row" | "stack";
  dense?: boolean;
  /** Hairline dividers between rows (single column only). */
  divided?: boolean;
}

/** Label / value rows for household details, tariff facts, case metadata. */
export function DefinitionList({
  items,
  columns = 1,
  layout = "row",
  dense = false,
  divided = true,
  className,
  ...props
}: DefinitionListProps) {
  return (
    <dl
      data-slot="definition-list"
      className={cn(
        columns === 1 && divided ? "divide-border divide-y" : "grid gap-x-6",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-3",
        className,
      )}
      {...props}
    >
      {items.map((item, i) => (
        <CopyRow key={i} {...item} layout={layout} dense={dense} />
      ))}
    </dl>
  );
}
