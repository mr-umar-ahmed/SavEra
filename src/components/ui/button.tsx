import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-primary font-bold text-primary-foreground shadow-[0_0_40px_-5px_rgba(16,185,129,0.4)] hover:bg-emerald-400 hover:shadow-[0_0_48px_-4px_rgba(16,185,129,0.55)] active:scale-[0.98] dark:hover:bg-emerald-400",
        secondary:
          "rounded-full border border-border bg-secondary text-foreground hover:border-foreground/20 hover:bg-muted active:scale-[0.98]",
        outline:
          "rounded-full border border-border bg-transparent text-foreground hover:border-foreground/25 hover:bg-secondary active:scale-[0.98]",
        ghost:
          "rounded-full bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        link: "h-auto rounded-none bg-transparent p-0 text-primary underline-offset-4 hover:underline",
        destructive:
          "rounded-full bg-destructive font-bold text-white shadow-[0_0_30px_-8px_rgba(239,68,68,0.5)] hover:bg-red-400 active:scale-[0.98]",
      },
      size: {
        sm: "h-8 gap-1.5 px-4 text-xs has-[>svg]:px-3",
        default: "h-10 px-6 has-[>svg]:px-5",
        lg: "h-12 px-8 text-base has-[>svg]:px-6",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
