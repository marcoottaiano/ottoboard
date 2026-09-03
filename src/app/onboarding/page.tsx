"use client";

import { Card } from "@/components/watermelon-ui/card";
import { Button } from "@/components/watermelon-ui/button";
import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, ArrowRight, LayoutDashboard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function OnboardingContent() {
  const [requestedStep, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [completeError, setCompleteError] = useState(false);
  const [scopeDays, setScopeDays] = useState<"30" | "all">("30");
  const [completing, setCompleting] = useState(false);
  const completingRef = useRef(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const stravaStatus =
    searchParams.get("strava") === "connected"
      ? "connected"
      : searchParams.get("error")?.startsWith("strava_")
        ? "error"
        : "idle";
  const step = stravaStatus === "idle" ? requestedStep : 2;

  const seeding = useRef(false);
  const handleContinue = async () => {
    if (seeding.current) return;
    seeding.current = true;
    setLoading(true);
    try {
      // Seed default finance categories (idempotent)
      await fetch("/api/onboarding/seed-categories", { method: "POST" });
    } catch {
      // Non-critical: categories can be created later; proceed to next step
    } finally {
      seeding.current = false;
      setLoading(false);
    }
    setStep(2);
  };

  const handleCompleteOnboarding = async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    setCompleting(true);
    setCompleteError(false);
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      if (!res.ok) {
        setCompleteError(true);
        return;
      }
      router.push("/");
    } catch {
      setCompleteError(true);
    } finally {
      completingRef.current = false;
      setCompleting(false);
    }
  };

  const handleConnectStrava = () => {
    // OAuth starts in a Route Handler that redirects to an external provider; use document navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/strava/connect?scope_days=${scopeDays}`;
  };

  const handleRetryStrava = () => {
    setStep(2);
    router.replace("/onboarding"); // Rimuove ?error= dalla URL
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-wm-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm relative">
        {/* Logo */}

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={[
                "h-1.5 rounded-full transition-all duration-300",
                step === s ? "w-6 bg-wm-primary" : "w-3 bg-wm-muted",
              ].join(" ")}
            />
          ))}
        </div>

        {completeError && (
          <p className="text-xs text-wm-destructive/80 text-center mb-4">
            Errore di rete. Riprova tra qualche secondo.
          </p>
        )}

        <Card className="bg-wm-card  border border-wm-border rounded-2xl p-6">
          {/* Step 1 — Benvenuto */}
          {step === 1 && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-wm-primary/10 to-wm-primary/20 border border-wm-border flex items-center justify-center">
                  <LayoutDashboard size={26} className="text-wm-muted-foreground" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-wm-foreground mb-2">Benvenuto su Ottoboard!</h2>
                <p className="text-sm text-wm-muted-foreground leading-relaxed">
                  La tua dashboard personale è pronta. Nel prossimo passaggio configureremo le categorie di spesa
                  iniziali per Finanze.
                </p>
              </div>

              <Button
                variant="default"
                size="auto"
                onClick={handleContinue}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 border text-sm font-medium rounded-xl py-2.5 transition-all duration-200 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-wm-muted-foreground" />
                    Configurazione…
                  </>
                ) : (
                  <>
                    Continua
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2 — Strava */}
          {step === 2 && (
            <div className="text-center space-y-5">
              {stravaStatus === "idle" ? (
                <>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-wm-fitness/10 border border-wm-fitness/20 flex items-center justify-center">
                      <Zap size={26} className="text-wm-fitness" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-wm-foreground mb-2">Colleghi Strava?</h2>
                    <p className="text-sm text-wm-muted-foreground leading-relaxed">
                      Sincronizza automaticamente le tue attività sportive. Scegli l&apos;intervallo per la
                      sincronizzazione iniziale:
                    </p>
                  </div>

                  <div className="space-y-2 py-2">
                    <Button
                      variant="ghost"
                      size="auto"
                      onClick={() => setScopeDays("30")}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${scopeDays === "30" ? "bg-wm-muted border-wm-border text-wm-foreground" : "bg-transparent border-wm-border text-wm-muted-foreground hover:bg-wm-muted"}`}
                    >
                      <div className="text-left">
                        <div className="text-sm font-medium">Ultimi 30 giorni</div>
                        <div className="text-xs opacity-60">Sincronizzazione rapida</div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${scopeDays === "30" ? "border-wm-fitness" : "border-wm-border"}`}
                      >
                        {scopeDays === "30" && <div className="w-2 h-2 rounded-full bg-wm-fitness" />}
                      </div>
                    </Button>

                    <Button
                      variant="ghost"
                      size="auto"
                      onClick={() => setScopeDays("all")}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${scopeDays === "all" ? "bg-wm-muted border-wm-border text-wm-foreground" : "bg-transparent border-wm-border text-wm-muted-foreground hover:bg-wm-muted"}`}
                    >
                      <div className="text-left">
                        <div className="text-sm font-medium">Storia completa</div>
                        <div className="text-xs opacity-60">Tutte le attività passate</div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${scopeDays === "all" ? "border-wm-fitness" : "border-wm-border"}`}
                      >
                        {scopeDays === "all" && <div className="w-2 h-2 rounded-full bg-wm-fitness" />}
                      </div>
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="auto"
                      onClick={handleConnectStrava}
                      className="w-full flex items-center justify-center gap-2 bg-wm-fitness/20 hover:bg-wm-fitness/30 border border-wm-fitness/20 text-wm-fitness text-sm font-medium rounded-xl py-2.5 transition-all duration-200"
                    >
                      <Zap size={15} />
                      Connetti Strava
                    </Button>

                    <Button
                      variant="default"
                      size="auto"
                      onClick={handleCompleteOnboarding}
                      disabled={completing}
                      className="w-full text-sm py-2 transition-colors disabled:opacity-40"
                    >
                      Salta, lo faccio dopo →
                    </Button>
                  </div>
                </>
              ) : stravaStatus === "connected" ? (
                <>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-wm-success/10 border border-wm-success/20 flex items-center justify-center">
                      <CheckCircle2 size={26} className="text-wm-success" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-wm-foreground mb-2">Strava connesso!</h2>
                    <p className="text-sm text-wm-muted-foreground leading-relaxed">
                      Il tuo account è stato collegato con successo. La sincronizzazione è in corso in background.
                    </p>
                  </div>

                  <Button
                    variant="default"
                    size="auto"
                    onClick={handleCompleteOnboarding}
                    disabled={completing}
                    className="w-full flex items-center justify-center gap-2 border text-sm font-medium rounded-xl py-2.5 transition-all duration-200 disabled:opacity-40"
                  >
                    {completing ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-wm-muted-foreground" />
                        Configurazione…
                      </>
                    ) : (
                      <>
                        Completa
                        <ArrowRight size={15} />
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-wm-destructive/10 border border-wm-destructive/20 flex items-center justify-center">
                      <AlertCircle size={26} className="text-wm-destructive" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-wm-foreground mb-2">Connessione fallita</h2>
                    <p className="text-sm text-wm-muted-foreground leading-relaxed">
                      Non è stato possibile collegare il tuo account Strava. Potresti aver negato l&apos;autorizzazione.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="auto"
                      onClick={handleRetryStrava}
                      className="w-full flex items-center justify-center gap-2 bg-wm-muted hover:bg-wm-muted border border-wm-border text-wm-foreground hover:text-wm-foreground text-sm font-medium rounded-xl py-2.5 transition-all duration-200"
                    >
                      Riprova
                    </Button>

                    <Button
                      variant="default"
                      size="auto"
                      onClick={handleCompleteOnboarding}
                      disabled={completing}
                      className="w-full text-sm py-2 transition-colors disabled:opacity-40"
                    >
                      Salta, lo faccio dopo →
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
