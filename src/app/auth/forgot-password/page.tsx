"use client";

import { Card } from "@/components/watermelon-ui/card";
import { Input } from "@/components/watermelon-ui/input";
import { Button } from "@/components/watermelon-ui/button";
import { useState, useRef } from "react";
import Link from "next/link";
import { AlertCircle, Mail, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const submitting = useRef(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      setError(null);

      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        setError("Impossibile inviare l'email. Verifica l'indirizzo e riprova.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Operazione non riuscita. Riprova.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-wm-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm relative">
        {/* Logo */}

        <Card className="bg-wm-card  border border-wm-border rounded-2xl p-6">
          {!sent ? (
            <>
              <h2 className="text-base font-semibold text-wm-foreground mb-1">Recupera la password</h2>
              <p className="text-xs text-wm-muted-foreground mb-5">
                Inserisci la tua email e ti mandiamo un link per impostare una nuova password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-wm-muted-foreground mb-1.5 block">Email</label>
                  <Input
                    aria-label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-wm-muted border border-wm-border rounded-xl px-3 py-2.5 text-sm text-wm-foreground placeholder:text-wm-muted-foreground focus:outline-hidden focus:border-wm-border focus:bg-wm-muted transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-wm-destructive text-xs bg-wm-destructive/10 border border-wm-destructive/20 rounded-lg px-3 py-2">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  variant="default"
                  size="auto"
                  type="submit"
                  disabled={loading}
                  className="w-full border text-sm font-medium rounded-xl py-2.5 transition-all duration-200 disabled:opacity-40"
                >
                  {loading ? "Invio…" : "Invia link di recupero"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-wm-success/10 border border-wm-success/20 flex items-center justify-center">
                  <Mail size={22} className="text-wm-success" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-wm-foreground mb-1">Email inviata</p>
                <p className="text-xs text-wm-muted-foreground">
                  Controlla la casella di <span className="break-all text-wm-muted-foreground">{email}</span> e clicca
                  il link per impostare una nuova password.
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-wm-border">
            <Link
              href="/auth/login"
              className="flex min-h-11 items-center gap-1.5 text-sm text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors"
            >
              <ArrowLeft size={13} />
              Torna al login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
