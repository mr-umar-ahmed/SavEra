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
            <span className="text-xs font-mono text-white/50">Human-Published Only</span>
          </div>
        }
      />

      {/* Publish Form */}
      <form onSubmit={handlePublish} className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl space-y-4">
        <h3 className="text-sm font-bold text-white mb-2">Publish New Official Disruption Notice</h3>

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
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-white/5 border-white/10 text-white/70"
              }`}
            >
              <s.icon className="h-4 w-4" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-white/80 mb-1">Advisory Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">Impact Window</label>
            <input
              type="text"
              value={windowStr}
              onChange={(e) => setWindowStr(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">Target Wards</label>
            <input
              disabled
              value="Ward 24 (XYZ Colony, ABC Colony)"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white/60 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/80 mb-1">Reason & Recommended Citizen Action</label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={publishing}
          className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold text-xs h-9 gap-2 shadow-lg shadow-amber-500/20"
        >
          <ShieldAlert className="h-4 w-4" />
          <span>{publishing ? "Broadcasting Official Notice..." : "Publish Official Alert to Citizens"}</span>
        </Button>
      </form>

      {/* Active Alerts List */}
      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl">
        <h3 className="text-sm font-bold text-white mb-4">Published Official Alerts</h3>

        <div className="divide-y divide-white/5">
          {officialAlerts.map((a) => (
            <div key={a.id} className="py-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{a.title}</span>
                  <StatusBadge status="official" />
                </div>
                <span className="font-mono text-white/50">
                  {a.windowStart ? `${a.windowStart.slice(11, 16)}–${a.windowEnd.slice(11, 16)} UTC` : "Active"}
                </span>
              </div>
              <p className="text-white/70">{a.reason}</p>
              <div className="text-[10px] text-white/40 font-mono">Published by {a.publishedBy}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
