"use client";

import * as React from "react";
import { Flame, Leaf, ShieldAlert, Wrench } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const CHECK_ITEMS = [
  "Check the regulator, hose and connection for wear; replace hoses on the recommended schedule.",
  "Keep burners clean — a blue flame indicates efficient combustion.",
  "Turn the regulator off when the stove is not in use for long periods.",
];

const SAVE_ITEMS = [
  "Use lids, pressure cookers and flat-bottomed vessels; soak pulses before cooking.",
  "Match the flame size to the vessel and simmer on low.",
  "Avoid reheating the same dish repeatedly.",
];

/** Conservation & Safety Guidance (spec 03 §6). General guidance — never a fault diagnosis. */
export function SafetyGuidanceSheet({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-border border-b p-6">
          <p className="eyebrow">LPG</p>
          <SheetTitle className="font-display text-2xl font-extrabold">
            Conservation &amp; Safety Guidance
          </SheetTitle>
          <SheetDescription className="text-sm">
            Simple habits that keep your kitchen safe and make each cylinder last longer.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 p-6">
          <section className="border-tone-critical/30 bg-tone-critical/10 rounded-2xl border p-4">
            <h3 className="text-tone-critical flex items-center gap-2 text-sm font-bold">
              <ShieldAlert className="size-4" aria-hidden="true" />
              Safety first
            </h3>
            <p className="text-foreground mt-2 text-sm leading-relaxed">
              If you smell gas, turn off the regulator, open windows and doors, do not switch
              electrical appliances on or off, avoid any flame, and contact your distributor&apos;s
              emergency line.
            </p>
          </section>

          <GuidanceList icon={Wrench} title="Check and maintain" items={CHECK_ITEMS} />
          <GuidanceList icon={Leaf} title="Use less gas" items={SAVE_ITEMS} />

          <p className="text-muted-foreground border-border flex items-start gap-2 border-t pt-4 text-xs">
            <Flame className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Guidance is general. SAVERA does not detect leaks or faults.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function GuidanceList({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}) {
  return (
    <section>
      <h3 className="text-foreground flex items-center gap-2 text-sm font-bold">
        <Icon className="text-positive size-4" />
        {title}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="text-soft flex gap-2.5 text-sm leading-relaxed">
            <span className="bg-positive mt-2 size-1.5 shrink-0 rounded-full" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
