import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-card/60 text-foreground placeholder:text-muted-foreground flex field-sizing-content min-h-20 w-full rounded-xl border px-4 py-3 text-sm transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-white/5",
        "focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-2",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/25 aria-invalid:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
