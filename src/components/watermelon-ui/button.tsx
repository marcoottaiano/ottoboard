"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap max-md:min-h-11 max-md:min-w-11 max-md:h-auto max-md:whitespace-normal max-md:break-words rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-wm-ring focus-visible:ring-wm-ring/50 focus-visible:ring-[3px] aria-invalid:ring-wm-destructive/20 wm-dark:aria-invalid:ring-wm-destructive/40 aria-invalid:border-wm-destructive",
  {
    variants: {
      variant: {
        default: "bg-wm-primary text-wm-primary-foreground hover:bg-wm-primary/90",
        destructive:
          "bg-wm-destructive text-wm-destructive-foreground hover:bg-wm-destructive/90 focus-visible:ring-wm-destructive/20 wm-dark:focus-visible:ring-wm-destructive/40",
        outline:
          "border bg-wm-background shadow-xs hover:bg-wm-accent hover:text-wm-accent-foreground wm-dark:bg-wm-input/30 wm-dark:border-wm-input wm-dark:hover:bg-wm-input/50",
        secondary: "bg-wm-secondary text-wm-secondary-foreground hover:bg-wm-secondary/80",
        ghost: "hover:bg-wm-accent hover:text-wm-accent-foreground wm-dark:hover:bg-wm-accent/50",
        link: "text-wm-primary underline-offset-4 hover:underline",
      },
      size: {
        auto: "min-h-11 px-3 py-2",
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type = "button",
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={asChild ? undefined : type}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
