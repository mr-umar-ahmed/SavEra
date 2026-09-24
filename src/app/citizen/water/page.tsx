"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplet,
  ExternalLink,
  History,
  MapPin,
  Send,
  Sparkles,
  Waves,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { Button } from "@/components/ui/button";
import { useWaterHome } from "@/lib/api/hooks";
import { useDataStore } from "@/stores/data";
import { newId } from "@/lib/ids";
import type { WaterExperience, WaterIssueType } from "@/types";
import { toast } from "sonner";

export default function CitizenWaterPortalPage() {
  const router = useRouter();
  const { schedule, reports, activeCase } = useWaterHome("H-1024");
  const addWaterReport = useDataStore((s) => s.addWaterReport);

  const [experience, setExperience] = useState<WaterExperience>("low_pressure");
  const [issueType, setIssueType] = useState<WaterIssueType>("low_pressure");
  const [durationMin, setDurationMin] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const reportId = newId("rep");
    const { report } = addWaterReport({
      id: reportId,
      householdId: "H-1024",
      areaId: "area-xyz",
      wardId: "ward-24",
      date: "2026-09-25",
      experience,
      issueType,
      durationMin,
      satisfied: false,
      status: "under_review",
      submittedAt: "2026-09-25T07:45:00Z",
    });

    setSubmitting(false);
    toast.success("Water experience report submitted and joined XYZ Colony case!");
    router.push(`/citizen/water/reports/${report.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Water Supply & Citizen Experience Portal"
        subtitle="Report localized water delivery experience, track municipal schedule, and view area-wide telemetry."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status="warning" label="Active Area Concern" />
            <span className="text-xs font-mono text-white/50">XYZ Colony · Ward 24</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/citizen/water/area">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-white/10 bg-white/5 text-xs text-teal-400">
                <MapPin className="h-3.5 w-3.5" />
                <span>Area Water Status</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Today's Supply Schedule & Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                <Clock className="h-4 w-4" />
                <span>Today&apos;s Municipal Supply Schedule</span>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-medium">Daily Schedule</span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">XYZ Colony · 7:00 AM – 8:00 AM</h3>
            <p className="text-xs text-white/60 leading-relaxed max-w-xl">
              Planned volume: approximately 450 Litres allocated per household under standard municipal feeder pressure.
            </p>
          </div>

          {activeCase && (
            <div className="mt-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{activeCase.reportCount} households reported reduced pressure today. Under supervisor review.</span>
              </div>
              <Link href={`/citizen/water/reports/${reports[0]?.id || "rep-1024-001"}`} className="text-emerald-400 hover:underline font-medium shrink-0 ml-2">
                View Timeline
              </Link>
            </div>
          )}
        </div>

        {/* Quick Area Metric */}
        <div className="p-6 rounded-2xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-white/60 mb-1">Ward 24 Telemetry</div>
            <div className="text-2xl font-bold font-mono text-white">78 Reports</div>
            <p className="text-xs text-white/50 mt-1">
              AI has grouped area reports into case <span className="font-mono text-teal-400">XYZ-001</span>.
            </p>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/40">Status:</span>
            <span className="font-semibold text-amber-400 font-mono">Under Review</span>
          </div>
        </div>
      </div>

      {/* Submit Water Experience Form */}
      <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white mb-1">Submit Today&apos;s Water Supply Experience</h3>
        <p className="text-xs text-white/60 mb-6">
          How was today&apos;s municipal water delivery in your household?
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Experience buttons */}
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Water Availability Experience</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {[
                { id: "sufficient", label: "Sufficient", icon: CheckCircle2 },
                { id: "less_than_usual", label: "Less Than Usual", icon: AlertCircle },
                { id: "very_low", label: "Very Low", icon: AlertCircle },
                { id: "no_water", label: "No Water", icon: AlertCircle },
                { id: "low_pressure", label: "Low Pressure", icon: Waves },
                { id: "short_duration", label: "Short Duration", icon: Clock },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExperience(opt.id as WaterExperience)}
                  className={`p-3 rounded-xl text-xs font-medium text-center border transition-all ${
                    experience === opt.id
                      ? "bg-teal-500/20 border-teal-500/40 text-teal-300 font-semibold"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Received */}
          <div>
            <label className="block text-xs font-semibold text-white mb-2">
              Approximate Duration Received (Minutes)
            </label>
            <div className="flex gap-2">
              {[15, 30, 45, 60].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDurationMin(min)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                    durationMin === min
                      ? "bg-teal-500 text-black font-bold"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-teal-500 text-black hover:bg-teal-400 font-semibold text-xs h-9 px-6 gap-2"
          >
            <span>Submit Water Experience</span>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>

      {/* Recent Citizen Reports */}
      {reports.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#070D0A]/95 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Your Submitted Reports</h3>
            <span className="text-xs text-white/40">{reports.length} total</span>
          </div>

          <div className="divide-y divide-white/5">
            {reports.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white font-mono">{r.id}</span>
                  <span className="text-white/40 ml-2">· {r.date} · {r.experience}</span>
                </div>
                <Link
                  href={`/citizen/water/reports/${r.id}`}
                  className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium"
                >
                  <span>Track Status</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
