"use client";

import { DataError } from "@/components/ui/DataError";
import { Input } from "@/components/watermelon-ui/input";
import { Card } from "@/components/watermelon-ui/card";
import { Button } from "@/components/watermelon-ui/button";
import { useState, useRef } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { useCreateBodyMeasurement, useUserBodyProfile, useUpsertUserBodyProfile } from "@/hooks/useBodyMeasurements";
import { calcBodyComposition } from "@/lib/bodyComposition";
import { Select } from "@/components/ui/Select";
import type { CreateBodyMeasurementInput } from "@/types";

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function NumInput({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-wm-muted-foreground">{label}</label>
      <div className="relative">
        <Input
          aria-label={label}
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="wm-field w-full pr-8"
          placeholder="—"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-wm-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

export function MeasurementForm() {
  const { data: profile, isError: profileError, refetch: retryProfile } = useUserBodyProfile();
  const savingMeasurement = useRef(false);
  const savingProfile = useRef(false);
  const createMeasurement = useCreateBodyMeasurement();
  const upsertProfile = useUpsertUserBodyProfile();

  const today = toLocalDateStr(new Date());
  const [date, setDate] = useState(today);

  // Peso
  const [weight, setWeight] = useState("");

  // Plicometrie
  const [showSkinfolds, setShowSkinfolds] = useState(false);
  const [skinfoldChest, setSkinfoldChest] = useState("");
  const [skinfoldAbdomen, setSkinfoldAbdomen] = useState("");
  const [skinfoldThigh, setSkinfoldThigh] = useState("");
  const [skinfoldTricep, setSkinfoldTricep] = useState("");
  const [skinfoldSuprailiac, setSkinfoldSuprailiac] = useState("");
  const [skinfoldSubscapular, setSkinfoldSubscapular] = useState("");
  const [skinfoldMidaxillary, setSkinfoldMidaxillary] = useState("");

  // Circonferenze
  const [showCircumferences, setShowCircumferences] = useState(false);
  const [circWaist, setCircWaist] = useState("");
  const [circHip, setCircHip] = useState("");
  const [circChest, setCircChest] = useState("");
  const [circArm, setCircArm] = useState("");
  const [circForearm, setCircForearm] = useState("");
  const [circThigh, setCircThigh] = useState("");
  const [circCalf, setCircCalf] = useState("");
  const [circNeck, setCircNeck] = useState("");

  // Profilo inline
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileHeight, setProfileHeight] = useState("");
  const [profileSex, setProfileSex] = useState<"male" | "female">("male");
  const [profileBirth, setProfileBirth] = useState("");

  const [error, setError] = useState<string | null>(null);

  const parseOpt = (v: string): number | undefined =>
    v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) > 0 ? parseFloat(v) : undefined;

  // Preview % grasso in tempo reale
  const previewFat = (): number | null => {
    if (!profile) return null;
    const input: CreateBodyMeasurementInput = {
      measured_at: date,
      weight_kg: parseOpt(weight),
      skinfold_chest: parseOpt(skinfoldChest),
      skinfold_abdomen: parseOpt(skinfoldAbdomen),
      skinfold_thigh: parseOpt(skinfoldThigh),
      skinfold_tricep: parseOpt(skinfoldTricep),
      skinfold_suprailiac: parseOpt(skinfoldSuprailiac),
      skinfold_subscapular: parseOpt(skinfoldSubscapular),
      skinfold_midaxillary: parseOpt(skinfoldMidaxillary),
    };
    const result = calcBodyComposition(input, profile);
    return result.body_fat_pct;
  };

  const fatPreview = previewFat();

  const handleSaveProfile = async () => {
    if (savingProfile.current) return;
    setError(null);
    const h = parseFloat(profileHeight);
    if (!h || h < 100 || h > 250) {
      setError("Altezza non valida (100-250 cm)");
      return;
    }
    if (!profileBirth) {
      setError("Inserisci la data di nascita");
      return;
    }
    savingProfile.current = true;
    try {
      await upsertProfile.mutateAsync({ height_cm: h, sex: profileSex, birth_date: profileBirth });
      setShowProfileForm(false);
    } catch {
      setError("Errore nel salvataggio del profilo");
    } finally {
      savingProfile.current = false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingMeasurement.current) return;
    setError(null);

    if (!date) {
      setError("La data è obbligatoria");
      return;
    }

    // Verifica che almeno un campo sia compilato
    const allValues = [
      weight,
      skinfoldChest,
      skinfoldAbdomen,
      skinfoldThigh,
      skinfoldTricep,
      skinfoldSuprailiac,
      skinfoldSubscapular,
      skinfoldMidaxillary,
      circWaist,
      circHip,
      circChest,
      circArm,
      circForearm,
      circThigh,
      circCalf,
      circNeck,
    ];
    if (allValues.every((v) => v.trim() === "")) {
      setError("Inserisci almeno una misurazione");
      return;
    }

    const input: CreateBodyMeasurementInput = {
      measured_at: date,
      weight_kg: parseOpt(weight),
      skinfold_chest: parseOpt(skinfoldChest),
      skinfold_abdomen: parseOpt(skinfoldAbdomen),
      skinfold_thigh: parseOpt(skinfoldThigh),
      skinfold_tricep: parseOpt(skinfoldTricep),
      skinfold_suprailiac: parseOpt(skinfoldSuprailiac),
      skinfold_subscapular: parseOpt(skinfoldSubscapular),
      skinfold_midaxillary: parseOpt(skinfoldMidaxillary),
      circ_waist: parseOpt(circWaist),
      circ_hip: parseOpt(circHip),
      circ_chest: parseOpt(circChest),
      circ_arm: parseOpt(circArm),
      circ_forearm: parseOpt(circForearm),
      circ_thigh: parseOpt(circThigh),
      circ_calf: parseOpt(circCalf),
      circ_neck: parseOpt(circNeck),
    };

    if (allValues.some((value) => value.trim() !== "" && (!Number.isFinite(Number(value)) || Number(value) <= 0))) {
      setError("Inserisci misurazioni numeriche maggiori di zero.");
      return;
    }
    savingMeasurement.current = true;
    try {
      await createMeasurement.mutateAsync(input);
      // Reset form
      setWeight("");
      setDate(today);
      setSkinfoldChest("");
      setSkinfoldAbdomen("");
      setSkinfoldThigh("");
      setSkinfoldTricep("");
      setSkinfoldSuprailiac("");
      setSkinfoldSubscapular("");
      setSkinfoldMidaxillary("");
      setCircWaist("");
      setCircHip("");
      setCircChest("");
      setCircArm("");
      setCircForearm("");
      setCircThigh("");
      setCircCalf("");
      setCircNeck("");
    } catch {
      setError("Errore durante il salvataggio");
    } finally {
      savingMeasurement.current = false;
    }
  };

  return (
    <Card className="wm-panel-flat h-full space-y-5 p-5">
      {profileError && <DataError message="Profilo corporeo non disponibile." onRetry={() => void retryProfile()} />}
      <div>
        <p className="wm-eyebrow">Misurazioni</p>
        <h3 className="wm-card-title mt-2">Nuova sessione</h3>
      </div>

      {/* Banner profilo mancante */}
      {!profile && (
        <div className="space-y-2 rounded-lg border border-fitness/20 bg-fitness/10 p-3">
          <div className="flex items-start gap-2">
            <Info size={14} className="mt-0.5 shrink-0 text-fitness" />
            <p className="text-xs text-fitness">
              Inserisci il tuo profilo per calcolare automaticamente % grasso e composizione corporea.
            </p>
          </div>
          {!showProfileForm ? (
            <Button
              variant="ghost"
              size="auto"
              onClick={() => setShowProfileForm(true)}
              className="text-xs text-fitness underline hover:text-wm-foreground"
            >
              Inserisci profilo →
            </Button>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <NumInput label="Altezza" value={profileHeight} onChange={setProfileHeight} unit="cm" />
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-wm-muted-foreground">Sesso</label>
                  <Select
                    aria-label="Sesso"
                    value={profileSex}
                    onChange={(v) => setProfileSex(v as "male" | "female")}
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
                  value={profileBirth}
                  onChange={(e) => setProfileBirth(e.target.value)}
                  className="wm-field w-full"
                />
              </div>
              <Button
                variant="default"
                size="auto"
                onClick={handleSaveProfile}
                disabled={upsertProfile.isPending}
                className="wm-action w-full"
              >
                {upsertProfile.isPending ? "Salvataggio..." : "Salva profilo"}
              </Button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Base: data + peso */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-wm-muted-foreground">Data</label>
            <Input
              aria-label="Data"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="wm-field w-full"
            />
          </div>
          <NumInput label="Peso" value={weight} onChange={setWeight} unit="kg" />
        </div>

        {/* Preview % grasso */}
        {fatPreview !== null && (
          <div className="flex items-center gap-2 rounded-lg border border-fitness/20 bg-fitness/10 p-2">
            <span className="text-xs text-wm-muted-foreground">% Grasso stimata:</span>
            <span className="font-mono text-sm font-medium tabular-nums text-fitness">{fatPreview}%</span>
          </div>
        )}

        {/* Sezione plicometrie */}
        <div>
          <Button
            variant="ghost"
            size="auto"
            type="button"
            onClick={() => setShowSkinfolds((v) => !v)}
            aria-expanded={showSkinfolds}
            className="flex items-center gap-2 text-xs text-wm-muted-foreground hover:text-wm-foreground transition-colors w-full"
          >
            {showSkinfolds ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Plicometrie (mm)
          </Button>
          {showSkinfolds && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <NumInput label="Petto" value={skinfoldChest} onChange={setSkinfoldChest} unit="mm" />
              <NumInput label="Addome" value={skinfoldAbdomen} onChange={setSkinfoldAbdomen} unit="mm" />
              <NumInput label="Coscia" value={skinfoldThigh} onChange={setSkinfoldThigh} unit="mm" />
              <NumInput label="Tricipite" value={skinfoldTricep} onChange={setSkinfoldTricep} unit="mm" />
              <NumInput label="Soprailiaca" value={skinfoldSuprailiac} onChange={setSkinfoldSuprailiac} unit="mm" />
              <NumInput
                label="Sottoscapolare"
                value={skinfoldSubscapular}
                onChange={setSkinfoldSubscapular}
                unit="mm"
              />
              <NumInput label="Ascellare" value={skinfoldMidaxillary} onChange={setSkinfoldMidaxillary} unit="mm" />
            </div>
          )}
        </div>

        {/* Sezione circonferenze */}
        <div>
          <Button
            variant="ghost"
            size="auto"
            type="button"
            onClick={() => setShowCircumferences((v) => !v)}
            aria-expanded={showCircumferences}
            className="flex items-center gap-2 text-xs text-wm-muted-foreground hover:text-wm-foreground transition-colors w-full"
          >
            {showCircumferences ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Circonferenze (cm)
          </Button>
          {showCircumferences && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <NumInput label="Vita" value={circWaist} onChange={setCircWaist} unit="cm" />
              <NumInput label="Fianchi" value={circHip} onChange={setCircHip} unit="cm" />
              <NumInput label="Petto" value={circChest} onChange={setCircChest} unit="cm" />
              <NumInput label="Braccio" value={circArm} onChange={setCircArm} unit="cm" />
              <NumInput label="Avambraccio" value={circForearm} onChange={setCircForearm} unit="cm" />
              <NumInput label="Coscia" value={circThigh} onChange={setCircThigh} unit="cm" />
              <NumInput label="Polpaccio" value={circCalf} onChange={setCircCalf} unit="cm" />
              <NumInput label="Collo" value={circNeck} onChange={setCircNeck} unit="cm" />
            </div>
          )}
        </div>

        {error && <p className="text-xs text-wm-destructive">{error}</p>}

        <Button
          variant="default"
          size="auto"
          type="submit"
          disabled={createMeasurement.isPending}
          className="wm-action w-full"
        >
          {createMeasurement.isPending ? "Salvataggio..." : "Salva sessione"}
        </Button>
      </form>
    </Card>
  );
}
