"use client";
// Adapted from Watermelon UI (MIT); see README.md and LICENSE.
import { DropdownMenu as Primitive } from "radix-ui";
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useThemeScope } from "./theme-scope";
export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export function DropdownMenuContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof Primitive.Content>) {
  const { portalContainer } = useThemeScope();
  if (!portalContainer) return null;
  return (
    <Primitive.Portal container={portalContainer}>
      <Primitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-40 max-w-[calc(100vw-2rem)] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto rounded-lg border border-wm-border bg-wm-popover p-1 text-wm-popover-foreground shadow-lg",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}
export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2 break-words md:min-h-0 rounded-md px-3 py-2 text-sm outline-none focus:bg-wm-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
