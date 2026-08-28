"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TransactionForm } from "./TransactionForm";

interface TransactionCreateModalProps {
  onClose: () => void;
}

export function TransactionCreateModal({ onClose }: TransactionCreateModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstField = dialogRef.current?.querySelector<HTMLElement>("input");
    firstField?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        queueMicrotask(() => {
          if (!event.defaultPrevented && !isSubmittingRef.current) onClose();
        });
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const handlePendingChange = (pending: boolean) => {
    isSubmittingRef.current = pending;
    setIsSubmitting(pending);
  };

  const requestClose = () => {
    if (!isSubmitting) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && requestClose()} role="dialog" aria-modal="true" aria-labelledby="transaction-create-title">
      <div ref={dialogRef} className="ob-panel max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto p-5 shadow-2xl md:p-7">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <p className="ob-eyebrow">Nuovo movimento</p>
            <h2 id="transaction-create-title" className="mt-2 text-lg font-semibold">
              Aggiungi transazione
            </h2>
          </div>
          <button type="button" onClick={requestClose} disabled={isSubmitting} className="ob-icon-button size-8 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Chiudi">
            <X size={15} />
          </button>
        </div>
        <TransactionForm embedded onSuccess={onClose} onPendingChange={handlePendingChange} />
      </div>
    </div>
  );
}
