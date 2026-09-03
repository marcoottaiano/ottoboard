"use client";
// Adapted from Watermelon UI (MIT); see README.md and LICENSE.
import { AlertDialog as Primitive } from "radix-ui";
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useThemeScope } from "./theme-scope";

export const AlertDialog = Primitive.Root;
export const AlertDialogTrigger = Primitive.Trigger;
export const AlertDialogTitle = Primitive.Title;
export const AlertDialogDescription = Primitive.Description;
export const AlertDialogCancel = Primitive.Cancel;
export const AlertDialogAction = Primitive.Action;

export function AlertDialogContent({ className, ...props }: ComponentProps<typeof Primitive.Content>) {
  const { portalContainer } = useThemeScope();
  if (!portalContainer) return null;
  return (
    <Primitive.Portal container={portalContainer}>
      <Primitive.Overlay className="fixed inset-0 z-[60] bg-black/60" />
      <Primitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-[60] grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border border-wm-border bg-wm-background p-4 sm:p-6 text-wm-foreground shadow-xl",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}
export function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("space-y-2", className)} {...props} />;
}
export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
