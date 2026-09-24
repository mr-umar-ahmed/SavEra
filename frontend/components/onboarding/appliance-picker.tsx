"use client";

import { Check, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApplianceInput, ApplianceType, ApplianceTypeInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Selection = Record<string, ApplianceInput>;

/** A selected appliance at its catalog defaults. */
export function defaultsFor(info: ApplianceTypeInfo): ApplianceInput {
  return {
    type: info.type,
    count: 1,
    daily_hours: info.default_hours,
    star_rating: info.has_star_rating ? 3 : null,
  };
}

/** The list the API expects, in catalog order so the payload is stable. */
export function toPayload(catalog: ApplianceTypeInfo[], selection: Selection): ApplianceInput[] {
  return catalog.filter((info) => selection[info.type]).map((info) => selection[info.type]!);
}

export interface AppliancePickerProps {
  catalog: ApplianceTypeInfo[];
  selection: Selection;
  onChange: (next: Selection) => void;
}

/**
 * Tap a chip to add an appliance, then adjust how many and how long it runs.
 *
 * The numbers this feeds are *estimates from BEE star-rating wattages* and the
 * hours you enter — the label on screen says so, because nothing here measures
 * anything.
 */
export function AppliancePicker({ catalog, selection, onChange }: AppliancePickerProps) {
  function toggle(info: ApplianceTypeInfo) {
    const next = { ...selection };
    if (next[info.type]) delete next[info.type];
    else next[info.type] = defaultsFor(info);
    onChange(next);
  }

  function update(type: ApplianceType, patch: Partial<ApplianceInput>) {
    const current = selection[type];
    if (!current) return;
    onChange({ ...selection, [type]: { ...current, ...patch } });
  }

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2">
        {catalog.map((info) => {
          const selected = Boolean(selection[info.type]);
          return (
            <li key={info.type}>
              <button
                type="button"
                onClick={() => toggle(info)}
                aria-pressed={selected}
                className={cn(
                  "focus-ring flex touch-target items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {selected ? <Check className="size-4" aria-hidden /> : null}
                {info.label}
              </button>
            </li>
          );
        })}
      </ul>

      {catalog
        .filter((info) => selection[info.type])
        .map((info) => {
          const value = selection[info.type]!;
          return (
            <div key={info.type} className="rounded-xl border border-border bg-card p-3">
              <p className="mb-3 font-medium">{info.label}</p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`count-${info.type}`}>How many</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="touch-target"
                      aria-label={`One fewer ${info.label}`}
                      disabled={value.count <= 1}
                      onClick={() => update(info.type, { count: Math.max(1, value.count - 1) })}
                    >
                      <Minus aria-hidden />
                    </Button>
                    <Input
                      id={`count-${info.type}`}
                      readOnly
                      value={value.count}
                      className="w-12 touch-target text-center tabular-nums"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="touch-target"
                      aria-label={`One more ${info.label}`}
                      disabled={value.count >= 10}
                      onClick={() => update(info.type, { count: Math.min(10, value.count + 1) })}
                    >
                      <Plus aria-hidden />
                    </Button>
                  </div>
                </div>

                {info.always_on ? (
                  <p className="pb-2 text-sm text-muted-foreground">Runs all day, every day.</p>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor={`hours-${info.type}`}>Hours a day</Label>
                    <Input
                      id={`hours-${info.type}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={24}
                      step="0.5"
                      value={value.daily_hours}
                      onChange={(event) =>
                        update(info.type, {
                          daily_hours: Math.min(24, Math.max(0, Number(event.target.value) || 0)),
                        })
                      }
                      className="w-24 touch-target tabular-nums"
                    />
                  </div>
                )}

                {info.has_star_rating ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={`star-${info.type}`}>Star rating</Label>
                    <Select
                      value={String(value.star_rating ?? 3)}
                      onValueChange={(next) => update(info.type, { star_rating: Number(next) })}
                    >
                      <SelectTrigger id={`star-${info.type}`} className="w-28 touch-target">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <SelectItem key={star} value={String(star)}>
                            {star} star
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

      <p className="text-xs text-muted-foreground">
        We estimate each appliance from BEE star-rating wattages and the hours you enter — these
        are estimates, not measurements.
      </p>
    </div>
  );
}
