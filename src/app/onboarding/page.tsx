"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, ArrowRight, LayoutDashboard, CheckCircle2, AlertCircle, Link2, Check, X, Loader2 } from "lucide-react";
import Image from "next/image";

function OnboardingContent() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [completeError, setCompleteError] = useState(false);
  const [scopeDays, setScopeDays] = useState<"30" | "all">("30");
  const [stravaStatus, setStravaStatus] = useState<"idle" | "connected" | "error">("idle");

  // State for step 3: Linear
  const [linearApiKey, setLinearApiKey] = useState('');
  const [linearValidating, setLinearValidating] = useState(false);
  const [linearKeyValid, setLinearKeyValid] = useState<boolean | null>(null); // null = not yet validated
  const [linearKeyError, setLinearKeyError] = useState<string | null>(null);
  const [linearStatus, setLinearStatus] = useState<'idle' | 'saving' | 'team-select' | 'error'>('idle');
  const [linearTeams, setLinearTeams] = useState<Array<{ id: string; name: string; key: string }>>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [linearError, setLinearError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const strava = searchParams.get("strava");
    const error = searchParams.get("error");

    if (strava === "connected") {
      setStep(2);
      setStravaStatus("connected");
    } else if (error && error.startsWith("strava_")) {
      setStep(2);
      setStravaStatus("error");
    }
  }, [searchParams]);

  // Debounced Linear key validation
  useEffect(() => {
    if (!linearApiKey.trim()) {
      setLinearValidating(false);
      setLinearKeyValid(null);
      setLinearKeyError(null);
      return;
    }

    setLinearValidating(true);
    setLinearKeyValid(null);
    setLinearKeyError(null);

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/linear/validate?key=${encodeURIComponent(linearApiKey.trim())}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          setLinearKeyValid(true);
          setLinearKeyError(null);
        } else {
          const data = await res.json();
          setLinearKeyValid(false);
          setLinearKeyError(data.error ?? 'Chiave non valida');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setLinearKeyValid(false);
        setLinearKeyError('Errore di rete');
      } finally {
        if (!controller.signal.aborted) setLinearValidating(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [linearApiKey]);

  const handleContinue = async () => {
    setLoading(true);
    // Seed default finance categories (idempotent)
    await fetch("/api/onboarding/seed-categories", { method: "POST" });
    setLoading(false);
    setStep(2);
  };

  const completeOnboarding = async (): Promise<boolean> => {
    const res = await fetch("/api/onboarding/complete", { method: "POST" });
    return res.ok;
  };

  const handleSkip = () => {
    setStep(3);
  };

  const handleConnectStrava = () => {
    window.location.href = `/api/strava/connect?scope_days=${scopeDays}`;
  };

  const handleRetryStrava = () => {
    setStravaStatus("idle");
    router.replace("/onboarding"); // Rimuove ?error= dalla URL
  };

  const handleContinueFromStrava = () => {
    setStep(3);
  };

  const handleSaveLinear = async () => {
    if (!linearKeyValid) return;
    setLinearStatus('saving');
    setLinearError(null);
    setSelectedTeamId('');
    setSelectedTeamName('');

    try {
      // Save + validate via connect route
      const connectRes = await fetch('/api/linear/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: linearApiKey.trim() }),
      });

      if (!connectRes.ok) {
        const data = await connectRes.json();
        setLinearStatus('error');
        setLinearError(data.error ?? 'Errore salvataggio');
        return;
      }

      // Fetch teams
      const teamsRes = await fetch('/api/linear/teams');
      if (!teamsRes.ok) {
        setLinearStatus('error');
        setLinearError('Errore caricamento team');
        return;
      }

      const { teams } = await teamsRes.json();
      setLinearTeams(teams ?? []);

      // Auto-select first team if only one
      if (teams?.length === 1) {
        setSelectedTeamId(teams[0].id);
        setSelectedTeamName(teams[0].name);
      }

      setLinearStatus('team-select');
    } catch {
      setLinearStatus('error');
      setLinearError('Errore di rete durante il salvataggio');
    }
  };

  const handleCompleteLinear = async (teamId?: string, teamName?: string) => {
    if (linearStatus === 'error') setLinearStatus('idle');
    setCompleting(true);
    setLinearError(null);

    try {
      // Select team if provided (i.e., not skipping)
      if (teamId && teamName) {
        const teamRes = await fetch('/api/linear/select-team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId, teamName }),
        });
        if (!teamRes.ok) {
          setCompleting(false);
          setLinearError('Errore selezione team');
          return;
        }

        // Background sync (non-blocking)
        fetch('/api/linear/sync', { method: 'POST' }).catch(() => {});
      }

      // Complete onboarding
      const ok = await completeOnboarding();
      if (!ok) {
        setCompleting(false);
        setCompleteError(true);
        return;
      }

      router.push('/');
    } catch {
      setCompleting(false);
      setCompleteError(true);
      setLinearError('Errore di rete');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-orange-600/8 blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-72 h-72 rounded-full bg-purple-600/8 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-64 h-64 rounded-full bg-emerald-600/8 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <Image src="/icon.png" alt="Ottoboard Logo" width={32} height={32} className="text-white/80" />
          <span className="text-lg font-semibold text-white/90 tracking-wide">Ottoboard</span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={["h-1.5 rounded-full transition-all duration-300", step === s ? "w-6 bg-white/60" : "w-3 bg-white/15"].join(" ")} />
          ))}
        </div>

        {completeError && <p className="text-xs text-red-400/80 text-center mb-4">Errore di rete. Riprova tra qualche secondo.</p>}

        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6">
          {/* Step 1 — Benvenuto */}
          {step === 1 && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 via-purple-500/20 to-emerald-500/20 border border-white/[0.08] flex items-center justify-center">
                  <LayoutDashboard size={26} className="text-white/70" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white/90 mb-2">Benvenuto su Ottoboard!</h2>
                <p className="text-sm text-white/40 leading-relaxed">La tua dashboard personale è pronta. Abbiamo configurato le categorie di spesa di default per il modulo Finanze.</p>
              </div>

              <button onClick={handleContinue} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium rounded-xl py-2.5 transition-all duration-200 disabled:opacity-40">
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white/60" />
                    Configurazione…
                  </>
                ) : (
                  <>
                    Continua
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2 — Strava */}
          {step === 2 && (
            <div className="text-center space-y-5">
              {stravaStatus === "idle" ? (
                <>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Zap size={26} className="text-orange-400" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-white/90 mb-2">Colleghi Strava?</h2>
                    <p className="text-sm text-white/40 leading-relaxed">Sincronizza automaticamente le tue attività sportive. Scegli l&apos;intervallo per la sincronizzazione iniziale:</p>
                  </div>

                  <div className="space-y-2 py-2">
                    <button onClick={() => setScopeDays("30")} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${scopeDays === "30" ? "bg-white/[0.08] border-white/20 text-white/90" : "bg-transparent border-white/[0.05] text-white/40 hover:bg-white/[0.04]"}`}>
                      <div className="text-left">
                        <div className="text-sm font-medium">Ultimi 30 giorni</div>
                        <div className="text-xs opacity-60">Sincronizzazione rapida</div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${scopeDays === "30" ? "border-orange-500" : "border-white/20"}`}>{scopeDays === "30" && <div className="w-2 h-2 rounded-full bg-orange-500" />}</div>
                    </button>

                    <button onClick={() => setScopeDays("all")} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${scopeDays === "all" ? "bg-white/[0.08] border-white/20 text-white/90" : "bg-transparent border-white/[0.05] text-white/40 hover:bg-white/[0.04]"}`}>
                      <div className="text-left">
                        <div className="text-sm font-medium">Storia completa</div>
                        <div className="text-xs opacity-60">Tutte le attività passate</div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${scopeDays === "all" ? "border-orange-500" : "border-white/20"}`}>{scopeDays === "all" && <div className="w-2 h-2 rounded-full bg-orange-500" />}</div>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <button onClick={handleConnectStrava} className="w-full flex items-center justify-center gap-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/20 text-orange-400 text-sm font-medium rounded-xl py-2.5 transition-all duration-200">
                      <Zap size={15} />
                      Connetti Strava
                    </button>

                    <button onClick={handleSkip} className="w-full text-sm text-white/30 hover:text-white/60 py-2 transition-colors">
                      Salta, lo faccio dopo →
                    </button>
                  </div>
                </>
              ) : stravaStatus === "connected" ? (
                <>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 size={26} className="text-emerald-400" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-white/90 mb-2">Strava connesso!</h2>
                    <p className="text-sm text-white/40 leading-relaxed">Il tuo account è stato collegato con successo. La sincronizzazione è in corso in background.</p>
                  </div>

                  <button onClick={handleContinueFromStrava} className="w-full flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium rounded-xl py-2.5 transition-all duration-200">
                    Continua
                    <ArrowRight size={15} />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <AlertCircle size={26} className="text-red-400" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-white/90 mb-2">Connessione fallita</h2>
                    <p className="text-sm text-white/40 leading-relaxed">Non è stato possibile collegare il tuo account Strava. Potresti aver negato l&apos;autorizzazione.</p>
                  </div>

                  <div className="space-y-2">
                    <button onClick={handleRetryStrava} className="w-full flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium rounded-xl py-2.5 transition-all duration-200">
                      Riprova
                    </button>

                    <button onClick={handleSkip} className="w-full text-sm text-white/30 hover:text-white/60 py-2 transition-colors">
                      Salta, lo faccio dopo →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3 — Linear */}
          {step === 3 && (
            <div className="text-center space-y-5">
              {linearStatus === 'idle' || linearStatus === 'saving' ? (
                <>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <Link2 size={26} className="text-purple-400" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-white/90 mb-2">Colleghi Linear?</h2>
                    <p className="text-sm text-white/40 leading-relaxed">Inserisci la tua API key per sincronizzare i tuoi progetti.</p>
                  </div>

                  <div className="relative">
                    <input
                      type="password"
                      autoComplete="off"
                      value={linearApiKey}
                      onChange={(e) => setLinearApiKey(e.target.value)}
                      placeholder="lin_api_..."
                      disabled={linearStatus === 'saving'}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {linearValidating ? (
                        <Loader2 size={16} className="animate-spin text-white/20" />
                      ) : linearKeyValid === true ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : linearKeyValid === false ? (
                        <X size={16} className="text-red-400" />
                      ) : null}
                    </div>
                  </div>
                  {linearKeyError && (
                    <p className="text-xs text-red-400/80 -mt-2">{linearKeyError}</p>
                  )}

                  <div className="space-y-2">
                    <button
                      onClick={handleSaveLinear}
                      disabled={!linearKeyValid || linearStatus === 'saving'}
                      className="w-full flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium rounded-xl py-2.5 transition-all duration-200 disabled:opacity-40"
                    >
                      {linearStatus === 'saving' ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-white/60" />
                          Salvataggio…
                        </>
                      ) : (
                        <>
                          Salva e continua
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleCompleteLinear()}
                      disabled={linearStatus === 'saving' || completing}
                      className="w-full text-sm text-white/30 hover:text-white/60 py-2 transition-colors disabled:opacity-40"
                    >
                      Salta, lo faccio dopo →
                    </button>
                  </div>
                </>
              ) : linearStatus === 'team-select' ? (
                <>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 size={26} className="text-emerald-400" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-white/90 mb-2">API key valida!</h2>
                    <p className="text-sm text-white/40 leading-relaxed">Seleziona il team Linear da sincronizzare:</p>
                  </div>

                  <div className="space-y-2">
                    {linearTeams.length > 0 ? (
                      <select
                        value={selectedTeamId}
                        onChange={(e) => {
                          const team = linearTeams.find(t => t.id === e.target.value);
                          setSelectedTeamId(e.target.value);
                          setSelectedTeamName(team?.name ?? '');
                        }}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 appearance-none"
                      >
                        <option value="" disabled className="bg-[#1a1a1f]">Seleziona un team</option>
                        {linearTeams.map((team) => (
                          <option key={team.id} value={team.id} className="bg-[#1a1a1f]">
                            {team.name} ({team.key})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-red-400/80">Nessun team trovato.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleCompleteLinear(selectedTeamId, selectedTeamName)}
                      disabled={!selectedTeamId || completing}
                      className="w-full flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium rounded-xl py-2.5 transition-all duration-200 disabled:opacity-40"
                    >
                      {completing ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-white/60" />
                          Configurazione…
                        </>
                      ) : (
                        'Completa'
                      )}
                    </button>

                    <button
                      onClick={() => handleCompleteLinear()}
                      disabled={completing}
                      className="w-full text-sm text-white/30 hover:text-white/60 py-2 transition-colors disabled:opacity-40"
                    >
                      Salta, lo faccio dopo →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <AlertCircle size={26} className="text-red-400" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-white/90 mb-2">Errore durante la configurazione</h2>
                    <p className="text-sm text-white/40 leading-relaxed">{linearError}</p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setLinearStatus('idle')}
                      className="w-full flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 hover:text-white text-sm font-medium rounded-xl py-2.5 transition-all duration-200"
                    >
                      Riprova
                    </button>

                    <button
                      onClick={() => handleCompleteLinear()}
                      disabled={completing}
                      className="w-full text-sm text-white/30 hover:text-white/60 py-2 transition-colors disabled:opacity-40"
                    >
                      Salta, lo faccio dopo →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
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
