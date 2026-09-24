"use client";

import { AlertTriangle, Camera, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ElectricityForm } from "@/components/readings/electricity-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/api";
import { useApi } from "@/lib/api.client";
import { getBillJob, uploadBill } from "@/lib/endpoints";
import type { OcrJob } from "@/lib/types";

const POLL_INTERVAL_MS = 1200;
const POLL_ATTEMPTS = 25; // ~30 s, comfortably past a slow Vision call
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Stage = "idle" | "uploading" | "reading" | "review" | "manual";

/** What the parser gives a field, phrased for someone who has never seen a confidence score. */
export function confidenceLabel(confidence: number | null): {
  text: string;
  tone: "good" | "warn" | "bad";
} {
  if (confidence === null) return { text: "Not read", tone: "bad" };
  if (confidence >= 85) return { text: "Read clearly", tone: "good" };
  if (confidence >= 70) return { text: "Read, please check", tone: "warn" };
  return { text: "Hard to read", tone: "bad" };
}

const TONE_CLASS: Record<"good" | "warn" | "bad", string> = {
  good: "bg-good-soft text-good-fg",
  warn: "bg-warn-soft text-warn-fg",
  bad: "bg-bad-soft text-bad-fg",
};

/**
 * Photo of a bill → background OCR → the figures shown for confirmation.
 *
 * Nothing is saved by the OCR itself: the extraction only prefills the same
 * manual form, and the user presses save. When the bill cannot be read at all
 * the form still opens, empty, so the trip is never wasted.
 */
export function BillUpload({ onSaved }: { onSaved?: () => void }) {
  const call = useApi();
  const [stage, setStage] = useState<Stage>("idle");
  const [job, setJob] = useState<OcrJob | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const pollUntilDone = useCallback(async (jobId: string) => {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      if (cancelled.current) return;
      const current = await call((ctx) => getBillJob(jobId, ctx));
      if (current.status !== "pending") {
        if (!cancelled.current) {
          setJob(current);
          setStage("review");
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    if (!cancelled.current) {
      toast.error("Reading the bill is taking too long — you can type the figures instead.");
      setStage("manual");
    }
  }, [call]);

  async function onFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("That photo is over 10 MB — take a smaller one or crop it.");
      return;
    }
    setStage("uploading");
    setJob(null);
    try {
      const created = await call((ctx) => uploadBill(file, ctx));
      if (cancelled.current) return;
      setStage("reading");
      await pollUntilDone(created.id);
    } catch (err) {
      if (cancelled.current) return;
      toast.error(describeError(err, "Could not upload that photo."));
      setStage("idle");
    }
  }

  function reset() {
    setJob(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      capture="environment"
      className="sr-only"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void onFile(file);
      }}
    />
  );

  if (stage === "uploading" || stage === "reading") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Spinner className="size-7 text-primary" />
        <p className="font-medium">
          {stage === "uploading" ? "Sending your photo…" : "Reading your bill…"}
        </p>
        <p className="max-w-xs text-sm text-muted-foreground">
          This takes a few seconds. You will get a chance to correct anything we misread.
        </p>
      </div>
    );
  }

  if (stage === "manual") {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle aria-hidden />
          <AlertTitle>Type the figures instead</AlertTitle>
          <AlertDescription>They are on the same line as “Units consumed”.</AlertDescription>
        </Alert>
        <ElectricityForm onSaved={onSaved} />
        <Button variant="ghost" className="w-full touch-target" onClick={reset}>
          <RotateCcw aria-hidden />
          Try another photo
        </Button>
      </div>
    );
  }

  if (stage === "review" && job) {
    const extraction = job.extraction;
    const failed = job.status === "failed" || !extraction;
    const unreadable = failed || extraction?.kwh === null;

    return (
      <div className="space-y-4">
        {unreadable ? (
          <Alert>
            <AlertTriangle aria-hidden />
            <AlertTitle>We could not read the units off that photo</AlertTitle>
            <AlertDescription>
              Fill them in below — everything else you typed is kept.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2 rounded-xl border border-border bg-secondary/50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={TONE_CLASS[confidenceLabel(job.confidence).tone]}>
                {confidenceLabel(job.confidence).text}
              </Badge>
              {extraction?.utility ? (
                <Badge variant="outline">{extraction.utility}</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Check every figure against your bill before saving — this is what we read, not
              what we know.
            </p>
          </div>
        )}

        {extraction?.warnings.length ? (
          <ul className="space-y-1 text-sm text-warn-fg">
            {extraction.warnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {warning}
              </li>
            ))}
          </ul>
        ) : null}

        <ElectricityForm
          key={job.id}
          source="ocr"
          ocrJobId={job.id}
          initial={{
            kwh: extraction?.kwh != null ? String(extraction.kwh) : "",
            billing_period_start: extraction?.billing_period_start ?? "",
            billing_period_end: extraction?.billing_period_end ?? "",
            billed_amount: extraction?.billed_amount != null ? String(extraction.billed_amount) : "",
          }}
          submitLabel="Confirm and save"
          onSaved={onSaved}
        />

        <Button variant="ghost" className="w-full touch-target" onClick={reset}>
          <RotateCcw aria-hidden />
          Try another photo
        </Button>
        {picker}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        size="lg"
        className="w-full touch-target"
        onClick={() => inputRef.current?.click()}
      >
        <Camera aria-hidden />
        Take a photo of your bill
      </Button>
      {picker}
      <p className="text-center text-sm text-muted-foreground">
        Lay the bill flat and fit the whole page in. We read the units, dates and amount, then
        show them for you to confirm.
      </p>
    </div>
  );
}
