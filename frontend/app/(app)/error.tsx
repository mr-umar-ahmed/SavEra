"use client";

import { RotateCcw, ServerCrash } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Shown when a page fails to load its data — almost always because the API is
 * unreachable. The message says what is wrong and what to do, and never leaks
 * the underlying error text to the person reading it.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-bad-soft text-bad-fg">
        <ServerCrash className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="font-display text-xl font-bold">We could not load that</h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          The SAVERA server did not answer. Your readings are safe — try again in a moment.
        </p>
      </div>
      <Button onClick={reset} className="touch-target">
        <RotateCcw aria-hidden />
        Try again
      </Button>
    </div>
  );
}
