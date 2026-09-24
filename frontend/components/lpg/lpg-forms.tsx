"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { describeError, isApiError } from "@/lib/api";
import { useApi } from "@/lib/api.client";
import { closeLpgCycle, startLpgCycle } from "@/lib/endpoints";
import { todayApiDate } from "@/lib/format";

/** The three domestic/commercial sizes sold in India. */
export const CYLINDER_SIZES = [
  { kg: "14.2", label: "14.2 kg — domestic" },
  { kg: "5", label: "5 kg — small / portable" },
  { kg: "19", label: "19 kg — commercial" },
] as const;

const startSchema = z.object({
  start_date: z.string().min(1, "Pick the day you connected it"),
  cylinder_kg: z.string().min(1),
});

type StartValues = z.infer<typeof startSchema>;

/**
 * Start a new cylinder. The backend allows only one open cylinder at a time and
 * answers 409 otherwise, which is surfaced as plain advice rather than an error.
 */
export function StartCylinderForm({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const call = useApi();
  const today = todayApiDate();
  const form = useForm<StartValues>({
    resolver: zodResolver(startSchema),
    defaultValues: { start_date: today, cylinder_kg: "14.2" },
  });
  const { errors, isSubmitting } = form.formState;

  async function save(values: StartValues) {
    try {
      await call((ctx) =>
        startLpgCycle(
          { start_date: values.start_date, cylinder_kg: Number(values.cylinder_kg) },
          ctx,
        ),
      );
      toast.success("Cylinder started");
      router.refresh();
      onSaved?.();
    } catch (err) {
      if (isApiError(err) && err.isConflict) {
        toast.error("You already have a cylinder in use — mark it finished first.");
        return;
      }
      toast.error(describeError(err, "Could not start that cylinder."));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(save)} noValidate>
      <FieldGroup>
        <Field data-invalid={errors.start_date ? true : undefined}>
          <FieldLabel htmlFor="start_date">Day you connected it</FieldLabel>
          <Input
            id="start_date"
            type="date"
            max={today}
            className="touch-target"
            aria-invalid={errors.start_date ? true : undefined}
            {...form.register("start_date")}
          />
          <FieldError errors={errors.start_date ? [errors.start_date] : undefined} />
        </Field>

        <Field>
          <FieldLabel htmlFor="cylinder_kg">Cylinder size</FieldLabel>
          <Controller
            control={form.control}
            name="cylinder_kg"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="cylinder_kg"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  className="w-full touch-target"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CYLINDER_SIZES.map((size) => (
                    <SelectItem key={size.kg} value={size.kg}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldDescription>Most homes use the 14.2 kg domestic cylinder.</FieldDescription>
        </Field>

        <Button type="submit" size="lg" className="w-full touch-target" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          Start tracking
        </Button>
      </FieldGroup>
    </form>
  );
}

const closeSchema = z.object({ end_date: z.string().min(1, "Pick the day it ran out") });

type CloseValues = z.infer<typeof closeSchema>;

/**
 * Mark the open cylinder finished. The backend computes and stores the burn
 * rate from the dates, which is what every later prediction averages.
 */
export function CloseCylinderForm({
  cycleId,
  startDate,
  onSaved,
}: {
  cycleId: string;
  startDate: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const call = useApi();
  const today = todayApiDate();
  const form = useForm<CloseValues>({
    resolver: zodResolver(closeSchema),
    defaultValues: { end_date: today },
  });
  const { errors, isSubmitting } = form.formState;

  async function save(values: CloseValues) {
    try {
      await call((ctx) => closeLpgCycle(cycleId, values.end_date, ctx));
      toast.success("Cylinder marked as finished");
      router.refresh();
      onSaved?.();
    } catch (err) {
      toast.error(describeError(err, "Could not close that cylinder."));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(save)} noValidate>
      <FieldGroup>
        <Field data-invalid={errors.end_date ? true : undefined}>
          <FieldLabel htmlFor="end_date">Day it ran out</FieldLabel>
          <Input
            id="end_date"
            type="date"
            min={startDate}
            max={today}
            className="touch-target"
            aria-invalid={errors.end_date ? true : undefined}
            {...form.register("end_date")}
          />
          <FieldDescription>
            This is what tells us how long a cylinder lasts in your home.
          </FieldDescription>
          <FieldError errors={errors.end_date ? [errors.end_date] : undefined} />
        </Field>

        <Button type="submit" size="lg" className="w-full touch-target" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          Mark as finished
        </Button>
      </FieldGroup>
    </form>
  );
}
