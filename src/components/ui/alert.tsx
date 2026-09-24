import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-2xl border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "glass text-card-foreground",
        destructive:
          "border-red-500/30 bg-red-500/10 text-red-700 *:data-[slot=alert-description]:text-red-700/80 dark:text-red-400 dark:*:data-[slot=alert-description]:text-red-200/70",
        warning:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 *:data-[slot=alert-description]:text-amber-700/80 dark:text-amber-400 dark:*:data-[slot=alert-description]:text-amber-100/70",
        info: "border-sky-500/30 bg-sky-500/10 text-sky-700 *:data-[slot=alert-description]:text-sky-700/80 dark:text-sky-400 dark:*:data-[slot=alert-description]:text-sky-100/70",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 *:data-[slot=alert-description]:text-emerald-700/80 dark:text-emerald-400 dark:*:data-[slot=alert-description]:text-emerald-100/70",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type AlertProps = React.ComponentProps<"div"> & VariantProps<typeof alertVariants>;

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
