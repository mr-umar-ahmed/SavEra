"use client";

import { useEffect, useRef, useState } from "react";
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
  Video,
  Waves,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { LabelChip } from "@/components/savera/LabelChip";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/components/features/bills";
import { useWaterHome } from "@/lib/api/hooks";
import { useDataStore } from "@/stores/data";
import { newId } from "@/lib/ids";
import type { WaterExperience, WaterIssueType } from "@/types";
import { toast } from "sonner";
import { WaterSupplyLossSimulator } from "@/components/water/WaterSupplyLossSimulator";

export default function CitizenWaterPortalPage() {
  const router = useRouter();
  const [citizenWaterTab, setCitizenWaterTab] = useState<"supply_desk" | "meter_to_meter">("supply_desk");
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
  // Real file picker for evidence: the file stays on the device, the upload is simulated.
  const [evidenceFile, setEvidenceFile] = useState<{
    sizeBytes: number;
    isVideo: boolean;
    previewUrl: string | null;
  } | null>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const evidencePreviewRef = useRef<string | null>(null);

  const revokeEvidencePreview = () => {
    if (evidencePreviewRef.current) {
      URL.revokeObjectURL(evidencePreviewRef.current);
      evidencePreviewRef.current = null;
    }
  };

  // Release the preview object URL when the page unmounts.
  useEffect(() => {
    return () => {
      if (evidencePreviewRef.current) URL.revokeObjectURL(evidencePreviewRef.current);
    };
  }, []);

  const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    revokeEvidencePreview();
    const isVideo = file.type.startsWith("video/");
    const previewUrl = !isVideo && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    evidencePreviewRef.current = previewUrl;
    setUploadedEvidenceName(file.name);
    setEvidenceFile({ sizeBytes: file.size, isVideo, previewUrl });
    toast.success(isVideo ? "Video attached (Simulated upload)" : "Photo attached (Simulated upload)");
  };

  const handleRemoveEvidence = () => {
    revokeEvidencePreview();
    setUploadedEvidenceName(null);
    setEvidenceFile(null);
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={activeCase ? "warning" : "normal"}
              label={activeCase ? "🟡 Concern under review" : "🟢 Supply as scheduled"}
            />
            <span className="text-xs font-mono text-muted-foreground">XYZ Colony · Ward 24</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/citizen/water/area">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-border bg-muted hover:bg-secondary text-xs text-teal-ink rounded-xl"
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
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-start justify-between gap-3 text-xs text-teal-ink">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-teal-ink shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-foreground">{waterAlert.title}</span>
              <p className="text-teal-ink/80 mt-0.5">{waterAlert.reason}</p>
            </div>
          </div>
          <span className="text-2xs font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-ink border border-teal-500/30 shrink-0">
            Official Advisory
          </span>
        </div>
      )}

      {/* Multi-Tab Switcher: Supply Desk vs 3D Meter-to-Meter SCADA */}
      <div className="flex items-center p-1 rounded-2xl bg-muted/80 border border-border w-fit shadow-sm">
        <button
          type="button"
          onClick={() => setCitizenWaterTab("supply_desk")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            citizenWaterTab === "supply_desk"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Droplet className="size-3.5 text-stream-water" />
          <span>My Supply Schedule &amp; Feedback</span>
        </button>
        <button
          type="button"
          onClick={() => setCitizenWaterTab("meter_to_meter")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            citizenWaterTab === "meter_to_meter"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Waves className="size-3.5 text-cyan-ink" />
          <span>Meter-to-Meter 3D Supply &amp; Loss Detection</span>
        </button>
      </div>

      {citizenWaterTab === "meter_to_meter" ? (
        <WaterSupplyLossSimulator mode="citizen" />
      ) : (
        <>
          {/* 2. Today's Planned Supply Card & Household Availability */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 p-6 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-teal-ink font-bold text-xs uppercase tracking-wider font-mono">
                <Clock className="h-4 w-4" />
                <span>Today&apos;s Planned Supply</span>
              </div>
              <StatusBadge
                status={activeCase ? "warning" : "normal"}
                label={activeCase ? "Concern under review" : "Supply as scheduled"}
              />
            </div>

            <h3 className="text-2xl font-extrabold text-foreground mb-1.5">
              XYZ Colony · 7:00–8:00 AM Daily
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed font-mono">
              Planned Volume: <span className="text-teal-ink font-bold">4,50,000 L</span> for the colony feeder manifold.
            </p>
          </div>

          <div className="pt-6 border-t border-border/60 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-muted-foreground block">Estimated Household Availability:</span>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="text-base font-bold font-mono text-positive whitespace-nowrap">~640 L / day</span>
                <EstimatedChip confidence="Medium" />
              </div>
            </div>

            {!reportingOpen && (
              <Button
                onClick={handleStartReport}
                className="bg-positive text-positive-foreground hover:bg-positive/90 font-bold text-xs h-9 px-5 gap-2 rounded-xl shadow-lg shadow-positive/10"
              >
                <Droplet className="h-4 w-4" />
                <span>Report Water Issue</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Area Status Card */}
        <div className="p-6 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-1">
              Community Experience
            </span>
            <div className="text-3xl font-extrabold font-display text-foreground">78 Reports</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Grouped by AI into Case <strong className="text-teal-ink font-mono">XYZ-001</strong>. Supervisor field verification active.
            </p>
          </div>

          <div className="pt-4 border-t border-border/60 mt-4">
            <Link href="/citizen/water/area">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-ink text-xs font-semibold h-9 rounded-xl gap-2"
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
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-teal-ink font-bold block">
                Citizen Supply Feedback
              </span>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                Step {reportStep} of 4: {reportStep === 1 ? "Supply Details" : reportStep === 2 ? "Water Experience" : reportStep === 3 ? "Issue Details" : "Report Submitted"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setReportingOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          {/* STEP 1: Supply Details */}
          {reportStep === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-inset border border-border space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-muted-foreground font-sans">Locality:</span>
                  <span className="text-foreground font-bold">XYZ Colony, Ward 24</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-muted-foreground font-sans">Supply Window:</span>
                  <span className="text-positive font-bold">7:00 AM – 8:00 AM Today</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground font-sans">Planned Area Allocation:</span>
                  <span className="text-foreground">4,50,000 Litres</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setReportStep(2)}
                  className="bg-positive text-positive-foreground hover:bg-positive/90 font-bold text-xs h-9 px-6 rounded-xl gap-2 shadow-lg shadow-positive/10"
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
              <h4 className="text-sm font-semibold text-foreground">How was today&apos;s water supply?</h4>
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
                    className="p-4 rounded-2xl bg-muted/60 border border-border hover:border-teal-500/50 hover:bg-teal-500/[0.05] text-left transition-all group"
                  >
                    <span className="font-bold text-sm text-foreground group-hover:text-teal-ink block mb-1">
                      {opt.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Issue Details */}
          {reportStep === 3 && (
            <form onSubmit={handleSubmitReport} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-soft mb-1.5">
                  What happened? (Optional notes)
                </label>
                <textarea
                  value={issueDetails}
                  onChange={(e) => setIssueDetails(e.target.value)}
                  className="w-full h-20 rounded-xl bg-muted border border-border text-foreground text-xs p-3 outline-none focus:border-teal-500"
                  placeholder="e.g. Water came only for about 30 minutes with low pressure."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-soft mb-2">
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
                          ? "bg-positive text-positive-foreground shadow-md shadow-positive/10"
                          : "bg-muted border-border text-soft hover:bg-secondary"
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-soft mb-2">
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
                          ? "bg-teal-500/20 border-teal-500/40 text-teal-ink font-bold"
                          : "bg-muted border-border text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="water-evidence-input" className="block text-xs font-medium text-soft mb-1.5">
                  Optional photo / video evidence
                </label>
                <input
                  ref={evidenceInputRef}
                  id="water-evidence-input"
                  type="file"
                  accept="image/*,video/*"
                  className="sr-only"
                  aria-describedby="water-evidence-hint"
                  onChange={handleEvidenceChange}
                />
                {evidenceFile && uploadedEvidenceName ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 p-3">
                    {evidenceFile.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={evidenceFile.previewUrl}
                        alt={`Preview of ${uploadedEvidenceName}`}
                        className="size-12 shrink-0 rounded-lg border border-border object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-inset text-teal-ink">
                        <Video className="size-5" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">{uploadedEvidenceName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-2xs text-muted-foreground">
                          {formatFileSize(evidenceFile.sizeBytes)}
                        </span>
                        <LabelChip kind="simulated" label="Simulated upload" size="sm" />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveEvidence}
                      aria-label="Remove attached evidence"
                      className="h-8 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => evidenceInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-muted/60 p-3 text-center text-xs text-muted-foreground transition-colors hover:border-teal-500/40 hover:bg-teal-500/[0.04] focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                  >
                    <Camera className="h-4 w-4 text-teal-ink" aria-hidden="true" />
                    <span>Choose a photo or video from your device</span>
                  </button>
                )}
                <p id="water-evidence-hint" className="mt-1.5 text-2xs text-faint">
                  Files stay on your device — the upload is simulated for this demo.
                </p>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReportStep(2)}
                  className="text-xs text-soft"
                >
                  &larr; Back
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-positive text-positive-foreground hover:bg-positive/90 font-bold text-xs h-9 px-6 rounded-xl gap-2 shadow-lg shadow-positive/10"
                >
                  <span>Submit Report</span>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 4: Report Submitted Card matching §3 */}
          {reportStep === 4 && (
            <div className="p-6 rounded-2xl bg-inset border border-teal-500/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-ink">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Report Successfully Logged</h4>
                  <p className="text-xs text-teal-ink font-mono">
                    Report ID: {submittedReportId} · 8:12 AM
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/60 border border-border/60 grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-faint block font-sans">Issue Reported:</span>
                  <span className="text-foreground font-semibold">
                    {experience === "sufficient" ? "Sufficient" : "Less than usual"}
                  </span>
                </div>
                <div>
                  <span className="text-faint block font-sans">Current Stage:</span>
                  <span className="text-teal-ink font-semibold">Submitted &rarr; AI Area Analysis</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link href={`/citizen/water/reports/${submittedReportId}`} className="flex-1">
                  <Button className="w-full bg-positive text-positive-foreground hover:bg-positive/90 font-bold text-xs h-9 rounded-xl gap-2 shadow-lg shadow-positive/10">
                    <span>Track My Report Timeline</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setReportingOpen(false)}
                  className="text-xs border-border bg-muted hover:bg-secondary text-foreground h-9 rounded-xl"
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
        <div className="p-6 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-teal-ink" />
              <span>My Reports (Recent Submissions)</span>
            </h3>
            <span className="text-xs text-faint font-mono">{reports.length} total</span>
          </div>

          <div className="divide-y divide-border">
            {reports.slice(0, 3).map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{r.id}</span>
                    <StatusBadge
                      status={r.status === "closed" || r.status === "actioned" ? "normal" : "warning"}
                      label={r.status === "closed" || r.status === "actioned" ? "Resolved" : "In Review"}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground block mt-0.5">
                    {r.date} · {r.experience.replace("_", " ")}
                  </span>
                </div>

                <Link href={`/citizen/water/reports/${r.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-teal-ink hover:text-teal-ink font-semibold"
                  >
                    Track &rarr;
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Supply Details & Storage Tips */}
        <div className="p-6 rounded-3xl border border-border bg-card backdrop-blur-xl shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-teal-ink font-bold text-xs uppercase tracking-wider font-mono">
            <Info className="h-4 w-4" />
            <span>Supply Details &amp; Storage Tips</span>
          </div>
          <p className="text-xs text-soft leading-relaxed">
            Feeder Valve 4B operates under gravity head from the Raichur Central Reservoir. In areas with booster pump operation, keep sumps clear and fill overhead tanks during the first 45 minutes of scheduled delivery.
          </p>
          <div className="p-3 rounded-xl bg-muted/60 border border-border/60 space-y-1.5 text-xs font-mono text-muted-foreground">
            <div>• Standard pressure: 1.4 Bar at manifold</div>
            <div>• Feeder duration: 60 minutes nominal</div>
            <div>• Storage target: 1,000 L overhead / 2,000 L sump</div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
