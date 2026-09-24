"use client";

import { Camera, Check, Keyboard, Plus } from "lucide-react";
import { useState } from "react";

import { BillUpload } from "@/components/bills/bill-upload";
import { EntrySheet } from "@/components/common/entry-sheet";
import { CloseCylinderForm, StartCylinderForm } from "@/components/lpg/lpg-forms";
import { ElectricityForm } from "@/components/readings/electricity-form";
import { WaterForm } from "@/components/readings/water-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost";

interface CommonProps {
  label?: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

function triggerClass(fullWidth?: boolean) {
  return fullWidth ? "w-full touch-target" : "touch-target";
}

/**
 * Add an electricity bill, either way round: photograph it and confirm what we
 * read, or type it in. Photo is the first tab because it is the shorter path
 * when it works, and it falls back into the same manual form when it does not.
 */
export function AddElectricityButton({
  label = "Add bill",
  variant = "default",
  fullWidth,
}: CommonProps) {
  const [open, setOpen] = useState(false);
  return (
    <EntrySheet
      open={open}
      onOpenChange={setOpen}
      title="Add an electricity bill"
      description="One bill per billing period."
      trigger={
        <Button size="lg" variant={variant} className={triggerClass(fullWidth)}>
          <Plus aria-hidden />
          {label}
        </Button>
      }
    >
      <Tabs defaultValue="photo">
        <TabsList className="w-full">
          <TabsTrigger value="photo" className="flex-1">
            <Camera aria-hidden />
            Photo
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">
            <Keyboard aria-hidden />
            Type it in
          </TabsTrigger>
        </TabsList>
        <TabsContent value="photo" className="pt-4">
          <BillUpload onSaved={() => setOpen(false)} />
        </TabsContent>
        <TabsContent value="manual" className="pt-4">
          <ElectricityForm onSaved={() => setOpen(false)} />
        </TabsContent>
      </Tabs>
    </EntrySheet>
  );
}

export function AddWaterButton({
  label = "Log water",
  variant = "default",
  fullWidth,
}: CommonProps) {
  const [open, setOpen] = useState(false);
  return (
    <EntrySheet
      open={open}
      onOpenChange={setOpen}
      title="Log a day's water"
      description="One figure per day, in litres."
      trigger={
        <Button size="lg" variant={variant} className={triggerClass(fullWidth)}>
          <Plus aria-hidden />
          {label}
        </Button>
      }
    >
      <WaterForm onSaved={() => setOpen(false)} />
    </EntrySheet>
  );
}

export function StartCylinderButton({
  label = "Start a cylinder",
  variant = "default",
  fullWidth,
}: CommonProps) {
  const [open, setOpen] = useState(false);
  return (
    <EntrySheet
      open={open}
      onOpenChange={setOpen}
      title="Start a new cylinder"
      description="Track it from the day you connect it."
      trigger={
        <Button size="lg" variant={variant} className={triggerClass(fullWidth)}>
          <Plus aria-hidden />
          {label}
        </Button>
      }
    >
      <StartCylinderForm onSaved={() => setOpen(false)} />
    </EntrySheet>
  );
}

export function CloseCylinderButton({
  cycleId,
  startDate,
  label = "Mark as finished",
  variant = "outline",
  fullWidth,
}: CommonProps & { cycleId: string; startDate: string }) {
  const [open, setOpen] = useState(false);
  return (
    <EntrySheet
      open={open}
      onOpenChange={setOpen}
      title="Cylinder finished"
      description="We use the dates to work out how long one lasts in your home."
      trigger={
        <Button size="lg" variant={variant} className={triggerClass(fullWidth)}>
          <Check aria-hidden />
          {label}
        </Button>
      }
    >
      <CloseCylinderForm cycleId={cycleId} startDate={startDate} onSaved={() => setOpen(false)} />
    </EntrySheet>
  );
}
