"use client";

import { Button } from "@/components/watermelon-ui/button";

import { seedDefaultCategories } from "@/lib/finance/seedCategories";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { useRef, useState } from "react";

interface Props {
  onDone: () => void;
}

export function FirstTimeSetup({ onDone }: Props) {
  const queryClient = useQueryClient();
  const submitting = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSeedDefault = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await seedDefaultCategories(user.id, supabase);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      onDone();
    } catch {
      setError("Errore durante la configurazione");
    } finally {
      setIsLoading(false);
      submitting.current = false;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="w-16 h-16 rounded-2xl bg-wm-success/10 border border-wm-success/20 flex items-center justify-center mb-6">
        <Wallet size={28} className="text-wm-primary" />
      </div>
      <h2 className="text-xl font-bold text-wm-foreground mb-2">Benvenuto nel modulo finanze</h2>
      <p className="text-wm-muted-foreground text-sm text-center mb-8 max-w-sm">
        Per iniziare, scegli se usare le categorie predefinite (Cibo, Sport, Trasporti…) oppure partire da zero.
      </p>

      {error && <p className="text-wm-destructive text-sm mb-4">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSeedDefault}
          disabled={isLoading}
          className="h-auto min-h-10 flex-1 py-2.5 px-4 rounded-xl bg-wm-success/20 border border-wm-success/30 text-wm-primary text-sm font-medium hover:bg-wm-success/30 transition-colors disabled:opacity-50"
        >
          {isLoading ? "Configurando..." : "Usa categorie default"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={isLoading}
          onClick={onDone}
          className="flex-1 py-2.5 px-4 rounded-xl bg-wm-muted border border-wm-border text-wm-muted-foreground text-sm hover:bg-wm-muted transition-colors"
        >
          Inizia da zero
        </Button>
      </div>
    </div>
  );
}
