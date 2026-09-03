"use client";

import { Card } from "@/components/watermelon-ui/card";
import { Input } from "@/components/watermelon-ui/input";
import { Button } from "@/components/watermelon-ui/button";
import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const submitting = useRef(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null); // P5: inline field-level error

  const mutation = useMutation({
    mutationFn: async ({ currentPwd, newPwd }: { currentPwd: string; newPwd: string }) => {
      // P4: no shadowing
      const supabase = createClient();

      // Step 1: get user email for re-authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Sessione non valida. Rieffettua il login.");

      // Step 2: verify current password via signInWithPassword
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPwd,
      });
      if (signInError) throw new Error("__current_password_wrong__"); // P5: sentinel for field-level error

      // Step 3: update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });
      if (updateError) throw new Error(updateError.message);
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      if (error.message === "__current_password_wrong__") {
        setCurrentPasswordError("Password attuale non corretta."); // P5: show inline at field
        setCurrentPassword(""); // P3: clear current password on error
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setValidationError(null);
    setCurrentPasswordError(null); // P5: reset field-level error on new attempt
    mutation.reset();

    if (!currentPassword.trim()) {
      // P1: explicit JS guard
      setCurrentPasswordError("Inserisci la password attuale.");
      return;
    }
    if (newPassword.length < 8) {
      setValidationError("La password deve essere di almeno 8 caratteri.");
      return;
    }
    if (currentPassword === newPassword) {
      // P2: same password check
      setValidationError("La nuova password deve essere diversa da quella attuale.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("Le password non coincidono.");
      return;
    }

    submitting.current = true;
    mutation.mutate(
      { currentPwd: currentPassword, newPwd: newPassword },
      {
        onSettled: () => {
          submitting.current = false;
        },
      },
    );
  };

  const mutationErrorMessage = mutation.isError
    ? mutation.error?.message === "__current_password_wrong__"
      ? null // handled inline
      : mutation.error?.message
    : null;

  return (
    <Card className="rounded-xl border border-wm-border bg-wm-card p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Lock size={16} className="text-wm-info" />
        <h2 className="text-sm font-semibold text-wm-foreground">Cambia password</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Password attuale */}
        <div className="space-y-1.5">
          <label htmlFor="current-password" className="text-xs text-wm-muted-foreground">
            Password attuale
          </label>
          <div className="relative">
            <Input
              id="current-password"
              aria-label="Password attuale"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setCurrentPasswordError(null);
              }}
              placeholder="••••••••"
              disabled={mutation.isPending}
              className="w-full bg-wm-muted border border-wm-border rounded-lg px-3 py-2.5 text-sm text-wm-foreground placeholder:text-wm-muted-foreground focus:outline-hidden focus:border-wm-ring focus:bg-wm-muted transition-all pr-14 disabled:opacity-50"
              required
            />
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              aria-label={showCurrent ? "Nascondi password attuale" : "Mostra password attuale"}
              aria-pressed={showCurrent}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors"
            >
              {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
            </Button>
          </div>
          {/* P5: inline field-level error for current password */}
          {currentPasswordError && (
            <p className="flex items-center gap-1.5 text-xs text-wm-destructive">
              <AlertCircle size={12} className="flex-shrink-0" />
              {currentPasswordError}
            </p>
          )}
        </div>

        {/* Nuova password */}
        <div className="space-y-1.5">
          <label htmlFor="new-password" className="text-xs text-wm-muted-foreground">
            Nuova password
          </label>
          <div className="relative">
            <Input
              id="new-password"
              aria-label="Nuova password"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 8 caratteri"
              disabled={mutation.isPending}
              className="w-full bg-wm-muted border border-wm-border rounded-lg px-3 py-2.5 text-sm text-wm-foreground placeholder:text-wm-muted-foreground focus:outline-hidden focus:border-wm-ring focus:bg-wm-muted transition-all pr-14 disabled:opacity-50"
              required
            />
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={() => setShowNew(!showNew)}
              aria-label={showNew ? "Nascondi nuova password" : "Mostra nuova password"}
              aria-pressed={showNew}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors"
            >
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </Button>
          </div>
        </div>

        {/* Conferma password */}
        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className="text-xs text-wm-muted-foreground">
            Conferma password
          </label>
          <div className="relative">
            <Input
              id="confirm-password"
              aria-label="Conferma password"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ripeti la nuova password"
              disabled={mutation.isPending}
              className="w-full bg-wm-muted border border-wm-border rounded-lg px-3 py-2.5 text-sm text-wm-foreground placeholder:text-wm-muted-foreground focus:outline-hidden focus:border-wm-ring focus:bg-wm-muted transition-all pr-14 disabled:opacity-50"
              required
            />
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? "Nascondi conferma password" : "Mostra conferma password"}
              aria-pressed={showConfirm}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors"
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </Button>
          </div>
        </div>

        {/* Errori generici (validazione o errori non relativi alla password attuale) */}
        {(validationError || mutationErrorMessage) && (
          <div className="flex items-center gap-2 text-wm-destructive text-xs bg-wm-destructive/10 border border-wm-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="flex-shrink-0" />
            {validationError ?? mutationErrorMessage}
          </div>
        )}

        {/* Successo */}
        {mutation.isSuccess && (
          <div className="flex items-center gap-2 text-wm-success text-xs bg-wm-success/10 border border-wm-success/20 rounded-lg px-3 py-2">
            <CheckCircle size={13} className="flex-shrink-0" />
            Password aggiornata con successo.
          </div>
        )}

        <Button
          variant="default"
          size="auto"
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {mutation.isPending ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-sky-400/40 border-t-sky-400 rounded-full animate-spin" />
              Aggiornamento...
            </>
          ) : (
            "Aggiorna password"
          )}
        </Button>
      </form>
    </Card>
  );
}
