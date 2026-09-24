import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        warning: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
        danger: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400",
        destructive: "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400",
        info: "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  };

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
