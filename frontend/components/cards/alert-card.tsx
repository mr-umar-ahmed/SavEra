"use client";

import {
  CloudSun,
  Droplets,
  Flame,
  PartyPopper,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/api";
import { useApi } from "@/lib/api.client";
import { markAlertRead } from "@/lib/endpoints";
import { formatNumber } from "@/lib/format";
import type { Alert, AlertType, ResourceType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RESOURCE_ICON: Record<ResourceType | "general", LucideIcon> = {
  electricity: Zap,
  water: Droplets,
  lpg: Flame,
  general: Sparkles,
};

const RESOURCE_TONE: Record<ResourceType | "general", string> = {
  electricity: "bg-electricity-soft text-electricity-fg",
  water: "bg-water-soft text-water-fg",
  lpg: "bg-lpg-soft text-lpg-fg",
  general: "bg-primary-soft text-primary",
};

/** Milestones are good news and must not look like a warning. */
export function iconFor(alert: Alert): LucideIcon {
  return alert.alert_type === "milestone" ? PartyPopper : RESOURCE_ICON[alert.resource_type];
}

export function toneFor(alert: Alert): string {
  return alert.alert_type === "milestone"
    ? "bg-good-soft text-good-fg"
    : RESOURCE_TONE[alert.resource_type];
}

const SEVERITY_LABEL: Record<string, string> = {
  high: "Worth acting on",
  medium: "Worth a look",
};

/** "3:40 pm" — alerts within a day read better as a time than a date. */
function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export interface AlertCardProps {
  alert: Alert;
  /** Called after a successful mark-as-read, so a list can update its unread count. */
  onRead?: (id: string) => void;
}

/**
 * One alert: what changed, the likely cause, then what to try — in that order, and never
 * phrased as blame (the design constraint the spec sets out for anomaly alerts).
 *
 * Clicking or pressing Enter marks it read. An already-read alert stays fully readable;
 * only its unread dot and emphasis go away.
 */
export function AlertCard({ alert, onRead }: AlertCardProps) {
  const router = useRouter();
  const call = useApi();
  const [isRead, setIsRead] = useState(alert.is_read);
  const [busy, setBusy] = useState(false);

  const Icon = iconFor(alert);
  const context = alert.context ?? {};
  const tips = context.tips ?? [];

  async function markRead() {
    if (isRead || busy) return;
    setBusy(true);
    try {
      await call((ctx) => markAlertRead(alert.id, ctx));
      setIsRead(true);
      onRead?.(alert.id);
      router.refresh();
    } catch (err) {
      toast.error(describeError(err, "Could not mark that as read."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      role={isRead ? undefined : "button"}
      tabIndex={isRead ? undefined : 0}
      onClick={markRead}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void markRead();
        }
      }}
      aria-label={isRead ? undefined : `${alert.title}. Press to mark as read.`}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-colors",
        isRead ? "border-border bg-card/60" : "focus-ring cursor-pointer border-primary/30 bg-card shadow-card",
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", toneFor(alert))}>
          <Icon className="size-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn("font-display text-base", isRead ? "font-semibold" : "font-bold")}>
              {alert.title}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              <time className="text-xs text-muted-foreground" dateTime={alert.created_at}>
                {formatTime(alert.created_at)}
              </time>
              {busy ? <Spinner className="size-3" /> : null}
              {!isRead && !busy ? (
                <span className="size-2 rounded-full bg-primary" aria-label="Unread" />
              ) : null}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{alert.message}</p>

          {context.severity && SEVERITY_LABEL[context.severity] ? (
            <p className="text-xs font-semibold text-muted-foreground">
              {SEVERITY_LABEL[context.severity]}
            </p>
          ) : null}

          {context.weather_context ? (
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <CloudSun className="mt-0.5 size-4 shrink-0" aria-hidden />
              {context.weather_context}
            </p>
          ) : null}

          {context.baseline_mean != null && context.current != null ? (
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatNumber(context.current)} vs your usual {formatNumber(context.baseline_mean)}
            </p>
          ) : null}

          {tips.length > 0 ? (
            <div className="pt-1">
              <p className="text-xs font-semibold text-foreground">What to try:</p>
              <ul className="mt-1 space-y-1">
                {tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-sm text-muted-foreground">
                    <span aria-hidden>·</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
