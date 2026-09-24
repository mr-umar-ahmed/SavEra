"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { describeError, isApiError } from "@/lib/api";
import { useApi } from "@/lib/api.client";
import { createElectricityReading } from "@/lib/endpoints";
import { todayApiDate } from "@/lib/format";
import type { ElectricityReadingInput, ReadingSource } from "@/lib/types";

const MAX_KWH = 5000;

/**
 * Every field is kept as the string the input gives us and converted once, on
 * submit. Coercing inside the schema would turn an empty box into 0 and show
 * the wrong message ("must be more than 0" instead of "enter the units").
 */
const schema = z
  .object({
    kwh: z.string().min(1, "Enter the units from your bill"),
    billing_period_start: z.string().min(1, "Pick the date the period started"),
    billing_period_end: z.string().min(1, "Pick the date the period ended"),
    billed_amount: z.string(),
  })
  .superRefine((values, ctx) => {
    const kwh = Number(values.kwh);
    if (!Number.isFinite(kwh) || kwh <= 0) {
      ctx.addIssue({ code: "custom", path: ["kwh"], message: "Units must be more than 0" });
    } else if (kwh > MAX_KWH) {
      ctx.addIssue({
        code: "custom",
        path: ["kwh"],
        message: `That is above the ${MAX_KWH} unit limit — please check the figure`,
      });
    }
    const amount = Number(values.billed_amount);
    if (values.billed_amount && (!Number.isFinite(amount) || amount < 0)) {
      ctx.addIssue({ code: "custom", path: ["billed_amount"], message: "Enter a valid amount" });
    }
    if (
      values.billing_period_start &&
      values.billing_period_end &&
      values.billing_period_end < values.billing_period_start
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["billing_period_end"],
        message: "The period must end on or after it starts",
      });
    }
  });

export type ElectricityFormValues = z.infer<typeof schema>;

const EMPTY: ElectricityFormValues = {
  kwh: "",
  billing_period_start: "",
  billing_period_end: "",
  billed_amount: "",
};

export interface ElectricityFormProps {
  /** Prefilled values — the OCR confirmation screen passes what it read. */
  initial?: Partial<ElectricityFormValues>;
  source?: ReadingSource;
  ocrJobId?: string;
  submitLabel?: string;
  onSaved?: () => void;
}

/**
 * Manual bill entry, and the same form the OCR confirmation screen submits.
 *
 * A period that overlaps a bill already saved comes back as 409; rather than
 * failing, the form says so and offers one explicit "replace it" action, which
 * resends with `overwrite=true`.
 */
export function ElectricityForm({
  initial,
  source = "manual",
  ocrJobId,
  submitLabel = "Save bill",
  onSaved,
}: ElectricityFormProps) {
  const router = useRouter();
  const call = useApi();
  const [conflict, setConflict] = useState(false);

  const form = useForm<ElectricityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...EMPTY, ...initial },
  });
  const { errors, isSubmitting } = form.formState;

  async function save(values: ElectricityFormValues, overwrite: boolean) {
    const body: ElectricityReadingInput = {
      kwh: Number(values.kwh),
      billing_period_start: values.billing_period_start,
      billing_period_end: values.billing_period_end,
      billed_amount: values.billed_amount ? Number(values.billed_amount) : null,
      source,
      ocr_job_id: ocrJobId ?? null,
    };
    try {
      await call((ctx) => createElectricityReading(body, { ...ctx, overwrite }));
      toast.success(overwrite ? "Bill replaced" : "Bill saved");
      setConflict(false);
      form.reset(EMPTY);
      router.refresh();
      onSaved?.();
    } catch (err) {
      if (isApiError(err) && err.isConflict) {
        setConflict(true);
        return;
      }
      toast.error(describeError(err, "Could not save that bill."));
    }
  }

  return (
    <form onSubmit={form.handleSubmit((values) => save(values, false))} noValidate>
      <FieldGroup>
        <Field data-invalid={errors.kwh ? true : undefined}>
          <FieldLabel htmlFor="kwh">Units used (kWh)</FieldLabel>
          <Input
            id="kwh"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="342"
            className="touch-target tabular-nums"
            aria-invalid={errors.kwh ? true : undefined}
            {...form.register("kwh")}
          />
          <FieldDescription>
            The &ldquo;units consumed&rdquo; figure on your bill, not the meter reading.
          </FieldDescription>
          <FieldError errors={errors.kwh ? [errors.kwh] : undefined} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={errors.billing_period_start ? true : undefined}>
            <FieldLabel htmlFor="billing_period_start">Period from</FieldLabel>
            <Input
              id="billing_period_start"
              type="date"
              max={todayApiDate()}
              className="touch-target"
              aria-invalid={errors.billing_period_start ? true : undefined}
              {...form.register("billing_period_start")}
            />
            <FieldError
              errors={errors.billing_period_start ? [errors.billing_period_start] : undefined}
            />
          </Field>
          <Field data-invalid={errors.billing_period_end ? true : undefined}>
            <FieldLabel htmlFor="billing_period_end">Period to</FieldLabel>
            <Input
              id="billing_period_end"
              type="date"
              max={todayApiDate()}
              className="touch-target"
              aria-invalid={errors.billing_period_end ? true : undefined}
              {...form.register("billing_period_end")}
            />
            <FieldError
              errors={errors.billing_period_end ? [errors.billing_period_end] : undefined}
            />
          </Field>
        </div>

        <Field data-invalid={errors.billed_amount ? true : undefined}>
          <FieldLabel htmlFor="billed_amount">Amount billed (optional)</FieldLabel>
          <Input
            id="billed_amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="2791"
            className="touch-target tabular-nums"
            aria-invalid={errors.billed_amount ? true : undefined}
            {...form.register("billed_amount")}
          />
          <FieldDescription>In rupees — the net amount payable.</FieldDescription>
          <FieldError errors={errors.billed_amount ? [errors.billed_amount] : undefined} />
        </Field>

        {conflict ? (
          <Alert variant="destructive">
            <AlertTitle>You already have a bill covering these dates</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              <p>Replacing it removes the old bill and keeps this one.</p>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="touch-target"
                disabled={isSubmitting}
                onClick={form.handleSubmit((values) => save(values, true))}
              >
                Replace the old bill
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" className="w-full touch-target" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
