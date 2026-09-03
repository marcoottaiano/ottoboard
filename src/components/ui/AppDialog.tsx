"use client";
import { useRef, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/watermelon-ui/dialog";
import { Button } from "@/components/watermelon-ui/button";
import { X } from "lucide-react";
interface Props {
  title: string;
  className?: string;
  description: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}
export function AppDialog({ title, description, busy = false, onClose, children, className }: Props) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={className}
        onOpenAutoFocus={() => {
          if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-wm-muted-foreground">{description}</DialogDescription>
        </DialogHeader>
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-4 top-4"
          disabled={busy}
          onClick={onClose}
          aria-label="Chiudi"
        >
          <X size={16} />
        </Button>
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          {children}
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
