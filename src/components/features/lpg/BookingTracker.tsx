"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, PackageCheck, Truck } from "lucide-react";
import { toast } from "sonner";

import type { IsoDate, LpgBooking, TimelineStep } from "@/types";
import { LPG_BOOKING_STATUS_LABEL } from "@/types";
import { BOOKING_FLOW, lpgApi } from "@/lib/api/lpg";
import { DemoControl } from "@/components/savera/DemoControl";
import { LabelChip } from "@/components/savera/LabelChip";
import { StatusTimeline } from "@/components/savera/StatusTimeline";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";

const STEP_NOTE: Record<LpgBooking["status"], string> = {
  requested: "Request recorded (simulated).",
  confirmed: "Distributor confirmed the refill (simulated).",
  out_for_delivery: "Delivery partner is on the way (simulated).",
  delivered: "Cylinder delivered (simulated).",
};

export function bookingSteps(b: LpgBooking): TimelineStep[] {
  const idx = BOOKING_FLOW.indexOf(b.status);
  return BOOKING_FLOW.map((status, i) => {
    const at = b.history.find((h) => h.status === status)?.at;
    return {
      key: status,
      label: LPG_BOOKING_STATUS_LABEL[status],
      state: i < idx || b.status === "delivered" ? "done" : i === idx ? "active" : "pending",
      at,
      note: i <= idx ? STEP_NOTE[status] : undefined,
    };
  });
}

/**
 * Simulated LPG refill booking timeline (MASTER_PROMPT §9.5). `inUseSince` is the start date of
 * the cylinder in use: a delivery on or before it is already being tracked.
 */
export function BookingTracker({ booking, inUseSince }: { booking?: LpgBooking; inUseSince?: IsoDate }) {
  const [advancing, setAdvancing] = React.useState(false);

  if (!booking) {
    return (
      <section id="booking" className="glass scroll-mt-28 flex flex-col gap-3 rounded-2xl p-6">
        <p className="eyebrow flex items-center gap-2">
          <Truck className="size-3.5" aria-hidden="true" />
          Refill booking
        </p>
        <p className="text-soft text-sm">
          No refill booked yet. Use <strong className="text-foreground">Book Refill (simulated)</strong> to
          walk through the booking flow.
        </p>
        <LabelChip kind="simulated" size="sm" />
      </section>
    );
  }

  const delivered = booking.status === "delivered";
  const deliveredOn = booking.history.find((h) => h.status === "delivered")?.at.slice(0, 10);
  const alreadyTracked = delivered && !!inUseSince && !!deliveredOn && deliveredOn <= inUseSince;
  const advance = async () => {
    setAdvancing(true);
    const res = await lpgApi.advanceBooking(booking.id);
    setAdvancing(false);
    if (res.ok) toast.success(`Booking ${res.data.ref}: ${LPG_BOOKING_STATUS_LABEL[res.data.status]}`);
    else toast.error(res.error);
  };

  return (
    <section id="booking" className="glass scroll-mt-28 flex flex-col gap-4 rounded-2xl p-6" aria-labelledby="lpg-booking-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Truck className="size-3.5" aria-hidden="true" />
            Refill booking
          </p>
          <h2 id="lpg-booking-title" className="font-display text-foreground mt-2 text-xl font-bold">
            {booking.ref}
          </h2>
          <p className="text-muted-foreground text-xs">Updated {formatDateTime(booking.updatedAt)}</p>
        </div>
        <LabelChip kind="simulated" size="sm" />
      </div>

      <StatusTimeline steps={bookingSteps(booking)} compact />

      {alreadyTracked ? (
        <p className="bg-positive-soft border-positive/25 text-positive rounded-xl border px-4 py-3 text-sm font-semibold">
          Delivered {deliveredOn ? formatDate(deliveredOn) : ""} — this is the cylinder you are using now
          (started {formatDate(inUseSince)}).
        </p>
      ) : delivered ? (
        <Button asChild variant="positive" className="gap-2">
          <Link href="/citizen/gas/cylinder">
            <PackageCheck className="size-4" />
            Start tracking the delivered cylinder
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      ) : (
        <DemoControl
          label="Advance booking status"
          description={`Next: ${LPG_BOOKING_STATUS_LABEL[BOOKING_FLOW[BOOKING_FLOW.indexOf(booking.status) + 1]]}`}
          onClick={advance}
          loading={advancing}
          icon={Truck}
        />
      )}
    </section>
  );
}
