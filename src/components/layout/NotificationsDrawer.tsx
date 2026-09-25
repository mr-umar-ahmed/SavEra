"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink, ShieldAlert, Sparkles } from "lucide-react";
import { useUiStore } from "@/stores/ui";
import { useSessionStore } from "@/stores/session";
import { useNotifications } from "@/lib/api/hooks";
import { relativeTime } from "@/lib/dates";
import { StreamIcon } from "@/components/savera/StreamIcon";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function NotificationsDrawer() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const demoNow = useSessionStore((s) => s.demoNow);
  const isOpen = useUiStore((s) => s.notificationsOpen);
  const setOpen = useUiStore((s) => s.setNotificationsOpen);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "official">("all");

  const filtered = notifications.filter((n) => {
    const isUnread = user ? !n.readBy.includes(user.id) : false;
    if (activeFilter === "unread") return isUnread;
    if (activeFilter === "official") return n.official || n.type === "official_alert";
    return true;
  });

  const fullNotificationsPath = user ? `/${user.role}/notifications` : "/citizen/notifications";

  const handleItemClick = (n: (typeof notifications)[0]) => {
    markRead(n.id);
    if (n.href) {
      setOpen(false);
      router.push(n.href);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-card border-l border-border backdrop-blur-2xl p-0 flex flex-col text-foreground z-50"
      >
        <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base font-semibold text-foreground">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <span className="rounded-full bg-positive/20 text-positive border border-positive/30 px-2 py-0.5 text-xs font-mono font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5">
              Live updates, system alerts & intelligence briefings
            </SheetDescription>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-xs h-7 text-positive hover:text-positive hover:bg-positive/10 gap-1 px-2"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark read
            </Button>
          )}
        </SheetHeader>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/60 bg-inset">
          <button
            onClick={() => setActiveFilter("all")}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
              activeFilter === "all"
                ? "bg-secondary text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter("unread")}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
              activeFilter === "unread"
                ? "bg-positive/20 text-positive border border-positive/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setActiveFilter("official")}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
              activeFilter === "official"
                ? "bg-amber-500/20 text-amber-ink border border-amber-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Official Alerts
          </button>
        </div>

        {/* Notification items */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-40 text-positive" />
              <p className="text-sm font-medium text-soft">No notifications to display</p>
              <p className="text-xs text-muted-foreground mt-1">You are all caught up with recent updates</p>
            </div>
          ) : (
            filtered.map((n) => {
              const isUnread = user ? !n.readBy.includes(user.id) : false;
              return (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-4 transition-colors cursor-pointer relative group flex gap-3 ${
                    isUnread ? "bg-positive/[0.04] hover:bg-positive/[0.08]" : "hover:bg-muted"
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    {n.official ? (
                      <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-ink">
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                    ) : n.stream ? (
                      <div className="h-7 w-7 rounded-lg bg-muted border border-border flex items-center justify-center">
                        <StreamIcon stream={n.stream} className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-lg bg-positive/10 border border-positive/20 flex items-center justify-center text-positive">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-semibold ${isUnread ? "text-foreground" : "text-soft"}`}>
                          {n.title}
                        </span>
                        {n.official && (
                          <StatusBadge tone="warning" label="Official" className="text-2xs py-0 px-1.5 h-4" />
                        )}
                        {n.simulated && (
                          <StatusBadge tone="info" label="Simulation" className="text-2xs py-0 px-1.5 h-4" />
                        )}
                      </div>
                      <span className="text-2xs text-faint shrink-0 font-mono">
                        {relativeTime(n.createdAt, demoNow)}
                      </span>
                    </div>

                    <p className="text-xs text-soft leading-relaxed line-clamp-2">{n.body}</p>

                    {n.href && (
                      <div className="mt-2 flex items-center gap-1 text-xs font-medium text-positive group-hover:text-positive">
                        <span>View details</span>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  {isUnread && (
                    <div className="absolute right-2 top-4 h-2 w-2 rounded-full bg-positive ring-4 ring-positive/20" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-inset">
          <Button
            variant="outline"
            className="w-full justify-center text-xs h-8 border-border bg-muted hover:bg-secondary text-foreground"
            onClick={() => {
              setOpen(false);
              router.push(fullNotificationsPath);
            }}
          >
            Open Notifications Center
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
