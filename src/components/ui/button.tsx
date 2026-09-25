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
          "rounded-full bg-primary font-bold text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md active:scale-[0.98]",
        secondary:
          "rounded-full border border-border bg-secondary text-secondary-foreground hover:border-border-strong hover:bg-muted active:scale-[0.98]",
        outline:
          "rounded-full border border-border-strong bg-card text-foreground hover:border-primary/40 hover:bg-muted active:scale-[0.98]",
        positive:
          "rounded-full border border-positive/40 bg-positive-soft font-bold text-positive hover:border-positive/70 hover:bg-positive/15 active:scale-[0.98]",
        ghost:
          "rounded-full bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        link: "h-auto rounded-none bg-transparent p-0 text-primary underline-offset-4 hover:underline",
        destructive:
          "rounded-full bg-destructive font-bold text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
      },
      size: {
        sm: "h-9 gap-1.5 px-4 text-xs has-[>svg]:px-3.5",
        default: "h-11 px-6 has-[>svg]:px-5",
        lg: "h-12 px-8 text-base has-[>svg]:px-6",
        icon: "size-10",
        "icon-sm": "size-9",
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
