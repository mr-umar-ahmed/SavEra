"use client";

import { useState } from "react";
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
  UploadCloud,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { SkipRow } from "@/components/savera/SkipRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCurrentHousehold } from "@/lib/api/hooks";
import { useDataStore } from "@/stores/data";

interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  count: number;
  selected: boolean;
}

export default function ElectricitySetupWizard() {
  const router = useRouter();
  const { household } = useCurrentHousehold();
  const setSectionStatus = useDataStore((s) => s.setSectionStatus);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

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

  // Step 4 Bill OCR state
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrSaved, setOcrSaved] = useState(false);
  const [billUnits, setBillUnits] = useState("390");
  const [billingPeriod, setBillingPeriod] = useState("22 Aug – 21 Sep 2026");
  const [billDate, setBillDate] = useState("23 Sep 2026");
  const [meterStart, setMeterStart] = useState("14210");
  const [meterEnd, setMeterEnd] = useState("14600");
  const [billCategory, setBillCategory] = useState("Domestic (LT-2)");
  const [billAmount, setBillAmount] = useState("3120");

  // Step 5 Previous bills months selection
  const [previousMonthsCount, setPreviousMonthsCount] = useState<number>(12);

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

  const handleSimulateOcr = () => {
    setOcrProcessing(true);
    setTimeout(() => {
      setOcrProcessing(false);
      setOcrSaved(true);
      toast.success("Bill added — 390 kWh for Sep 2026.");
    }, 1400);
  };

  const handleSaveBillAndContinue = () => {
    toast.success("Bill added — 390 kWh for Sep 2026.");
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
              Upload your recent GESCOM power bill or enter reading parameters manually.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Box (Simulated OCR) */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-positive uppercase tracking-wider block">
                Option A: Bill Upload (Simulated OCR)
              </span>

              <div
                onClick={handleSimulateOcr}
                className="border-2 border-dashed border-border-strong hover:border-positive/50 rounded-2xl p-6 text-center cursor-pointer bg-muted/60 hover:bg-positive/[0.02] transition-all"
              >
                {ocrProcessing ? (
                  <div className="py-6 flex flex-col items-center">
                    <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
                    <span className="text-xs font-bold text-foreground">Processing Simulated Bill OCR...</span>
                    <span className="text-xs text-faint mt-1">Reading GESCOM LT-2 format</span>
                  </div>
                ) : (
                  <div className="py-4 flex flex-col items-center">
                    <div className="h-11 w-11 rounded-2xl bg-positive/10 border border-positive/20 flex items-center justify-center text-positive mb-3 shadow-inner">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      Drop Electricity Bill (PDF / JPG / PNG)
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Simulates instant extraction of 390 kWh for September 2026
                    </span>
                  </div>
                )}
              </div>

              {ocrSaved && (
                <div className="p-4 rounded-2xl bg-positive/10 border border-positive/30 space-y-3 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-positive flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Extracted via Simulated OCR</span>
                    </span>
                    <span className="text-2xs font-mono px-2 py-0.5 rounded bg-positive/20 text-positive">
                      Measured
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                    <div>
                      <span className="text-faint block font-sans">Units Billed:</span>
                      <span className="font-bold text-foreground text-sm">{billUnits} kWh</span>
                    </div>
                    <div>
                      <span className="text-faint block font-sans">Bill Amount:</span>
                      <span className="font-bold text-foreground text-sm">₹{billAmount}</span>
                    </div>
                    <div>
                      <span className="text-faint block font-sans">Billing Period:</span>
                      <span className="text-soft">{billingPeriod}</span>
                    </div>
                    <div>
                      <span className="text-faint block font-sans">Meter Readings:</span>
                      <span className="text-soft">{meterStart} &rarr; {meterEnd}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSaveBillAndContinue}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs h-8 mt-1"
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
              label="Skip current bill and use 390 kWh demo fixture"
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
            <label className="block text-xs font-semibold text-foreground mb-2">
              Quick Pick History Horizon
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 6, 12].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
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

          <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Seeded Historical Records ({previousMonthsCount} months imported)
            </span>
            <div className="divide-y divide-border text-xs font-mono">
              <div className="py-2 flex items-center justify-between">
                <span className="text-soft">August 2026 (Previous Month)</span>
                <span className="font-bold text-positive">350 kWh · ₹2,850</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-soft">July 2026</span>
                <span className="text-soft">362 kWh · ₹2,940</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-soft">June 2026</span>
                <span className="text-soft">378 kWh · ₹3,050</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-soft">May 2026 (Peak Summer)</span>
                <span className="text-soft">415 kWh · ₹3,380</span>
              </div>
            </div>
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
                Personalised baseline established from 12 bills and disaggregated appliance profile.
              </p>
            </div>
          </div>

          {/* Baseline Details Card matching §3.6 */}
          <div className="p-6 rounded-2xl bg-inset border border-border space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-mono block">Baseline Type</span>
                <span className="text-base font-bold text-foreground">
                  Personalised Seasonal Baseline (12 bills)
                </span>
              </div>
              <EstimatedChip confidence="Medium" inputs={["12 bills", "78% appliance detail"]} />
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
              <p>• 12 historical bills analyzed with summer and winter seasonality adjustments</p>
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
