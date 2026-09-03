"use client";
// Adapted from Watermelon UI (MIT); see README.md and LICENSE.
import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";
import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useThemeScope } from "./theme-scope";

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;

export function DialogContent({
  children,
  className,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof Primitive.Content> & { showCloseButton?: boolean }) {
  const { portalContainer } = useThemeScope();
  if (!portalContainer) return null;
  return (
    <Primitive.Portal container={portalContainer}>
      <Primitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <Primitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-xl border border-wm-border bg-wm-background p-5 text-wm-foreground shadow-xl max-md:p-4 md:p-7",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <Primitive.Close
            className="absolute right-4 top-4 rounded-md p-2 text-wm-muted-foreground hover:bg-wm-accent"
            aria-label="Chiudi"
          >
            <X size={16} />
          </Primitive.Close>
        )}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2 pr-10 text-left", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
