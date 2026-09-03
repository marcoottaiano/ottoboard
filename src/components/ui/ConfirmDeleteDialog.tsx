"use client";
import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/watermelon-ui/alert-dialog";
import { Button } from "@/components/watermelon-ui/button";
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel?: string;
  pendingLabel?: string;
  description: string;
  onConfirm: () => Promise<unknown>;
}
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Elimina",
  pendingLabel = "Eliminazione...",
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  async function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      setError("Operazione non riuscita. Riprova.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting.current) {
          setError(null);
          onOpenChange(next);
        }
      }}
    >
      <AlertDialogContent
        onEscapeKeyDown={(event) => {
          if (submitting.current) event.preventDefault();
        }}
      >
        <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-sm text-wm-muted-foreground">{description}</AlertDialogDescription>
        {error && (
          <p role="alert" className="text-sm text-wm-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={pending}>
              Annulla
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
