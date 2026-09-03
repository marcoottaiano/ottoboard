"use client";

import { Card } from "@/components/watermelon-ui/card";
import { DataError } from "@/components/ui/DataError";
import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/watermelon-ui/input";
import { useState, useRef } from "react";
import { Ruler, Edit2, Check, X } from "lucide-react";
import { useUserBodyProfile, useUpsertUserBodyProfile } from "@/hooks/useBodyMeasurements";
import { Select } from "@/components/ui/Select";

export function BodyProfileSection() {
  const { data: profile, isLoading, isError, refetch } = useUserBodyProfile();
  const submitting = useRef(false);
  const upsert = useUpsertUserBodyProfile();

  const [editing, setEditing] = useState(false);
  const [height, setHeight] = useState("");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setHeight(profile ? String(profile.height_cm) : "");
    setSex(profile?.sex ?? "male");
    setBirthDate(profile?.birth_date ?? "");
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (submitting.current) return;
    setError(null);
    const h = parseFloat(height);
    if (!h || h < 100 || h > 250) {
      setError("Altezza non valida (100–250 cm)");
      return;
    }
    if (!birthDate) {
      setError("Data di nascita obbligatoria");
      return;
    }
    submitting.current = true;
    try {
      await upsert.mutateAsync({ height_cm: h, sex, birth_date: birthDate });
      setEditing(false);
    } catch {
      setError("Errore nel salvataggio");
    } finally {
      submitting.current = false;
    }
  };

  const handleCancel = () => {
    if (submitting.current) return;
    if (profile) {
      setHeight(String(profile.height_cm));
      setSex(profile.sex);
      setBirthDate(profile.birth_date);
    }
    setError(null);
    setEditing(false);
  };

  const calcAge = (bd: string) => {
    const birth = new Date(bd);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    )
      age--;
    return age;
  };

  return (
    <Card className="rounded-xl border border-wm-border bg-wm-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Ruler size={16} className="text-wm-fitness" />
          <h2 className="text-sm font-semibold text-wm-foreground">Profilo corporeo</h2>
        </div>
        {!editing && (
          <Button
            variant="ghost"
            size="auto"
            onClick={startEditing}
            className="flex items-center gap-1.5 text-xs text-wm-muted-foreground hover:text-wm-foreground transition-colors"
          >
            <Edit2 size={13} />
            {profile ? "Modifica" : "Configura"}
          </Button>
        )}
      </div>

      {isError ? (
        <DataError onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="h-16 animate-pulse bg-wm-muted rounded-lg" />
      ) : !editing ? (
        profile ? (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-wm-muted-foreground mb-0.5">Altezza</p>
              <p className="text-sm text-wm-foreground font-medium">{profile.height_cm} cm</p>
            </div>
            <div>
              <p className="text-[10px] text-wm-muted-foreground mb-0.5">Sesso</p>
              <p className="text-sm text-wm-foreground font-medium">{profile.sex === "male" ? "Uomo" : "Donna"}</p>
            </div>
            <div>
              <p className="text-[10px] text-wm-muted-foreground mb-0.5">Età</p>
              <p className="text-sm text-wm-foreground font-medium">{calcAge(profile.birth_date)} anni</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-wm-muted-foreground">
            Aggiungi altezza, sesso e data di nascita per calcolare la composizione corporea nella tab Fitness.
          </p>
        )
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-wm-muted-foreground">Altezza</label>
              <div className="relative">
                <Input
                  aria-label="Altezza"
                  type="number"
                  min="100"
                  max="250"
                  step="0.5"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-wm-muted border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-foreground pr-8 focus:outline-hidden focus:border-wm-fitness/50"
                  placeholder="175"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-wm-muted-foreground">cm</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-wm-muted-foreground">Sesso</label>
              <Select
                aria-label="Sesso"
                value={sex}
                onChange={(v) => setSex(v as "male" | "female")}
                options={[
                  { value: "male", label: "Uomo" },
                  { value: "female", label: "Donna" },
                ]}
                showPlaceholder={false}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-wm-muted-foreground">Data di nascita</label>
            <Input
              aria-label="Data di nascita"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="bg-wm-muted border border-wm-border rounded-lg px-3 py-2 text-sm text-wm-foreground focus:outline-hidden focus:border-wm-fitness/50"
            />
          </div>
          {error && <p className="text-xs text-wm-destructive">{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="default"
              size="auto"
              onClick={handleSave}
              disabled={upsert.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
            >
              <Check size={13} />
              {upsert.isPending ? "Salvataggio..." : "Salva"}
            </Button>
            <Button
              variant="ghost"
              size="auto"
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-wm-muted text-wm-muted-foreground text-xs hover:text-wm-foreground transition-colors"
            >
              <X size={13} />
              Annulla
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
