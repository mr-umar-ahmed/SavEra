"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  History,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/savera/PageHeader";
import { KpiCard } from "@/components/savera/KpiCard";
import { StatusBadge } from "@/components/savera/StatusBadge";
import { EstimatedChip } from "@/components/savera/EstimatedChip";
import { Button } from "@/components/ui/button";
import { useLpgAnalysis } from "@/lib/api/hooks";
import { useSessionStore } from "@/stores/session";
import { useDataStore } from "@/stores/data";
import { toast } from "sonner";

export default function CitizenLpgDashboardPage() {
  const user = useSessionStore((s) => s.user);
  const householdId = user?.householdId ?? "H-1024";
  const { analysis, bookings } = useLpgAnalysis(householdId);
  const upsertLpgBooking = useDataStore((s) => s.upsertLpgBooking);

  const [bookingInProgress, setBookingInProgress] = useState(false);

  const isAbnormal = householdId === "H-1088" || analysis?.status === "higher";

  const handleSimulatedBooking = () => {
    setBookingInProgress(true);
    setTimeout(() => {
      const now = new Date().toISOString();
      upsertLpgBooking({
        id: `bk-${Date.now()}`,
        householdId,
        ref: `LPG-${Math.floor(1000 + Math.random() * 9000)}`,
        status: "confirmed",
        createdAt: now,
        updatedAt: now,
        history: [{ status: "confirmed", at: now }],
        simulated: true,
      });
      setBookingInProgress(false);
      toast.success("Simulated LPG refill booked successfully! Confirmation #LPG-9924");
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="LPG Cylinder Management & Consumption Forecast"
        subtitle="Track domestic cylinder cycles, monitor daily burn rates, and receive automated refill reminders."
        badge={
          <div className="flex items-center gap-2">
            <EstimatedChip confidence="Medium" inputs={["18 days elapsed", "14.2 kg domestic", "historical median 25 days"]} />
            {isAbnormal ? (
              <StatusBadge status="warning" label="Abnormal Burn Rate" />
            ) : (
              <StatusBadge status="normal" label="Normal Cycle" />
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/citizen/gas/history">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-muted text-xs text-foreground">
                <History className="h-3.5 w-3.5" />
                <span>History</span>
              </Button>
            </Link>
            <Link href="/citizen/gas/cylinder">
              <Button size="sm" className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-semibold">
                <Plus className="h-3.5 w-3.5" />
                <span>Update Cylinder</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Current Cylinder"
          value="14.2 kg Domestic"
          subtitle="Started 18 days ago (07 Sep)"
          badge={<StatusBadge status="normal" label="Active" />}
        />

        <KpiCard
          title="Daily Consumption Rate"
          value="0.57 kg / day"
          subtitle="Typical range: 0.55 – 0.60 kg/day"
          badge={<EstimatedChip confidence="Medium" />}
        />

        <KpiCard
          title="Estimated Remaining Days"
          value="~7 Days"
          subtitle="Projected completion: 02 Oct 2026"
          badge={<EstimatedChip confidence="Medium" />}
        />

        <KpiCard
          title="Refill Prediction"
          value="02 Oct 2026"
          subtitle="Recommended booking: 28 Sep"
          badge={<StatusBadge status="warning" label="Order Soon" />}
        />
      </div>

      {/* Abnormal Warning Banner if applicable */}
      {isAbnormal && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-ink flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-ink shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-1">Higher LPG Consumption Rate Detected (0.78 kg/day)</span>
            <p className="text-soft">
              Possible cause — further inspection may be required: Check burner valve seals and regulator hose for possible leakage. Verify safety clips. If odor is detected, turn off regulator immediately.
            </p>
          </div>
        </div>
      )}

      {/* Refill Prediction & Booking Card */}
      <div className="p-6 rounded-2xl border border-border bg-card backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-rose-ink font-bold text-xs uppercase tracking-wider mb-1">
            <Flame className="h-4 w-4" />
            <span>Automated Refill Prediction</span>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Book Refill for Delivery by 02 October 2026</h3>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Based on your 0.57 kg/day burn rate over the last 18 days, reserving 4 days ahead prevents interruption during holiday transit windows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSimulatedBooking}
            disabled={bookingInProgress}
            className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-9 px-6 gap-2"
          >
            <span>{bookingInProgress ? "Booking Refill..." : "Book Refill (Simulated)"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Conservation & Safety Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-border bg-muted/60 space-y-2">
          <div className="flex items-center gap-2 text-positive font-bold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Thermal Efficiency Tips</span>
          </div>
          <ul className="space-y-1.5 text-xs text-soft">
            <li>· Always use broad-bottom pans that cover burner flames completely.</li>
            <li>· Covering pots with tight lids may reduce cooking gas consumption by up to 20%.</li>
            <li>· Pre-soak pulses and grains prior to pressure cooking.</li>
          </ul>
        </div>

        <div className="p-5 rounded-xl border border-border bg-muted/60 space-y-2">
          <div className="flex items-center gap-2 text-amber-ink font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            <span>Standard Safety Check</span>
          </div>
          <ul className="space-y-1.5 text-xs text-soft">
            <li>· Inspect orange Suraksha rubber tube every 6 months for surface micro-cracks.</li>
            <li>· Switch off regulator knob every night before retiring.</li>
            <li>· Keep cylinders upright in well-ventilated locations at ground level.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
