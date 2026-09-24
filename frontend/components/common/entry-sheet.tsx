"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsDesktop } from "@/hooks/use-media-query";

export interface EntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  trigger?: ReactNode;
  children: ReactNode;
}

/**
 * One data-entry surface, two presentations: a bottom drawer on phones, where
 * the form sits under the thumb, and a centred dialog from md up.
 *
 * Only one of the two is mounted at a time, so a form's state resets when the
 * viewport crosses the breakpoint mid-edit — acceptable, and far simpler than
 * keeping two trees alive.
 */
export function EntrySheet({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
}: EntrySheetProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display text-xl">{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <div className="px-4 pb-8 pb-safe">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
