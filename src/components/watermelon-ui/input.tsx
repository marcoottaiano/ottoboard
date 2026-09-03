"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-wm-foreground placeholder:text-wm-muted-foreground selection:bg-wm-primary selection:text-wm-primary-foreground wm-dark:bg-wm-input/30 border-wm-input h-9 max-md:min-h-11 max-md:text-base w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-wm-ring focus-visible:ring-wm-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-wm-destructive/20 wm-dark:aria-invalid:ring-wm-destructive/40 aria-invalid:border-wm-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
