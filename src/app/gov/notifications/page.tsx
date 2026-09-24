"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink, ShieldAlert, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { StreamIcon } from "@/components/savera/StreamIcon";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/lib/api/hooks";
import { useSessionStore } from "@/stores/session";
import { relativeTime } from "@/lib/dates";

export default function GovNotificationsPage() {
  const user = useSessionStore((s) => s.user);
  const demoNow = useSessionStore((s) => s.demoNow);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread" | "official">("all");

  const filtered = notifications.filter((n) => {
    const isUnread = user ? !n.readBy.includes(user.id) : false;
    if (filter === "unread") return isUnread;
    if (filter === "official") return n.official;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Municipal Command Notification Center"
        subtitle="Operational logs, grid contingency alerts, supervisor case escalations, and official published advisories."
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-emerald-400"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark All as Read</span>
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl divide-y divide-white/5">
        {filtered.map((n) => {
          const isUnread = user ? !n.readBy.includes(user.id) : false;
          return (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`py-4 flex items-start gap-4 transition-colors cursor-pointer ${
                isUnread ? "bg-emerald-500/[0.03]" : ""
              }`}
            >
              <div className="pt-0.5 shrink-0">
                {n.official ? (
                  <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                ) : n.stream ? (
                  <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <StreamIcon stream={n.stream} className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold ${isUnread ? "text-white" : "text-white/80"}`}>
                      {n.title}
                    </span>
                    {n.official && <StatusBadge status="official" />}
                  </div>
                  <span className="text-[10px] text-white/40 shrink-0 font-mono">
                    {relativeTime(n.createdAt, demoNow)}
                  </span>
                </div>

                <p className="text-xs text-white/70 leading-relaxed mb-2">{n.body}</p>

                {n.href && (
                  <Link
                    href={n.href}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:underline"
                  >
                    <span>Inspect event</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
