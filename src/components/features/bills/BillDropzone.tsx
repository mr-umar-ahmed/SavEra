"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  FileText,
  ImageIcon,
  RefreshCw,
  ScanLine,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import type { OcrExtraction } from "@/types";
import { simulateOcr } from "@/lib/api/simulated";
import { LabelChip } from "@/components/savera/LabelChip";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/components/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type BillDropzoneStream = "electricity" | "gas" | "water";

export interface PickedFile {
  name: string;
  sizeBytes: number;
  mimeType: string;
  /** Object URL for image previews (`null` for PDFs and the built-in sample). */
  previewUrl: string | null;
  isPdf: boolean;
  /** `true` when the viewer chose "Use a sample bill" instead of a real file. */
  isSample: boolean;
}

export interface BillExtractionResult {
  file: PickedFile;
  /** Simulated OCR output — always labelled `Simulated OCR` in the UI. */
  extraction: OcrExtraction;
  /** Position of this file in the picked batch (0-based) and the batch size. */
  index: number;
  total: number;
}

export interface BillDropzoneProps {
  /** Called once per file after the simulated OCR finishes. */
  onExtracted: (result: BillExtractionResult) => void;
  /** Called as soon as files are chosen (before scanning). */
  onFilesPicked?: (files: PickedFile[]) => void;
  stream?: BillDropzoneStream;
  title?: string;
  hint?: string;
  /** Native accept string for the file picker. */
  accept?: string;
  multiple?: boolean;
  /** Upper bound on files per pick when `multiple` (extra files are ignored). */
  maxFiles?: number;
  /** Show the "Use a sample bill" button for demos without a file (default `true`). */
  allowSample?: boolean;
  sampleLabel?: string;
  /** Scan duration per file in ms (default 2200, minimum 600). */
  scanDurationMs?: number;
  /** Return to the idle state after a batch instead of showing the done state. */
  resetAfterScan?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  id?: string;
}

type Status = "idle" | "scanning" | "done";

interface Stage {
  key: string;
  label: string;
  /** Progress reached at the end of this stage (0–100). */
  pct: number;
}

/* ------------------------------------------------------------------ */
/* Copy per stream                                                     */
/* ------------------------------------------------------------------ */

const STREAM_COPY: Record<
  BillDropzoneStream,
  { title: string; hint: string; layout: string; sample: string }
> = {
  electricity: {
    title: "Upload your latest electricity bill",
    hint: "PDF, JPG or PNG · from your phone gallery or computer",
    layout: "Detecting domestic LT-2 bill layout",
    sample: "Use a sample electricity bill",
  },
  gas: {
    title: "Upload your LPG refill receipt or PNG bill",
    hint: "PDF, JPG or PNG · refill slip or monthly bill",
    layout: "Detecting refill receipt layout",
    sample: "Use a sample refill receipt",
  },
  water: {
    title: "Upload your water bill",
    hint: "PDF, JPG or PNG · municipal water bill",
    layout: "Detecting municipal water bill layout",
    sample: "Use a sample water bill",
  },
};

function stagesFor(stream: BillDropzoneStream): Stage[] {
  return [
    { key: "read", label: "Reading image", pct: 18 },
    { key: "layout", label: STREAM_COPY[stream].layout, pct: 42 },
    { key: "fields", label: "Extracting units, billing period & meter readings", pct: 78 },
    { key: "validate", label: "Validating against tariff slabs", pct: 100 },
  ];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toPicked(file: File, previewUrl: string | null): PickedFile {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  return {
    name: file.name,
    sizeBytes: file.size,
    mimeType: file.type || (isPdf ? "application/pdf" : "application/octet-stream"),
    previewUrl,
    isPdf,
    isSample: false,
  };
}

const SAMPLE_FILE: PickedFile = {
  name: "sample-bill-sep-2026.png",
  sizeBytes: 412_000,
  mimeType: "image/png",
  previewUrl: null,
  isPdf: false,
  isSample: true,
};

/** Cream "paper" bill used when the viewer has no file at hand. Generic, unbranded. */
function SampleBill({ stream }: { stream: BillDropzoneStream }) {
  const heading =
    stream === "electricity"
      ? "Electricity Department (Raichur)"
      : stream === "gas"
        ? "LPG Distribution Cell (Raichur)"
        : "Water Supply Board (Raichur)";
  const big = stream === "electricity" ? "390 kWh" : stream === "gas" ? "14.2 kg" : "12,400 L";
  return (
    <svg
      viewBox="0 0 320 400"
      role="img"
      aria-label={`Sample ${stream} bill`}
      className="h-full w-full"
    >
      <rect x="0" y="0" width="320" height="400" rx="10" className="fill-card" />
      <rect x="0" y="0" width="320" height="56" rx="10" className="fill-muted" />
      <text x="20" y="26" className="fill-foreground font-sans" fontSize="12" fontWeight="700">
        {heading}
      </text>
      <text x="20" y="44" className="fill-muted-foreground font-mono" fontSize="9">
        DEMO BILL · DOMESTIC · SEP 2026
      </text>
      {[84, 104, 124, 144].map((y, i) => (
        <g key={y}>
          <rect x="20" y={y - 8} width={110 - i * 12} height="8" rx="3" className="fill-secondary" />
          <rect x="200" y={y - 8} width={100 - i * 10} height="8" rx="3" className="fill-secondary" />
        </g>
      ))}
      <rect x="20" y="168" width="280" height="1" className="fill-border-strong" />
      <text x="20" y="200" className="fill-muted-foreground font-mono" fontSize="9">
        UNITS CONSUMED
      </text>
      <text x="20" y="236" className="fill-foreground font-sans" fontSize="30" fontWeight="800">
        {big}
      </text>
      <text x="200" y="200" className="fill-muted-foreground font-mono" fontSize="9">
        AMOUNT DUE
      </text>
      <text x="200" y="236" className="fill-primary font-sans" fontSize="22" fontWeight="800">
        ₹3,120
      </text>
      {[270, 292, 314, 336].map((y, i) => (
        <g key={y}>
          <rect x="20" y={y - 8} width="120" height="8" rx="3" className="fill-secondary" />
          <rect x="220" y={y - 8} width={80 - i * 8} height="8" rx="3" className="fill-secondary" />
        </g>
      ))}
      <rect x="20" y="360" width="90" height="24" rx="12" className="fill-positive-soft" />
      <text x="34" y="376" className="fill-positive font-mono" fontSize="9" fontWeight="700">
        SAMPLE
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Real file picker + drag-and-drop for bills, followed by a realistic (but simulated)
 * OCR pass: staged progress, a scanning beam over the preview and a per-file callback
 * with the `OcrExtraction`. Never claims real OCR — renders `Simulated OCR` chips.
 */
export function BillDropzone({
  onExtracted,
  onFilesPicked,
  stream = "electricity",
  title,
  hint,
  accept = "image/*,.pdf,application/pdf",
  multiple = false,
  maxFiles = 12,
  allowSample = true,
  sampleLabel,
  scanDurationMs = 2200,
  resetAfterScan = false,
  disabled = false,
  compact = false,
  className,
  id,
}: BillDropzoneProps) {
  const copy = STREAM_COPY[stream];
  const stages = React.useMemo(() => stagesFor(stream), [stream]);
  const reducedMotion = useReducedMotion();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const aliveRef = React.useRef(true);
  const urlsRef = React.useRef<string[]>([]);
  const inputId = React.useId();

  const [status, setStatus] = React.useState<Status>("idle");
  const [dragging, setDragging] = React.useState(false);
  const [queue, setQueue] = React.useState<PickedFile[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [stageIndex, setStageIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [doneCount, setDoneCount] = React.useState(0);

  const busy = status === "scanning";
  const current = queue[currentIndex] ?? null;

  const revokeAll = React.useCallback(() => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url);
    urlsRef.current = [];
  }, []);

  React.useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      revokeAll();
    };
  }, [revokeAll]);

  const runScan = React.useCallback(
    async (files: PickedFile[]) => {
      if (files.length === 0) return;
      const perFile = Math.max(600, scanDurationMs);
      setQueue(files);
      setDoneCount(0);
      setStatus("scanning");
      onFilesPicked?.(files);

      for (let i = 0; i < files.length; i += 1) {
        if (!aliveRef.current) return;
        setCurrentIndex(i);
        setStageIndex(0);
        setProgress(0);

        const ocr = simulateOcr(files[i]);
        let prevPct = 0;
        for (let s = 0; s < stages.length; s += 1) {
          if (!aliveRef.current) return;
          setStageIndex(s);
          const share = (stages[s].pct - prevPct) / 100;
          prevPct = stages[s].pct;
          setProgress(stages[s].pct);
          await sleep(perFile * share);
        }
        const extraction = await ocr;
        if (!aliveRef.current) return;
        setDoneCount(i + 1);
        onExtracted({ file: files[i], extraction, index: i, total: files.length });
      }

      if (!aliveRef.current) return;
      if (resetAfterScan) {
        revokeAll();
        setQueue([]);
        setStatus("idle");
      } else {
        setStatus("done");
      }
    },
    [onExtracted, onFilesPicked, resetAfterScan, revokeAll, scanDurationMs, stages],
  );

  const acceptFiles = React.useCallback(
    (list: FileList | File[] | null | undefined) => {
      if (!list || busy || disabled) return;
      const files = Array.from(list).slice(0, multiple ? maxFiles : 1);
      if (files.length === 0) return;
      revokeAll();
      const picked = files.map((f) => {
        const isImage = f.type.startsWith("image/");
        const url = isImage ? URL.createObjectURL(f) : null;
        if (url) urlsRef.current.push(url);
        return toPicked(f, url);
      });
      void runScan(picked);
    },
    [busy, disabled, maxFiles, multiple, revokeAll, runScan],
  );

  const openPicker = () => {
    if (busy || disabled) return;
    inputRef.current?.click();
  };

  const useSample = () => {
    if (busy || disabled) return;
    revokeAll();
    void runScan([SAMPLE_FILE]);
  };

  const resetToIdle = () => {
    if (busy) return;
    revokeAll();
    setQueue([]);
    setCurrentIndex(0);
    setStageIndex(0);
    setProgress(0);
    setDoneCount(0);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  const previewLabel = current
    ? current.isSample
      ? "Sample bill"
      : `${current.name} · ${formatFileSize(current.sizeBytes)}`
    : "";

  return (
    <div className={cn("space-y-3", className)} id={id}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled || busy}
        className="sr-only"
        aria-label={title ?? copy.title}
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Drop zone / preview stage */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || busy}
        aria-busy={busy}
        aria-describedby={`${inputId}-hint`}
        onClick={status === "idle" ? openPicker : undefined}
        onKeyDown={status === "idle" ? onKeyDown : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy && !disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          acceptFiles(e.dataTransfer?.files);
        }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed transition-all",
          status === "idle" && !disabled && "cursor-pointer hover:border-positive/60 hover:bg-positive/[0.04]",
          dragging ? "border-positive bg-positive/[0.06]" : "border-border-strong bg-muted/60",
          status !== "idle" && "border-solid border-border bg-card",
          disabled && "cursor-not-allowed opacity-60",
          compact ? "min-h-[9rem]" : "min-h-[13rem]",
        )}
      >
        {status === "idle" && (
          <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-6" : "px-6 py-10")}>
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-positive/25 bg-positive/10 text-positive shadow-inner">
              <UploadCloud className="size-5" />
            </div>
            <span className="text-sm font-bold text-foreground">{title ?? copy.title}</span>
            <span id={`${inputId}-hint`} className="mt-1 text-xs text-muted-foreground">
              {hint ?? copy.hint}
            </span>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-mono text-2xs text-soft">
              <ImageIcon className="size-3.5 text-positive" />
              {dragging ? "Drop to scan" : "Click to choose a file · or drag & drop"}
            </span>
          </div>
        )}

        {status !== "idle" && current && (
          <div className={cn("grid gap-4", compact ? "p-3 sm:grid-cols-[7rem_1fr]" : "p-4 sm:grid-cols-[10rem_1fr]")}>
            {/* Preview with scanning beam */}
            <div
              className={cn(
                "relative overflow-hidden rounded-xl border border-border bg-inset",
                compact ? "h-28" : "h-44 sm:h-52",
              )}
            >
              {current.isSample ? (
                <SampleBill stream={stream} />
              ) : current.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.previewUrl} alt={`Preview of ${current.name}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FileText className="size-8" />
                  <span className="max-w-[90%] truncate font-mono text-2xs">{current.name}</span>
                </div>
              )}

              {busy && (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-positive/5" aria-hidden />
                  {reducedMotion ? (
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 bg-positive/80 shadow-[0_0_12px_2px_var(--positive)]" aria-hidden />
                  ) : (
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 h-0.5 bg-positive shadow-[0_0_14px_3px_var(--positive)]"
                      initial={{ top: "4%" }}
                      animate={{ top: ["4%", "94%", "4%"] }}
                      transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
                    />
                  )}
                  <div className="pointer-events-none absolute inset-2 rounded-lg border border-positive/40" aria-hidden>
                    <span className="absolute -top-px -left-px size-3 border-t-2 border-l-2 border-positive" />
                    <span className="absolute -top-px -right-px size-3 border-t-2 border-r-2 border-positive" />
                    <span className="absolute -bottom-px -left-px size-3 border-b-2 border-l-2 border-positive" />
                    <span className="absolute -right-px -bottom-px size-3 border-r-2 border-b-2 border-positive" />
                  </div>
                </>
              )}
            </div>

            {/* Stage list + progress */}
            <div className="flex min-w-0 flex-col justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-mono text-2xs text-muted-foreground">{previewLabel}</span>
                  <LabelChip kind="simulated" label="Simulated OCR" size="sm" />
                  {multiple && queue.length > 1 && (
                    <span className="font-mono text-2xs text-faint">
                      {Math.min(currentIndex + 1, queue.length)} / {queue.length}
                    </span>
                  )}
                </div>

                {busy ? (
                  <ul className="space-y-1.5 pt-1" aria-live="polite">
                    {stages.map((stage, i) => {
                      const state = i < stageIndex ? "done" : i === stageIndex ? "active" : "pending";
                      return (
                        <li
                          key={stage.key}
                          className={cn(
                            "flex items-center gap-2 text-xs transition-colors",
                            state === "done" && "text-positive",
                            state === "active" && "font-semibold text-foreground",
                            state === "pending" && "text-faint",
                          )}
                        >
                          {state === "done" ? (
                            <CheckCircle2 className="size-3.5 shrink-0" />
                          ) : state === "active" ? (
                            <ScanLine className={cn("size-3.5 shrink-0 text-positive", !reducedMotion && "animate-pulse")} />
                          ) : (
                            <span className="size-3.5 shrink-0 rounded-full border border-border-strong" />
                          )}
                          <span className="truncate">{stage.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 pt-1 text-sm font-bold text-positive">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>
                      {doneCount > 1 ? `${doneCount} bills extracted` : "Bill extracted"} — review the fields below
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={busy ? progress : 100}
                  aria-label="Bill scan progress"
                >
                  <div
                    className={cn("h-full rounded-full bg-positive", !reducedMotion && "transition-[width] duration-500 ease-out")}
                    style={{ width: `${busy ? progress : 100}%` }}
                  />
                </div>
                {status === "done" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={resetToIdle} className="h-8 gap-1.5 px-3 text-xs">
                      <RefreshCw className="size-3.5" />
                      Scan another bill
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {status === "idle" && allowSample && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-2xs text-faint">
            Files stay on your device — extraction is simulated for this demo.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={useSample}
            className="h-8 gap-1.5 px-3 text-xs text-positive hover:text-positive"
          >
            <Sparkles className="size-3.5" />
            {sampleLabel ?? copy.sample}
          </Button>
        </div>
      )}
    </div>
  );
}
