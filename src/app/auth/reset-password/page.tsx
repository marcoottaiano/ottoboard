"use client";

import { Card } from "@/components/watermelon-ui/card";
import { Input } from "@/components/watermelon-ui/input";
import { Button } from "@/components/watermelon-ui/button";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const submitting = useRef(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setError(null);

    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri.");
      return;
    }
    if (password !== confirm) {
      setError("Le password non coincidono.");
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError("Impossibile aggiornare la password. Il link potrebbe essere scaduto.");
      } else {
        await supabase.auth.signOut();
        router.push("/auth/login?reset=success");
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
          <h2 className="text-base font-semibold text-wm-foreground mb-1">Nuova password</h2>
          <p className="text-xs text-wm-muted-foreground mb-5">Scegli una nuova password per il tuo account.</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-wm-muted-foreground mb-1.5 block">Nuova password</label>
              <div className="relative">
                <Input
                  aria-label="Nuova password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimo 8 caratteri"
                  className="w-full bg-wm-muted border border-wm-border rounded-xl px-3 py-2.5 text-sm text-wm-foreground placeholder:text-wm-muted-foreground focus:outline-hidden focus:border-wm-border focus:bg-wm-muted transition-all pr-14"
                />
                <Button
                  variant="ghost"
                  size="auto"
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? "Nascondi password" : "Mostra password"}
                  aria-pressed={showPw}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs text-wm-muted-foreground mb-1.5 block">Conferma password</label>
              <div className="relative">
                <Input
                  aria-label="Conferma password"
                  type={showCf ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Ripeti la nuova password"
                  className="w-full bg-wm-muted border border-wm-border rounded-xl px-3 py-2.5 text-sm text-wm-foreground placeholder:text-wm-muted-foreground focus:outline-hidden focus:border-wm-border focus:bg-wm-muted transition-all pr-14"
                />
                <Button
                  variant="ghost"
                  size="auto"
                  type="button"
                  onClick={() => setShowCf(!showCf)}
                  aria-label={showCf ? "Nascondi password" : "Mostra password"}
                  aria-pressed={showCf}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors"
                >
                  {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                </Button>
              </div>
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
              className="w-full border text-sm font-medium rounded-xl py-2.5 transition-all duration-200 disabled:opacity-40 mt-1"
            >
              {loading ? "Aggiornamento…" : "Imposta nuova password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
