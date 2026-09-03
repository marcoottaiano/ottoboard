"use client";
import { useState } from "react";
import { TransactionForm } from "./TransactionForm";
import { AppDialog } from "@/components/ui/AppDialog";
export function TransactionCreateModal({ onClose }: { onClose: () => void }) {
  const [pending, setPending] = useState(false);
  return (
    <AppDialog
      title="Aggiungi transazione"
      description="Registra un’entrata o un’uscita."
      busy={pending}
      onClose={onClose}
    >
      <TransactionForm embedded onSuccess={onClose} onPendingChange={setPending} />
    </AppDialog>
  );
}
