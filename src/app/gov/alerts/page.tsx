"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplet,
  Flame,
  Radio,
  Send,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/stores/data";
import { toast } from "sonner";

export default function GovAlertsPage() {
  const officialAlerts = useDataStore((s) => s.officialAlerts);
  const publishAlert = useDataStore((s) => s.publishAlert);

  const [stream, setStream] = useState<"electricity" | "water" | "lpg">("electricity");
  const [title, setTitle] = useState("Planned Power Maintenance Interruption");
  const [windowStr, setWindowStr] = useState("Tomorrow, 10:00 AM – 02:00 PM");
  const [reason, setReason] = useState("Sub-station transformer upgrade and line maintenance");
  const [publishing, setPublishing] = useState(false);

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);

    setTimeout(() => {
      publishAlert({
        stream,
        type: stream === "electricity" ? "power_interruption" : stream === "water" ? "water_disruption" : "lpg_advisory",
        title,
        areaIds: ["area-xyz", "area-abc"],
        wardIds: ["ward-24"],
        windowStart: "2026-09-26T10:00:00Z",
        windowEnd: "2026-09-26T14:00:00Z",
        reason,
        publishedBy: stream === "lpg" ? "gas" : stream,
        publishedByUserId: "u-gov-electricity",
      });
      setPublishing(false);
      toast.success("Official disruption advisory published and broadcast to affected citizens!");
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Official Municipal Disruption Alert Publisher"
        subtitle="Broadcast legally binding, official advisories for scheduled maintenance, load shedding, and emergency repairs."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="official" label="Official Department Feed" />
            <span className="text-xs font-mono text-muted-foreground">Human-Published Only</span>
          </div>
        }
      />

      {/* Publish Form */}
      <form onSubmit={handlePublish} className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl space-y-4">
        <h3 className="text-sm font-bold text-foreground mb-2">Publish New Official Disruption Notice</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "electricity", label: "Electricity Grid Interruption", icon: Zap },
            { id: "water", label: "Water Supply Disruption", icon: Droplet },
            { id: "lpg", label: "LPG Distribution Advisory", icon: Flame },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStream(s.id as typeof stream)}
              className={`p-3 rounded-xl text-left border text-xs font-semibold flex items-center gap-2 transition-all ${
                stream === s.id
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-ink"
                  : "bg-muted border-border text-soft"
              }`}
            >
              <s.icon className="h-4 w-4" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-soft mb-1">Advisory Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl p-2.5 text-xs text-foreground"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-soft mb-1">Impact Window</label>
            <input
              type="text"
              value={windowStr}
              onChange={(e) => setWindowStr(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl p-2.5 text-xs text-foreground"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-soft mb-1">Target Wards</label>
            <input
              disabled
              value="Ward 24 (XYZ Colony, ABC Colony)"
              className="w-full bg-muted border border-border rounded-xl p-2.5 text-xs text-muted-foreground font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-soft mb-1">Reason & Recommended Citizen Action</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl p-2.5 text-xs text-foreground"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={publishing}
          className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-9 gap-2"
        >
          <ShieldAlert className="h-4 w-4" />
          <span>{publishing ? "Broadcasting Official Notice..." : "Publish Official Alert to Citizens"}</span>
        </Button>
      </form>

      {/* Active Alerts List */}
      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl">
        <h3 className="text-sm font-bold text-foreground mb-4">Published Official Alerts</h3>

        <div className="divide-y divide-border">
          {officialAlerts.map((a) => (
            <div key={a.id} className="py-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{a.title}</span>
                  <StatusBadge status="official" />
                </div>
                <span className="font-mono text-muted-foreground">
                  {a.windowStart ? `${a.windowStart.slice(11, 16)}–${a.windowEnd.slice(11, 16)} UTC` : "Active"}
                </span>
              </div>
              <p className="text-soft">{a.reason}</p>
              <div className="text-2xs text-faint font-mono">Published by {a.publishedBy}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
