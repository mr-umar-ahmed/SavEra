"use client";

import * as React from "react";
import Link from "next/link";
import { Inbox, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
}

export interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary next action (pill button; renders a link when `href` is set). */
  action?: EmptyStateAction;
  /** Optional secondary ghost action. */
  secondaryAction?: EmptyStateAction;
  /** Chips shown under the actions (e.g. `LabelChip kind="simulated"`). */
  chips?: React.ReactNode;
  size?: "sm" | "md";
}

function ActionButton({
  action,
  variant,
}: {
  action: EmptyStateAction;
  variant: "default" | "ghost";
}) {
  const Icon = action.icon;
  const content = (
    <>
      {Icon ? <Icon aria-hidden="true" /> : null}
      {action.label}
    </>
  );
  if (action.href) {
    return (
      <Button asChild variant={variant} size="sm">
        <Link href={action.href} onClick={action.onClick}>
          {content}
        </Link>
      </Button>
    );
  }
  return (
    <Button type="button" variant={variant} size="sm" onClick={action.onClick}>
      {content}
    </Button>
  );
}

/** Empty state with an icon, title, description and a concrete next action. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  chips,
  size = "md",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "border-border flex flex-col items-center justify-center rounded-2xl border border-dashed text-center",
        size === "sm" ? "gap-2 px-4 py-6" : "gap-3 px-6 py-10",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "bg-primary/10 text-primary border-primary/20 inline-flex items-center justify-center rounded-2xl border",
          size === "sm" ? "size-10" : "size-12",
        )}
      >
        <Icon className={size === "sm" ? "size-4" : "size-5"} />
      </span>
      <div className="max-w-sm">
        <p
          className={cn(
            "font-display text-foreground font-bold tracking-tight",
            size === "sm" ? "text-sm" : "text-base",
          )}
        >
          {title}
        </p>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action || secondaryAction ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action ? <ActionButton action={action} variant="default" /> : null}
          {secondaryAction ? <ActionButton action={secondaryAction} variant="ghost" /> : null}
        </div>
      ) : null}
      {chips ? (
        <div className="flex flex-wrap items-center justify-center gap-2">{chips}</div>
      ) : null}
    </div>
  );
}
