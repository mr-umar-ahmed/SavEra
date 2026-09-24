"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/api";
import { useApi } from "@/lib/api.client";
import { createWaterReading } from "@/lib/endpoints";
import { todayApiDate } from "@/lib/format";

const MAX_LITERS = 50_000;

const schema = z
  .object({
    liters: z.string().min(1, "Enter how many litres you used"),
    reading_date: z.string().min(1, "Pick the day"),
  })
  .superRefine((values, ctx) => {
    const liters = Number(values.liters);
    if (!Number.isFinite(liters) || liters <= 0) {
      ctx.addIssue({ code: "custom", path: ["liters"], message: "Litres must be more than 0" });
    } else if (liters > MAX_LITERS) {
      ctx.addIssue({
        code: "custom",
        path: ["liters"],
        message: "That looks too high for one day — please check the figure",
      });
    }
  });

export type WaterFormValues = z.infer<typeof schema>;

/**
 * A day's water use. Logging the same day again corrects it rather than
 * failing, and the toast says which of the two happened so nobody wonders
 * whether they just created a duplicate.
 */
export function WaterForm({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const call = useApi();
  const today = todayApiDate();

  const form = useForm<WaterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { liters: "", reading_date: today },
  });
  const { errors, isSubmitting } = form.formState;

  async function save(values: WaterFormValues) {
    try {
      const saved = await call((ctx) =>
        createWaterReading(
          { liters: Number(values.liters), reading_date: values.reading_date, source: "manual" },
          ctx,
        ),
      );
      toast.success(saved.replaced ? "Reading updated for that day" : "Water reading saved");
      form.reset({ liters: "", reading_date: today });
      router.refresh();
      onSaved?.();
    } catch (err) {
      toast.error(describeError(err, "Could not save that reading."));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(save)} noValidate>
      <FieldGroup>
        <Field data-invalid={errors.liters ? true : undefined}>
          <FieldLabel htmlFor="liters">Litres used</FieldLabel>
          <Input
            id="liters"
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            placeholder="400"
            autoFocus
            className="touch-target tabular-nums"
            aria-invalid={errors.liters ? true : undefined}
            {...form.register("liters")}
          />
          <FieldDescription>
            From your tank level, meter or tanker delivery — one figure for the whole day.
          </FieldDescription>
          <FieldError errors={errors.liters ? [errors.liters] : undefined} />
        </Field>

        <Field data-invalid={errors.reading_date ? true : undefined}>
          <FieldLabel htmlFor="reading_date">Day</FieldLabel>
          <Input
            id="reading_date"
            type="date"
            max={today}
            className="touch-target"
            aria-invalid={errors.reading_date ? true : undefined}
            {...form.register("reading_date")}
          />
          <FieldDescription>Logging a day twice replaces the earlier figure.</FieldDescription>
          <FieldError errors={errors.reading_date ? [errors.reading_date] : undefined} />
        </Field>

        <Button type="submit" size="lg" className="w-full touch-target" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          Save reading
        </Button>
      </FieldGroup>
    </form>
  );
}
