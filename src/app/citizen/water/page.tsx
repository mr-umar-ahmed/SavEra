"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Droplet,
  ExternalLink,
  History,
  Info,
  MapPin,
  Send,
  Sparkles,
  Upload,
  Waves,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
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
  const officialAlerts = useDataStore((s) => s.officialAlerts);
  const pushNotification = useDataStore((s) => s.pushNotification);

  // Active water alert if any
  const waterAlert = officialAlerts.find(
    (a) => a.stream === "water" && a.status === "active"
  );

  // 4-Step Report Flow state
  const [reportingOpen, setReportingOpen] = useState(false);
  const [reportStep, setReportStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 2 & 3 state
  const [experience, setExperience] = useState<WaterExperience>("less_than_usual");
  const [issueDetails, setIssueDetails] = useState(
    "Water came only for about 30 minutes with low pressure."
  );
  const [durationReceived, setDurationReceived] = useState<number>(30);
  const [requirementSatisfied, setRequirementSatisfied] = useState<"yes" | "partially" | "no">(
    "no"
  );
  const [uploadedEvidenceName, setUploadedEvidenceName] = useState<string | null>(null);

  // Step 4 Submitted Report info
  const [submittedReportId, setSubmittedReportId] = useState("WR-24-0913");
  const [submitting, setSubmitting] = useState(false);

  const handleStartReport = () => {
    setReportingOpen(true);
    setReportStep(1);
  };

  const handleExperienceSelect = (exp: WaterExperience) => {
    setExperience(exp);
    if (exp === "sufficient") {
      // Selecting Sufficient ends with positive report
      const repId = newId("wr");
      setSubmittedReportId(repId);
      addWaterReport({
        id: repId,
        householdId: "H-1024",
        areaId: "area-xyz",
        wardId: "ward-24",
        date: "2026-09-25",
        experience: "sufficient",
        durationMin: 60,
        satisfied: true,
        status: "grouped",
        submittedAt: new Date().toISOString(),
      });
      toast.success("Thanks — logged as sufficient.");
      setReportStep(4);
    } else {
      setReportStep(3);
    }
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const repId = `WR-24-${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmittedReportId(repId);

    const issueMapping: Record<WaterExperience, WaterIssueType | undefined> = {
      sufficient: undefined,
      less_than_usual: "insufficient",
      very_low: "insufficient",
      no_water: "no_water",
      low_pressure: "low_pressure",
      short_duration: "short_duration",
    };

    addWaterReport({
      id: repId,
      householdId: "H-1024",
      areaId: "area-xyz",
      wardId: "ward-24",
      date: "2026-09-25",
      experience,
      issueType: issueMapping[experience],
      durationMin: durationReceived,
      satisfied: requirementSatisfied === "yes",
      description: issueDetails,
      status: "grouped",
      submittedAt: new Date().toISOString(),
      media: uploadedEvidenceName ? [uploadedEvidenceName] : undefined,
    });

    // Push closing/tracking notification
    pushNotification({
      target: { role: "citizen", householdIds: ["H-1024"] },
      type: "water_case",
      title: "Water Report Received",
      body: `Your water report ${repId} has been received and joined XYZ Colony case analysis.`,
      stream: "water",
      href: `/citizen/water/reports/${repId}`,
    });

    setSubmitting(false);
    toast.success("Report submitted.");
    setReportStep(4);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Water Supply & Citizen Experience"
        eyebrow="WATER"
        subtitle="Report localized water delivery experience, track municipal schedule, and view area-wide telemetry."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge
              status={activeCase ? "warning" : "normal"}
              label={activeCase ? "🟡 Concern under review" : "🟢 Supply as scheduled"}
            />
            <span className="text-xs font-mono text-white/50">XYZ Colony · Ward 24</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/citizen/water/area">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-xs text-teal-400 rounded-xl"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Area Water Status</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Active Official Disruption Alert Banner */}
      {waterAlert && (
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-start justify-between gap-3 text-xs text-teal-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-white">{waterAlert.title}</span>
              <p className="text-teal-200/80 mt-0.5">{waterAlert.reason}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
            Official Advisory
          </span>
        </div>
      )}

      {/* 2. Today's Planned Supply Card & Household Availability */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 p-6 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider font-mono">
                <Clock className="h-4 w-4" />
                <span>Today&apos;s Planned Supply</span>
              </div>
              <StatusBadge
                status={activeCase ? "warning" : "normal"}
                label={activeCase ? "Concern under review" : "Supply as scheduled"}
              />
            </div>

            <h3 className="text-2xl font-extrabold text-white mb-1.5">
              XYZ Colony · 7:00–8:00 AM Daily
            </h3>
            <p className="text-xs text-white/60 leading-relaxed font-mono">
              Planned Volume: <span className="text-teal-400 font-bold">4,50,000 L</span> for the colony feeder manifold.
            </p>
          </div>

          <div className="pt-6 border-t border-white/5 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-white/50 block">Estimated Household Availability:</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-base font-bold font-mono text-emerald-400">~640 L / day</span>
                <EstimatedChip confidence="Medium" />
              </div>
            </div>

            {!reportingOpen && (
              <Button
                onClick={handleStartReport}
                className="bg-teal-500 text-black hover:bg-teal-400 font-bold text-xs h-9 px-5 gap-2 rounded-xl shadow-lg shadow-teal-500/20"
              >
                <Droplet className="h-4 w-4" />
                <span>Report Water Issue</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Area Status Card */}
        <div className="p-6 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-white/50 block mb-1">
              Community Experience
            </span>
            <div className="text-3xl font-extrabold font-mono text-white">78 Reports</div>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              Grouped by AI into Case <strong className="text-teal-400 font-mono">XYZ-001</strong>. Supervisor field verification active.
            </p>
          </div>

          <div className="pt-4 border-t border-white/5 mt-4">
            <Link href="/citizen/water/area">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold h-9 rounded-xl gap-2"
              >
                <span>View Full Area Status</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. 4-STEP REPORT FLOW (Matching §3) */}
      {reportingOpen && (
        <div className="rounded-3xl border border-teal-500/30 bg-teal-500/[0.03] p-6 sm:p-8 backdrop-blur-2xl space-y-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-bold block">
                Citizen Supply Feedback
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Step {reportStep} of 4: {reportStep === 1 ? "Supply Details" : reportStep === 2 ? "Water Experience" : reportStep === 3 ? "Issue Details" : "Report Submitted"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setReportingOpen(false)}
              className="text-xs text-white/50 hover:text-white"
            >
              Cancel
            </button>
          </div>

          {/* STEP 1: Supply Details */}
          {reportStep === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50 font-sans">Locality:</span>
                  <span className="text-white font-bold">XYZ Colony, Ward 24</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50 font-sans">Supply Window:</span>
                  <span className="text-emerald-400 font-bold">7:00 AM – 8:00 AM Today</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-white/50 font-sans">Planned Area Allocation:</span>
                  <span className="text-white">4,50,000 Litres</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setReportStep(2)}
                  className="bg-teal-500 text-black hover:bg-teal-400 font-bold text-xs h-9 px-6 rounded-xl gap-2 shadow-lg shadow-teal-500/20"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Water Experience */}
          {reportStep === 2 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">How was today&apos;s water supply?</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: "sufficient" as const, label: "Sufficient", desc: "Adequate volume & pressure" },
                  { id: "less_than_usual" as const, label: "Less than usual", desc: "Noticeable drop in volume" },
                  { id: "very_low" as const, label: "Very low", desc: "Trickle / barely usable" },
                  { id: "no_water" as const, label: "No water", desc: "Zero supply recorded" },
                  { id: "low_pressure" as const, label: "Low pressure", desc: "Unable to fill overhead tank" },
                  { id: "short_duration" as const, label: "Short duration", desc: "Supply ended early" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleExperienceSelect(opt.id)}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-teal-500/50 hover:bg-teal-500/[0.05] text-left transition-all group"
                  >
                    <span className="font-bold text-sm text-white group-hover:text-teal-300 block mb-1">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-white/50">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Issue Details */}
          {reportStep === 3 && (
            <form onSubmit={handleSubmitReport} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  What happened? (Optional notes)
                </label>
                <textarea
                  value={issueDetails}
                  onChange={(e) => setIssueDetails(e.target.value)}
                  className="w-full h-20 rounded-xl bg-white/5 border border-white/10 text-white text-xs p-3 outline-none focus:border-teal-500"
                  placeholder="e.g. Water came only for about 30 minutes with low pressure."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-2">
                  Duration received (minutes)
                </label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationReceived(mins)}
                      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        durationReceived === mins
                          ? "bg-teal-500 text-black shadow-md shadow-teal-500/20"
                          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-2">
                  Was your requirement satisfied?
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "yes" as const, label: "Yes" },
                    { id: "partially" as const, label: "Partially" },
                    { id: "no" as const, label: "No" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setRequirementSatisfied(s.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        requirementSatisfied === s.id
                          ? "bg-teal-500/20 border-teal-500/40 text-teal-300 font-bold"
                          : "bg-white/5 border-white/10 text-white/60"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Optional photo / video (Simulated upload)
                </label>
                <div
                  onClick={() => {
                    setUploadedEvidenceName("pressure_gauge_0.8bar.jpg");
                    toast.success("Photo attached (Simulated upload)");
                  }}
                  className="p-3 rounded-xl border border-dashed border-white/15 hover:border-teal-500/40 bg-white/[0.01] text-center cursor-pointer text-xs text-white/60 flex items-center justify-center gap-2"
                >
                  <Camera className="h-4 w-4 text-teal-400" />
                  <span>
                    {uploadedEvidenceName
                      ? `Attached: ${uploadedEvidenceName}`
                      : "Click to simulate evidence upload (photo/video)"}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReportStep(2)}
                  className="text-xs text-white/70"
                >
                  &larr; Back
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-teal-500 text-black hover:bg-teal-400 font-bold text-xs h-9 px-6 rounded-xl gap-2 shadow-lg shadow-teal-500/20"
                >
                  <span>Submit Report</span>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 4: Report Submitted Card matching §3 */}
          {reportStep === 4 && (
            <div className="p-6 rounded-2xl bg-black/40 border border-teal-500/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Report Successfully Logged</h4>
                  <p className="text-xs text-teal-300 font-mono">
                    Report ID: {submittedReportId} · 8:12 AM
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-white/40 block font-sans">Issue Reported:</span>
                  <span className="text-white font-semibold">
                    {experience === "sufficient" ? "Sufficient" : "Less than usual"}
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block font-sans">Current Stage:</span>
                  <span className="text-teal-400 font-semibold">Submitted &rarr; AI Area Analysis</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link href={`/citizen/water/reports/${submittedReportId}`} className="flex-1">
                  <Button className="w-full bg-teal-500 text-black hover:bg-teal-400 font-bold text-xs h-9 rounded-xl gap-2 shadow-lg shadow-teal-500/20">
                    <span>Track My Report Timeline</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setReportingOpen(false)}
                  className="text-xs border-white/10 bg-white/5 hover:bg-white/10 text-white h-9 rounded-xl"
                >
                  Back to Water Home
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cards: My Reports (latest 3) & Supply Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card: My Reports */}
        <div className="p-6 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-teal-400" />
              <span>My Reports (Recent Submissions)</span>
            </h3>
            <span className="text-xs text-white/40 font-mono">{reports.length} total</span>
          </div>

          <div className="divide-y divide-white/5">
            {reports.slice(0, 3).map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{r.id}</span>
                    <StatusBadge
                      status={r.status === "closed" || r.status === "actioned" ? "normal" : "warning"}
                      label={r.status === "closed" || r.status === "actioned" ? "Resolved" : "In Review"}
                    />
                  </div>
                  <span className="text-[11px] text-white/50 block mt-0.5">
                    {r.date} · {r.experience.replace("_", " ")}
                  </span>
                </div>

                <Link href={`/citizen/water/reports/${r.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-teal-400 hover:text-teal-300 font-semibold"
                  >
                    Track &rarr;
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Supply Details & Storage Tips */}
        <div className="p-6 rounded-3xl border border-white/10 bg-[#070D0A]/95 backdrop-blur-xl shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider font-mono">
            <Info className="h-4 w-4" />
            <span>Supply Details &amp; Storage Tips</span>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Feeder Valve 4B operates under gravity head from the Raichur Central Reservoir. In areas with booster pump operation, keep sumps clear and fill overhead tanks during the first 45 minutes of scheduled delivery.
          </p>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-[11px] font-mono text-white/60">
            <div>• Standard pressure: 1.4 Bar at manifold</div>
            <div>• Feeder duration: 60 minutes nominal</div>
            <div>• Storage target: 1,000 L overhead / 2,000 L sump</div>
          </div>
        </div>
      </div>
    </div>
  );
}
