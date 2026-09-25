"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Flame, Plus } from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataStore } from "@/stores/data";
import { newId } from "@/lib/ids";
import { toast } from "sonner";

export default function UpdateCylinderPage() {
  const router = useRouter();
  const addCylinder = useDataStore((s) => s.addCylinder);
  const finishCylinder = useDataStore((s) => s.finishCylinder);

  const [mode, setMode] = useState<"new" | "finish">("new");
  const [sizeKg, setSizeKg] = useState(14.2);
  const [startDate, setStartDate] = useState("2026-09-25");
  const [finishDate, setFinishDate] = useState("2026-09-25");

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    addCylinder({
      id: newId("cyl"),
      householdId: "H-1024",
      sizeKg,
      refillDate: startDate,
      startDate,
      provider: "Indane Gas",
      source: "manual",
    });
    toast.success("New cylinder registered and burn rate tracker reset!");
    router.push("/citizen/gas");
  };

  const handleMarkFinish = (e: React.FormEvent) => {
    e.preventDefault();
    finishCylinder("cyl-1024-active", finishDate);
    toast.success("Cylinder marked as finished. Historical cycle logged.");
    router.push("/citizen/gas");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Update Cylinder Status"
        subtitle="Log the arrival of a new cylinder or record the completion date of an empty cylinder."
        breadcrumbs={[
          { label: "LPG Dashboard", href: "/citizen/gas" },
          { label: "Update Cylinder" },
        ]}
        actions={
          <Link href="/citizen/gas">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-muted text-xs text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Button>
          </Link>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-6 backdrop-blur-xl space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`p-3 rounded-xl text-xs font-semibold border transition-all ${
              mode === "new"
                ? "bg-rose-500/15 border-rose-500/40 text-rose-ink"
                : "bg-muted border-border text-muted-foreground"
            }`}
          >
            Start New Cylinder
          </button>
          <button
            type="button"
            onClick={() => setMode("finish")}
            className={`p-3 rounded-xl text-xs font-semibold border transition-all ${
              mode === "finish"
                ? "bg-rose-500/15 border-rose-500/40 text-rose-ink"
                : "bg-muted border-border text-muted-foreground"
            }`}
          >
            Mark Current as Finished
          </button>
        </div>

        {mode === "new" ? (
          <form onSubmit={handleAddNew} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-soft mb-1.5">Cylinder Size (kg)</label>
              <div className="flex gap-2">
                {[14.2, 5.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSizeKg(s)}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-medium border ${
                      sizeKg === s ? "bg-primary text-primary-foreground font-bold" : "bg-muted border-border text-soft"
                    }`}
                  >
                    {s} kg
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-soft mb-1.5">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-muted border-border text-foreground text-xs"
                required
              />
            </div>

            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-9">
              <span>Start Tracking New Cylinder</span>
              <CheckCircle2 className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMarkFinish} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-soft mb-1.5">Date Emptied / Finished</label>
              <Input
                type="date"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
                className="bg-muted border-border text-foreground text-xs"
                required
              />
            </div>

            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-9">
              <span>Confirm Completion</span>
              <CheckCircle2 className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
