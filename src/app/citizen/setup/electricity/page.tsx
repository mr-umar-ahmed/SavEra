"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AirVent,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  FileText,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Minus,
  Plus,
  QrCode,
  RotateCcw,
  Scan,
  ShieldAlert,
  Sparkles,
  Tv,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { LabelChip } from "@/components/savera/LabelChip";
import { SkipRow } from "@/components/savera/SkipRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BillDropzone, type BillExtractionResult } from "@/components/features/bills";
import { toast } from "sonner";
import { useCurrentHousehold } from "@/lib/api/hooks";
import { useDataStore } from "@/stores/data";
import { useSessionStore } from "@/stores/session";
import { computeBill } from "@/lib/engine/tariff";
import { addMonths, currentMonth, monthLabel, previousMonth } from "@/lib/dates";
import { formatINR, formatKwh } from "@/lib/format";
import type { MonthKey } from "@/types";

interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  count: number;
  selected: boolean;
}

/** One attached previous bill in Step 5 (a list row, not a store write). */
interface PreviousBillRow {
  month: MonthKey;
  kwh: number;
  amount: number;
  /** File name when the row came from a picked file; `null` for instant imports. */
  fileName: string | null;
  source: "upload" | "import";
}

/**
 * Spec display values for the four most recent previous months (02-electricity.md §3.5).
 * Older months continue from the household's seeded bills in the data store.
 */
const SPEC_PREVIOUS_BILLS: ReadonlyArray<{ kwh: number; amount: number }> = [
  { kwh: 350, amount: 2850 },
  { kwh: 362, amount: 2940 },
  { kwh: 378, amount: 3050 },
  { kwh: 415, amount: 3380 },
];

const MAX_PREVIOUS_BILLS = 12;

export default function ElectricitySetupWizard() {
  const router = useRouter();
  const { household } = useCurrentHousehold();
  const setSectionStatus = useDataStore((s) => s.setSectionStatus);
  const bills = useDataStore((s) => s.bills);
  const demoNow = useSessionStore((s) => s.demoNow);
  const householdId = household?.id ?? "H-1024";

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  /** This household's seeded bill history, newest first (the store is the source of truth). */
  const seededBills = useMemo(
    () =>
      bills
        .filter((b) => b.householdId === householdId)
        .sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0)),
    [bills, householdId]
  );
  const seededBillCount = seededBills.length;

  /**
   * Months a previous-bill upload can be attributed to, newest first: the four spec
   * months, then older seeded months until 12 are available (never the current month).
   */
  const previousBillCandidates = useMemo<Array<Pick<PreviousBillRow, "month" | "kwh" | "amount">>>(() => {
    const thisMonth = currentMonth(demoNow);
    const prev = previousMonth(demoNow);
    const rows = SPEC_PREVIOUS_BILLS.map((p, i) => ({
      month: addMonths(prev, -i),
      kwh: p.kwh,
      amount: p.amount,
    }));
    for (const b of seededBills) {
      if (rows.length >= MAX_PREVIOUS_BILLS) break;
      if (b.month >= thisMonth) continue;
      if (rows.some((r) => r.month === b.month)) continue;
      rows.push({ month: b.month, kwh: b.kwh, amount: b.amount ?? computeBill(b.kwh).total });
    }
    return rows;
  }, [demoNow, seededBills]);

  // Step 1: 9 Categories Inventory
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    // Cooling
    { id: "ac", name: "Air conditioner", category: "Cooling", count: 1, selected: true },
    { id: "air_cooler", name: "Air cooler", category: "Cooling", count: 0, selected: false },
    { id: "ceiling_cooler", name: "Ceiling-mounted cooler", category: "Cooling", count: 0, selected: false },
    { id: "portable_ac", name: "Portable AC", category: "Cooling", count: 0, selected: false },
    { id: "dehumidifier", name: "Dehumidifier", category: "Cooling", count: 0, selected: false },

    // Fans & Ventilation
    { id: "ceiling_fan", name: "Ceiling fan", category: "Fans & Ventilation", count: 4, selected: true },
    { id: "pedestal_fan", name: "Table / pedestal fan", category: "Fans & Ventilation", count: 0, selected: false },
    { id: "exhaust_fan", name: "Exhaust fan", category: "Fans & Ventilation", count: 0, selected: false },
    { id: "wall_fan", name: "Wall fan", category: "Fans & Ventilation", count: 0, selected: false },
    { id: "tower_fan", name: "Tower fan", category: "Fans & Ventilation", count: 0, selected: false },

    // Lighting
    { id: "led_bulb", name: "LED bulb", category: "Lighting", count: 8, selected: true },
    { id: "tube_light", name: "Tube light", category: "Lighting", count: 2, selected: true },
    { id: "cfl", name: "CFL", category: "Lighting", count: 0, selected: false },
    { id: "decorative_light", name: "Decorative / strip lights", category: "Lighting", count: 0, selected: false },
    { id: "security_light", name: "Outdoor / security light", category: "Lighting", count: 0, selected: false },

    // Kitchen
    { id: "refrigerator", name: "Refrigerator", category: "Kitchen", count: 1, selected: true },
    { id: "microwave", name: "Microwave", category: "Kitchen", count: 1, selected: true },
    { id: "mixer", name: "Mixer / grinder", category: "Kitchen", count: 1, selected: true },
    { id: "induction", name: "Induction cooktop", category: "Kitchen", count: 0, selected: false },
    { id: "kettle", name: "Electric kettle", category: "Kitchen", count: 0, selected: false },
    { id: "toaster", name: "Toaster / OTG", category: "Kitchen", count: 0, selected: false },
    { id: "dishwasher", name: "Dishwasher", category: "Kitchen", count: 0, selected: false },
    { id: "chimney", name: "Chimney", category: "Kitchen", count: 0, selected: false },

    // Water & Heating
    { id: "geyser", name: "Geyser / water heater", category: "Water & Heating", count: 1, selected: true },
    { id: "water_pump", name: "Water pump / motor", category: "Water & Heating", count: 0, selected: false },
    { id: "instant_heater", name: "Instant heater", category: "Water & Heating", count: 0, selected: false },
    { id: "room_heater", name: "Room heater", category: "Water & Heating", count: 0, selected: false },
    { id: "ro_purifier", name: "RO purifier", category: "Water & Heating", count: 0, selected: false },

    // Laundry
    { id: "washing_machine", name: "Washing machine", category: "Laundry", count: 1, selected: true },
    { id: "dryer", name: "Dryer", category: "Laundry", count: 0, selected: false },
    { id: "iron", name: "Iron", category: "Laundry", count: 1, selected: true },

    // Entertainment
    { id: "tv", name: "Television", category: "Entertainment", count: 1, selected: true },
    { id: "set_top_box", name: "Set-top box", category: "Entertainment", count: 0, selected: false },
    { id: "home_theatre", name: "Speaker / home theatre", category: "Entertainment", count: 0, selected: false },
    { id: "gaming", name: "Gaming console", category: "Entertainment", count: 0, selected: false },

    // Computing & Electronics
    { id: "wifi", name: "Wi-Fi router", category: "Computing & Electronics", count: 1, selected: true },
    { id: "laptop", name: "Laptop", category: "Computing & Electronics", count: 1, selected: true },
    { id: "desktop", name: "Desktop PC", category: "Computing & Electronics", count: 0, selected: false },
    { id: "printer", name: "Printer", category: "Computing & Electronics", count: 0, selected: false },
    { id: "chargers", name: "Mobile chargers", category: "Computing & Electronics", count: 0, selected: false },

    // Other
    { id: "ev_charger", name: "EV charger", category: "Other", count: 0, selected: false },
    { id: "inverter", name: "Inverter / UPS", category: "Other", count: 0, selected: false },
    { id: "sewing", name: "Sewing machine", category: "Other", count: 0, selected: false },
    { id: "vacuum", name: "Vacuum cleaner", category: "Other", count: 0, selected: false },
    { id: "aquarium", name: "Aquarium", category: "Other", count: 0, selected: false },
  ]);

  // Step 2 Progressive details state
  const [dontKnowNote, setDontKnowNote] = useState<string | null>(null);

  // Step 4 Bill OCR state (filled by the BillDropzone's simulated extraction)
  const [ocrSaved, setOcrSaved] = useState(false);
  const [billUnits, setBillUnits] = useState("390");
  const [billingPeriod, setBillingPeriod] = useState("22 Aug – 21 Sep 2026");
  const [billDate, setBillDate] = useState("23 Sep 2026");
  const [meterStart, setMeterStart] = useState("14210");
  const [meterEnd, setMeterEnd] = useState("14600");
  const [billCategory, setBillCategory] = useState("Domestic (LT-2)");
  const [billAmount, setBillAmount] = useState("3120");

  // Step 5 Previous bills: quick-pick horizon + the attached rows.
  // A ref mirrors the rows so the dropzone's per-file callback (captured once per
  // batch) always appends to the latest list.
  const [previousMonthsCount, setPreviousMonthsCount] = useState<number>(12);
  const [previousBills, setPreviousBills] = useState<PreviousBillRow[]>([]);
  const previousBillsRef = useRef<PreviousBillRow[]>([]);
  const skippedUploadsRef = useRef(0);
  const importCount = Math.min(previousMonthsCount, previousBillCandidates.length);

  const commitPreviousBills = (rows: PreviousBillRow[]) => {
    previousBillsRef.current = rows;
    setPreviousBills(rows);
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextSelected = !item.selected;
          return {
            ...item,
            selected: nextSelected,
            count: nextSelected && item.count === 0 ? 1 : item.count,
          };
        }
        return item;
      })
    );
  };

  const updateItemCount = (id: string, delta: number) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newCount = Math.max(1, item.count + delta);
          return { ...item, count: newCount };
        }
        return item;
      })
    );
  };

  /** Step 4: the picked file finished its simulated OCR pass — fill the editable card. */
  const handleBillExtracted = useCallback(({ extraction }: BillExtractionResult) => {
    setOcrSaved(true);
    setBillUnits(String(extraction.kwh));
    setBillAmount(String(extraction.amount));
    toast.success(`Bill read — ${extraction.kwh} kWh for Sep 2026 (Simulated OCR).`);
  }, []);

  /** Step 5: each extracted file is attributed to the next older month not yet attached. */
  const handlePreviousBillExtracted = useCallback(
    ({ file, index, total }: BillExtractionResult) => {
      if (index === 0) skippedUploadsRef.current = 0;
      const rows = previousBillsRef.current;
      const next = previousBillCandidates.find((c) => !rows.some((r) => r.month === c.month));
      if (next) {
        previousBillsRef.current = [
          ...rows,
          { ...next, fileName: file.name, source: "upload" },
        ];
        setPreviousBills(previousBillsRef.current);
      } else {
        skippedUploadsRef.current += 1;
      }
      if (index === total - 1) {
        const attached = total - skippedUploadsRef.current;
        const onFile = previousBillsRef.current.length;
        if (attached > 0) {
          toast.success(
            `${attached} bill${attached === 1 ? "" : "s"} attached — ${onFile} month${onFile === 1 ? "" : "s"} on file (Simulated OCR).`
          );
        }
        if (skippedUploadsRef.current > 0) {
          toast.message(
            `${skippedUploadsRef.current} file${skippedUploadsRef.current === 1 ? "" : "s"} skipped — all ${previousBillCandidates.length} available months are already attached.`
          );
        }
      }
    },
    [previousBillCandidates]
  );

  const handleImportSeededBills = () => {
    const rows = previousBillCandidates
      .slice(0, importCount)
      .map((c) => ({ ...c, fileName: null, source: "import" as const }));
    commitPreviousBills(rows);
    toast.success(`${rows.length} month${rows.length === 1 ? "" : "s"} imported from seeded history (simulated).`);
  };

  const handleClearPreviousBills = () => {
    commitPreviousBills([]);
    toast.message("Attached bills cleared.");
  };

  const handleSaveBillAndContinue = () => {
    toast.success(`Bill added — ${billUnits || "390"} kWh for Sep 2026.`);
    setStep(5);
  };

  const handleFinalBaselineComplete = () => {
    if (household) {
      setSectionStatus(household.id, "electricity", "complete");
    }
    toast.success("Personalised baseline established!");
    router.push("/citizen/electricity");
  };

  // Group checklist by category
  const categories = Array.from(new Set(checklist.map((c) => c.category)));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Electricity Setup & Baseline Wizard"
        subtitle="Map high-load appliances and historical consumption bills to establish your personal efficiency baseline."
        breadcrumbs={[
          { label: "Habitat Hub", href: "/citizen" },
          { label: "Electricity Setup" },
        ]}
      />

      {/* 6-Step Stepper Header */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-card text-xs overflow-x-auto scrollbar-none shadow-lg">
        {[
          { num: 1, label: "Checklist" },
          { num: 2, label: "Appliance Details" },
          { num: 3, label: "Status" },
          { num: 4, label: "Current Bill" },
          { num: 5, label: "Previous Bills" },
          { num: 6, label: "Baseline" },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setStep(s.num as typeof step)}
              className={`flex items-center gap-1.5 transition-colors ${
                step === s.num
                  ? "text-positive font-bold"
                  : step > s.num
                  ? "text-teal-ink"
                  : "text-faint hover:text-soft"
              }`}
            >
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                  step === s.num
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : step > s.num
                    ? "bg-positive/20 text-positive border border-positive/30"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {idx < 5 && <div className="h-px w-4 sm:w-6 bg-secondary mx-1" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Appliance Checklist (9 Categories) */}
      {step === 1 && (
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 backdrop-blur-2xl space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-foreground">1. Appliance Checklist</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select your household devices across nine categories. Pre-checked items reflect H-1024 baseline.
              </p>
            </div>
            <Link href="/citizen/scan">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-positive/30 bg-positive/10 hover:bg-positive/20 text-positive text-xs font-semibold rounded-xl"
              >
                <Scan className="h-4 w-4 text-positive" />
                <span>Barcode Scan Onboarding</span>
              </Button>
            </Link>
          </div>

          <div className="space-y-6">
            {categories.map((cat) => {
              const items = checklist.filter((c) => c.category === cat);
              return (
                <div key={cat} className="space-y-2.5">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-positive/90 block">
                    {cat}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                          item.selected
                            ? "bg-positive/[0.08] border-positive/40 text-foreground"
                            : "bg-muted/60 border-border/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleChecklistItem(item.id)}
                          className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                        >
                          <div
                            className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                              item.selected
                                ? "bg-primary border-positive text-primary-foreground"
                                : "border-border-strong"
                            }`}
                          >
                            {item.selected && <Check className="h-3 w-3" />}
                          </div>
                          <span className="font-medium truncate">{item.name}</span>
                        </button>

                        {item.selected && (
                          <div className="flex items-center gap-1.5 ml-2 bg-inset px-2 py-0.5 rounded-lg border border-border shrink-0 font-mono">
                            <button
                              type="button"
                              onClick={() => updateItemCount(item.id, -1)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold text-positive px-1">
                              {item.count}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItemCount(item.id, 1)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <SkipRow
              onSkip={() => setStep(2)}
              onLater={() => setStep(2)}
              label="Skip checklist and use default H-1024 inventory"
            />
            <Button
              onClick={() => setStep(2)}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-10 px-6 gap-2 rounded-xl shadow-lg shadow-primary/10"
            >
              <span>Continue to Progressive Details</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Progressive Appliance Details */}
      {step === 2 && (
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 backdrop-blur-2xl space-y-6 shadow-2xl">
          <div className="pb-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">2. Progressive Appliance Details</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specific appliance parameters improve disaggregation accuracy. Fallback catalogue estimates apply when unknown.
            </p>
          </div>

          {dontKnowNote && (
            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-ink flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0 text-sky-ink" />
              <span>{dontKnowNote}</span>
            </div>
          )}

          {/* Cards per appliance (Matching §3.2) */}
          <div className="space-y-4">
            {/* Air Conditioner */}
            <div className="p-5 rounded-2xl bg-muted/60 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AirVent className="h-4 w-4 text-amber-ink" />
                  <span>Air Conditioner (Primary Cooling Load)</span>
                </span>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-ink border border-amber-500/30">
                  1.5 Ton · 3★ Split
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-faint block text-2xs">Tonnage</span>
                  <span className="font-mono text-foreground">1.5 Ton</span>
                </div>
                <div>
                  <span className="text-faint block text-2xs">BEE Star</span>
                  <span className="font-mono text-foreground">3 Star</span>
                </div>
                <div>
                  <span className="text-faint block text-2xs">Daily Hours</span>
                  <span className="font-mono text-positive font-bold">6 hours/day</span>
                </div>
                <div>
                  <span className="text-faint block text-2xs">Inverter Tech</span>
                  <span className="font-mono text-foreground">Non-Inverter</span>
                </div>
              </div>
              <SkipRow
                onDontKnow={() =>
                  setDontKnowNote(
                    "No problem. SAVERA can estimate AC load using appliance characteristics and your consumption history."
                  )
                }
                onSkip={() => {}}
                onLater={() => {}}
              />
            </div>

            {/* Refrigerator */}
            <div className="p-5 rounded-2xl bg-muted/60 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Refrigerator</span>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-positive/20 text-positive border border-positive/30">
                  260 L Double Door
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-faint block text-2xs font-sans">Capacity</span>
                  <span>260 Litres</span>
                </div>
                <div>
                  <span className="text-faint block text-2xs font-sans">Rating</span>
                  <span>3 Star</span>
                </div>
                <div>
                  <span className="text-faint block text-2xs font-sans">Age</span>
                  <span>5 years</span>
                </div>
                <div>
                  <span className="text-faint block text-2xs font-sans">Door Type</span>
                  <span>Double door</span>
                </div>
              </div>
              <SkipRow
                onDontKnow={() =>
                  setDontKnowNote(
                    "No problem. SAVERA uses standard 260 L 3-star annual thermal baseline."
                  )
                }
              />
            </div>

            {/* Geyser (Set up later sample) */}
            <div className="p-5 rounded-2xl bg-muted/60 border border-sky-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Storage Geyser</span>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-ink border border-sky-500/30">
                  ⏳ Set up later
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Capacity, star rating, and winter operating minutes deferred for later configuration.
              </p>
              <SkipRow
                onDontKnow={() =>
                  setDontKnowNote(
                    "Geyser flagged for later setup. Completing it will raise profile confidence to High."
                  )
                }
              />
            </div>

            {/* Washing Machine (Partial sample) */}
            <div className="p-5 rounded-2xl bg-muted/60 border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">Washing Machine</span>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-ink border border-amber-500/30">
                  ⚠️ Partial detail
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-faint block text-2xs">Type</span>
                  <span className="font-mono text-foreground">Top load</span>
                </div>
                <div>
                  <span className="text-faint block text-2xs">Capacity</span>
                  <span className="text-amber-ink font-mono">Don&apos;t know (estimated 6.5 kg)</span>
                </div>
                <div>
                  <span className="text-faint block text-2xs">Cycles</span>
                  <span className="font-mono text-foreground">4 loads/week</span>
                </div>
              </div>
              <SkipRow
                onDontKnow={() =>
                  setDontKnowNote(
                    "Standard 6.5 kg top load catalogue default applied automatically."
                  )
                }
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              className="text-xs text-soft"
            >
              &larr; Back to Checklist
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-10 px-6 gap-2 rounded-xl shadow-lg shadow-primary/10"
            >
              <span>Continue to Status Summary</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Status Checklist */}
      {step === 3 && (
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 backdrop-blur-2xl space-y-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-foreground">3. Appliance Status Checklist</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Summary: 9 of 12 appliances complete · 78 % detail.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-positive bg-positive/10 border border-positive/20 px-3 py-1 rounded-full">
              78% Profile Detail
            </span>
          </div>

          <div className="divide-y divide-border">
            {[
              { name: "Air conditioner", level: "High", status: "✅ Complete", statusColor: "text-positive" },
              { name: "Ceiling fan (4)", level: "High", status: "✅ Complete", statusColor: "text-positive" },
              { name: "LED bulb (8) & Tube light (2)", level: "High", status: "✅ Complete", statusColor: "text-positive" },
              { name: "Refrigerator", level: "High", status: "✅ Complete", statusColor: "text-positive" },
              { name: "Television", level: "Medium", status: "✅ Complete", statusColor: "text-positive" },
              { name: "Kitchen (microwave, mixer)", level: "High", status: "✅ Complete", statusColor: "text-positive" },
              { name: "Iron & Router & Laptop", level: "Medium", status: "✅ Complete", statusColor: "text-positive" },
              { name: "Washing machine", level: "Medium", status: "⚠️ Partial", statusColor: "text-amber-ink" },
              { name: "Storage Geyser", level: "Low", status: "⏳ Set up later", statusColor: "text-sky-ink" },
            ].map((app, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{app.name}</span>
                <div className="flex items-center gap-6">
                  <span className="text-faint font-mono text-xs">Detail: {app.level}</span>
                  <span className={`font-mono font-semibold ${app.statusColor}`}>{app.status}</span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-positive hover:text-positive text-xs underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(2)}
              className="text-xs text-soft"
            >
              &larr; Back to Details
            </Button>
            <Button
              onClick={() => setStep(4)}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-10 px-6 gap-2 rounded-xl shadow-lg shadow-primary/10"
            >
              <span>Connect Electricity History</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Connect Current Bill (Simulated OCR + Manual) */}
      {step === 4 && (
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 backdrop-blur-2xl space-y-6 shadow-2xl">
          <div className="pb-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">4. Connect Your Electricity History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload or photograph your latest electricity bill, or enter the readings manually.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Box (real file picker → simulated OCR) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-positive uppercase tracking-wider">
                  Option A: Upload or photograph your bill
                </span>
                <LabelChip kind="simulated" label="Simulated OCR" size="sm" />
              </div>

              <BillDropzone
                stream="electricity"
                scanDurationMs={2400}
                onExtracted={handleBillExtracted}
              />

              {ocrSaved && (
                <div className="p-4 rounded-2xl bg-positive/10 border border-positive/30 space-y-3 text-xs animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-positive flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Extracted via Simulated OCR</span>
                    </span>
                    <LabelChip kind="measured" size="sm" />
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    Check each field against your bill and edit anything that looks off before saving.
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="ocr-units" className="block text-2xs font-medium text-soft mb-1">
                        Units billed (kWh)
                      </label>
                      <Input
                        id="ocr-units"
                        type="number"
                        inputMode="numeric"
                        value={billUnits}
                        onChange={(e) => setBillUnits(e.target.value)}
                        className="bg-card border-border text-xs text-foreground h-9 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label htmlFor="ocr-amount" className="block text-2xs font-medium text-soft mb-1">
                        Bill amount (₹)
                      </label>
                      <Input
                        id="ocr-amount"
                        type="number"
                        inputMode="numeric"
                        value={billAmount}
                        onChange={(e) => setBillAmount(e.target.value)}
                        className="bg-card border-border text-xs text-foreground h-9 font-mono font-bold"
                      />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="ocr-period" className="block text-2xs font-medium text-soft mb-1">
                        Billing period
                      </label>
                      <Input
                        id="ocr-period"
                        type="text"
                        value={billingPeriod}
                        onChange={(e) => setBillingPeriod(e.target.value)}
                        className="bg-card border-border text-xs text-foreground h-9"
                      />
                    </div>
                    <div>
                      <label htmlFor="ocr-bill-date" className="block text-2xs font-medium text-soft mb-1">
                        Bill date
                      </label>
                      <Input
                        id="ocr-bill-date"
                        type="text"
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        className="bg-card border-border text-xs text-foreground h-9"
                      />
                    </div>
                    <div>
                      <label htmlFor="ocr-category" className="block text-2xs font-medium text-soft mb-1">
                        Consumer category
                      </label>
                      <Input
                        id="ocr-category"
                        type="text"
                        value={billCategory}
                        onChange={(e) => setBillCategory(e.target.value)}
                        className="bg-card border-border text-xs text-foreground h-9"
                      />
                    </div>
                    <div>
                      <label htmlFor="ocr-meter-start" className="block text-2xs font-medium text-soft mb-1">
                        Meter start
                      </label>
                      <Input
                        id="ocr-meter-start"
                        type="number"
                        inputMode="numeric"
                        value={meterStart}
                        onChange={(e) => setMeterStart(e.target.value)}
                        className="bg-card border-border text-xs text-foreground h-9 font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="ocr-meter-end" className="block text-2xs font-medium text-soft mb-1">
                        Meter end
                      </label>
                      <Input
                        id="ocr-meter-end"
                        type="number"
                        inputMode="numeric"
                        value={meterEnd}
                        onChange={(e) => setMeterEnd(e.target.value)}
                        className="bg-card border-border text-xs text-foreground h-9 font-mono"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSaveBillAndContinue}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-9 mt-1"
                  >
                    Looks right — Save bill
                  </Button>
                </div>
              )}
            </div>

            {/* Manual Entry Box */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider block">
                Option B: Enter Manually
              </span>

              <div className="p-5 rounded-2xl bg-muted/60 border border-border space-y-3">
                <div>
                  <label className="block text-xs font-medium text-soft mb-1">
                    Units (kWh)
                  </label>
                  <Input
                    type="number"
                    value={billUnits}
                    onChange={(e) => setBillUnits(e.target.value)}
                    className="bg-muted border-border text-xs text-foreground h-9 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-soft mb-1">
                      Billing Period
                    </label>
                    <Input
                      type="text"
                      value={billingPeriod}
                      onChange={(e) => setBillingPeriod(e.target.value)}
                      className="bg-muted border-border text-xs text-foreground h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-soft mb-1">
                      Amount (₹ optional)
                    </label>
                    <Input
                      type="number"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      className="bg-muted border-border text-xs text-foreground h-9 font-mono"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveBillAndContinue}
                  className="w-full bg-secondary hover:bg-secondary text-foreground font-medium text-xs h-9 mt-2"
                >
                  Save Bill Manually
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <SkipRow
              onSkip={() => setStep(5)}
              onLater={() => setStep(5)}
              label="Skip current bill — keep the Sep 2026 demo bill (390 kWh)"
            />
            <Button
              onClick={() => setStep(5)}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-10 px-6 gap-2 rounded-xl shadow-lg shadow-primary/10"
            >
              <span>Continue to Previous Bills</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Previous Bills */}
      {step === 5 && (
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 backdrop-blur-2xl space-y-6 shadow-2xl">
          <div className="pb-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">5. Upload Previous Bills</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload your previous electricity bills to improve your baseline. With 6+ bills SAVERA builds seasonal baselines (Summer / Normal / Winter).
            </p>
          </div>

          <div>
            <span id="history-horizon-label" className="block text-xs font-semibold text-foreground mb-2">
              Quick Pick History Horizon
            </span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="history-horizon-label">
              {[1, 2, 3, 6, 12].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  role="radio"
                  aria-checked={previousMonthsCount === cnt}
                  onClick={() => setPreviousMonthsCount(cnt)}
                  className={`py-2 px-4 rounded-xl text-xs font-mono font-bold transition-all ${
                    previousMonthsCount === cnt
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                      : "bg-muted border border-border text-soft hover:bg-secondary"
                  }`}
                >
                  {cnt} Month{cnt > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          <BillDropzone
            multiple
            maxFiles={MAX_PREVIOUS_BILLS}
            stream="electricity"
            scanDurationMs={1100}
            allowSample={false}
            title="Upload previous bills (select several)"
            hint="Choose up to 12 PDFs or photos at once"
            onExtracted={handlePreviousBillExtracted}
          />

          <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground" aria-live="polite">
                {previousBills.length} month{previousBills.length === 1 ? "" : "s"} attached
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {previousBills.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearPreviousBills}
                    className="h-8 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5" />
                    Clear
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImportSeededBills}
                  className="h-8 gap-1.5 px-3 text-xs"
                >
                  <Sparkles className="size-3.5 text-positive" />
                  Import {importCount} month{importCount === 1 ? "" : "s"} instantly (simulated)
                </Button>
              </div>
            </div>

            {previousBills.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No previous bills attached yet. Pick files above, or import the seeded history for this
                household instantly.
              </p>
            ) : (
              <ul className="divide-y divide-border text-xs">
                {previousBills.map((row) => (
                  <li
                    key={row.month}
                    className="py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="size-3.5 shrink-0 text-positive" />
                      <span className="font-mono text-soft">{monthLabel(row.month)}</span>
                      {row.fileName && (
                        <span className="max-w-[9rem] truncate font-mono text-2xs text-faint sm:max-w-[14rem]">
                          {row.fileName}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-foreground">
                        {formatKwh(row.kwh)} · {formatINR(row.amount)}
                      </span>
                      {row.source === "upload" ? (
                        <LabelChip kind="simulated" label="Simulated OCR" size="sm" />
                      ) : (
                        <LabelChip kind="measured" size="sm" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {previousBillCandidates.length < MAX_PREVIOUS_BILLS && (
              <p className="text-2xs text-faint">
                {previousBillCandidates.length} previous months are on file for this household (plus the
                current bill).
              </p>
            )}
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(6)}
              className="text-xs text-soft"
            >
              Skip — build baseline from current data
            </Button>
            <Button
              onClick={() => setStep(6)}
              className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-10 px-6 gap-2 rounded-xl shadow-lg shadow-primary/10"
            >
              <span>Continue with Available Data</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 6: Baseline Created */}
      {step === 6 && (
        <div className="rounded-3xl border border-positive/30 bg-positive/[0.04] p-6 sm:p-8 backdrop-blur-2xl space-y-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-positive/20 border border-positive/30 flex items-center justify-center text-positive shadow-inner">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-foreground">Your Baseline is Ready</h2>
              <p className="text-xs text-positive font-medium">
                Personalised baseline established from {seededBillCount} bills and disaggregated appliance profile.
              </p>
            </div>
          </div>

          {/* Baseline Details Card matching §3.6 */}
          <div className="p-6 rounded-2xl bg-inset border border-border space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-mono block">Baseline Type</span>
                <span className="text-base font-bold text-foreground">
                  Personalised Seasonal Baseline ({seededBillCount} bills)
                </span>
              </div>
              <EstimatedChip confidence="Medium" inputs={[`${seededBillCount} bills`, "78% appliance detail"]} />
            </div>

            <div className="p-4 rounded-xl bg-muted/60 border border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-2xs text-faint uppercase font-mono block">September Normal Band</span>
                <span className="text-xl font-bold font-display text-positive">320 – 350 kWh</span>
              </div>
              <div>
                <span className="text-2xs text-faint uppercase font-mono block">Current Billed Reading</span>
                <span className="text-xl font-bold font-display text-amber-ink">390 kWh (Above Normal)</span>
              </div>
              <div>
                <span className="text-2xs text-faint uppercase font-mono block">Ward 24 Peer Average</span>
                <span className="text-xl font-bold font-display text-soft">340 kWh</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1.5 pt-2">
              <span className="font-semibold text-foreground block">Inputs &amp; Calibrations:</span>
              <p>• {seededBillCount} historical bills analyzed with summer and winter seasonality adjustments</p>
              <p>• Appliance disaggregation estimate: ~365 kWh with 25 kWh unallocated margin</p>
              <p>• What would raise confidence: Complete geyser and washing machine details (confidence &rarr; High at &ge;80% detail)</p>
            </div>
          </div>

          {/* Action CTAs matching §3.6 */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={handleFinalBaselineComplete}
              className="w-full sm:flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-11 gap-2 rounded-xl shadow-xl shadow-primary/10"
            >
              <span>Open Electricity Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Link href="/citizen/scan" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full border-border-strong bg-muted hover:bg-secondary text-xs text-foreground h-11 px-5 rounded-xl gap-2"
              >
                <Scan className="h-4 w-4 text-positive" />
                <span>Scan an Appliance</span>
              </Button>
            </Link>

            <Link href="/citizen" className="w-full sm:w-auto">
              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground h-11 px-4 rounded-xl"
              >
                Back to Home Setup
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
