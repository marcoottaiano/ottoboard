"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-wm-input wm-dark:bg-wm-input/30 data-[state=checked]:bg-wm-primary data-[state=checked]:text-wm-primary-foreground wm-dark:data-[state=checked]:bg-wm-primary data-[state=checked]:border-wm-primary focus-visible:border-wm-ring focus-visible:ring-wm-ring/50 aria-invalid:ring-wm-destructive/20 wm-dark:aria-invalid:ring-wm-destructive/40 aria-invalid:border-wm-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
