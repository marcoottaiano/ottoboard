"use client";

import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { AppDialog } from "@/components/ui/AppDialog";
import { Card } from "@/components/watermelon-ui/card";
import { Button } from "@/components/watermelon-ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/watermelon-ui/table";
import { useState } from "react";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useDeleteBodyMeasurement } from "@/hooks/useBodyMeasurements";
import type { BodyMeasurement } from "@/types";
import { PrivacyValue } from "@/components/ui/PrivacyValue";

const PAGE_SIZE = 20;

interface DetailModalProps {
  m: BodyMeasurement;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

function DetailModal({ m, onClose, onDelete, isDeleting }: DetailModalProps) {
  const [confirming, setConfirming] = useState(false);
  const fields: { label: string; value: number | undefined; unit: string }[] = [
    { label: "Peso", value: m.weight_kg, unit: "kg" },
    { label: "% Grasso", value: m.body_fat_pct, unit: "%" },
    { label: "Massa magra", value: m.lean_mass_kg, unit: "kg" },
    { label: "Massa grassa", value: m.fat_mass_kg, unit: "kg" },
    { label: "Vita", value: m.circ_waist, unit: "cm" },
    { label: "Fianchi", value: m.circ_hip, unit: "cm" },
    { label: "Petto (circ.)", value: m.circ_chest, unit: "cm" },
    { label: "Braccio", value: m.circ_arm, unit: "cm" },
    { label: "Avambraccio", value: m.circ_forearm, unit: "cm" },
    { label: "Coscia", value: m.circ_thigh, unit: "cm" },
    { label: "Polpaccio", value: m.circ_calf, unit: "cm" },
    { label: "Collo", value: m.circ_neck, unit: "cm" },
    { label: "Plica petto", value: m.skinfold_chest, unit: "mm" },
    { label: "Plica addome", value: m.skinfold_abdomen, unit: "mm" },
    { label: "Plica coscia", value: m.skinfold_thigh, unit: "mm" },
    { label: "Plica tricipite", value: m.skinfold_tricep, unit: "mm" },
    { label: "Plica soprailiaca", value: m.skinfold_suprailiac, unit: "mm" },
    { label: "Plica sottoscapolare", value: m.skinfold_subscapular, unit: "mm" },
    { label: "Plica ascellare", value: m.skinfold_midaxillary, unit: "mm" },
  ].filter((f) => f.value != null);

  return (
    <AppDialog
      title={`Sessione ${m.measured_at}`}
      description="Dettaglio delle misurazioni corporee."
      onClose={onClose}
      busy={isDeleting}
      className="max-w-lg"
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-[10px] text-wm-muted-foreground">{f.label}</p>
            <p className="text-sm text-wm-foreground font-medium">
              <PrivacyValue>
                {f.value} {f.unit}
              </PrivacyValue>
            </p>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="auto"
        onClick={() => setConfirming(true)}
        disabled={isDeleting}
        className="flex items-center gap-2 text-xs text-wm-destructive hover:text-wm-destructive disabled:opacity-50 transition-colors"
      >
        <Trash2 size={13} />
        {isDeleting ? "Eliminazione..." : "Elimina sessione"}
      </Button>
      <ConfirmDeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Eliminare la sessione?"
        description="Le misurazioni di questa sessione verranno eliminate definitivamente."
        onConfirm={() => onDelete(m.id)}
      />
    </AppDialog>
  );
}

interface Props {
  measurements: BodyMeasurement[];
}

export function MeasurementHistoryTable({ measurements }: Props) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<BodyMeasurement | null>(null);
  const deleteMeasurement = useDeleteBodyMeasurement();

  const totalPages = Math.ceil(measurements.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const pageData = measurements.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleDelete = async (id: string) => {
    await deleteMeasurement.mutateAsync(id);
    setSelected(null);
  };

  if (measurements.length === 0) {
    return (
      <Card className="wm-panel-flat flex h-24 items-center justify-center p-4">
        <p className="text-xs text-wm-muted-foreground">Nessuna sessione registrata</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="wm-panel-flat overflow-hidden">
        <div className="space-y-3 p-3 md:hidden">
          {pageData.map((measurement) => (
            <button
              key={measurement.id}
              type="button"
              onClick={() => setSelected(measurement)}
              className="block w-full min-w-0 space-y-3 rounded-xl border border-wm-border p-4 text-left transition-colors hover:bg-wm-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-ring"
            >
              <span className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <time dateTime={measurement.measured_at} className="font-medium">
                  {new Date(measurement.measured_at + "T12:00:00").toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
                <span className="inline-flex items-center gap-1 text-xs text-wm-primary">
                  Dettagli
                  <ChevronRight size={16} aria-hidden="true" />
                </span>
              </span>
              <span className="grid grid-cols-2 gap-3">
                {[
                  { label: "Peso", value: measurement.weight_kg, unit: "kg" },
                  { label: "Grasso corporeo", value: measurement.body_fat_pct, unit: "%" },
                  { label: "Massa magra", value: measurement.lean_mass_kg, unit: "kg" },
                  { label: "Vita", value: measurement.circ_waist, unit: "cm" },
                ].map(({ label, value, unit }) => (
                  <span key={label} className="min-w-0">
                    <span className="block text-xs text-wm-muted-foreground">{label}</span>
                    <PrivacyValue className="mt-1 block break-words font-mono text-sm">
                      {value == null ? "—" : `${value} ${unit}`}
                    </PrivacyValue>
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <Table className="w-full text-xs">
            <TableHeader>
              <TableRow className="border-b border-wm-border">
                <TableHead className="text-left px-4 py-3 text-wm-muted-foreground font-medium">Data</TableHead>
                <TableHead className="text-right px-3 py-3 text-wm-muted-foreground font-medium">Peso</TableHead>
                <TableHead className="text-right px-3 py-3 text-wm-muted-foreground font-medium">% Grasso</TableHead>
                <TableHead className="text-right px-3 py-3 text-wm-muted-foreground font-medium">Massa magra</TableHead>
                <TableHead className="text-right px-3 py-3 text-wm-muted-foreground font-medium hidden sm:table-cell">
                  Σ Pliche
                </TableHead>
                <TableHead className="text-right px-3 py-3 text-wm-muted-foreground font-medium hidden sm:table-cell">
                  Vita
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((m) => {
                const sumPliche = [
                  m.skinfold_chest,
                  m.skinfold_abdomen,
                  m.skinfold_thigh,
                  m.skinfold_tricep,
                  m.skinfold_suprailiac,
                  m.skinfold_subscapular,
                  m.skinfold_midaxillary,
                ]
                  .filter(Boolean)
                  .reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
                return (
                  <TableRow
                    key={m.id}
                    className="border-b border-wm-border hover:bg-wm-muted cursor-pointer transition-colors"
                    onClick={() => setSelected(m)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(m);
                      }
                    }}
                    tabIndex={0}
                  >
                    <TableCell className="px-4 py-3 text-wm-foreground">{m.measured_at}</TableCell>
                    <TableCell className="px-3 py-3 text-right text-wm-foreground">
                      <PrivacyValue>{m.weight_kg != null ? `${m.weight_kg} kg` : "—"}</PrivacyValue>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right text-fitness">
                      <PrivacyValue>{m.body_fat_pct != null ? `${m.body_fat_pct}%` : "—"}</PrivacyValue>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right text-wm-chart-teal">
                      <PrivacyValue>{m.lean_mass_kg != null ? `${m.lean_mass_kg} kg` : "—"}</PrivacyValue>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right text-wm-foreground hidden sm:table-cell">
                      <PrivacyValue>{sumPliche ? `${sumPliche} mm` : "—"}</PrivacyValue>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right text-wm-foreground hidden sm:table-cell">
                      <PrivacyValue>{m.circ_waist != null ? `${m.circ_waist} cm` : "—"}</PrivacyValue>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-wm-border">
            <span className="text-xs text-wm-muted-foreground">
              {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, measurements.length)} di{" "}
              {measurements.length}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="auto"
                aria-label="Pagina precedente"
                onClick={() => setPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-1 rounded hover:bg-wm-muted disabled:opacity-30 transition-colors text-wm-muted-foreground"
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                variant="ghost"
                size="auto"
                aria-label="Pagina successiva"
                onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                className="p-1 rounded hover:bg-wm-muted disabled:opacity-30 transition-colors text-wm-muted-foreground"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {selected && (
        <DetailModal
          m={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          isDeleting={deleteMeasurement.isPending}
        />
      )}
    </>
  );
}
