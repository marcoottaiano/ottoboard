"use client";

import { DataError } from "@/components/ui/DataError";
import { AppDialog } from "@/components/ui/AppDialog";
import { Button } from "@/components/watermelon-ui/button";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Activity, BarChart2, Wallet, PiggyBank, BellRing, TrendingUp } from "lucide-react";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { Select } from "@/components/ui/Select";
import { useAddWidget, useUpdateWidgetConfig, WidgetType, DashboardWidget } from "@/hooks/useDashboardWidgets";

// ─── Widget type catalogue ────────────────────────────────────────────────────

interface WidgetEntry {
  type: WidgetType;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const WIDGET_CATALOGUE: WidgetEntry[] = [
  {
    type: "last-activity",
    icon: <Activity size={20} />,
    label: "Ultima attività",
    description: "Ultima sessione Strava",
  },
  {
    type: "week-stats",
    icon: <BarChart2 size={20} />,
    label: "Stats settimanali",
    description: "Riepilogo fitness della settimana",
  },
  {
    type: "month-finance",
    icon: <Wallet size={20} />,
    label: "Spese mensili",
    description: "Spese e categorie del mese corrente",
  },
  {
    type: "total-balance",
    icon: <PiggyBank size={20} />,
    label: "Saldo totale",
    description: "Bilancio complessivo entrate/uscite",
  },
  {
    type: "reminders",
    icon: <BellRing size={20} />,
    label: "Promemoria",
    description: "Lista promemoria e scadenze",
  },
  {
    type: "financial-goal",
    icon: <TrendingUp size={20} />,
    label: "Obiettivo risparmio",
    description: "Progresso verso un obiettivo finanziario",
  },
];

// ─── Add widget modal ─────────────────────────────────────────────────────────

interface AddWidgetModalProps {
  onClose: () => void;
  existingTypes: WidgetType[];
  allowedTypes?: WidgetType[];
}

const SINGLETON_TYPES: WidgetType[] = ["last-activity", "week-stats", "month-finance", "total-balance", "reminders"];

export function AddWidgetModal({ onClose, existingTypes, allowedTypes }: AddWidgetModalProps) {
  const [selected, setSelected] = useState<WidgetType | null>(null);
  const [goalId, setGoalId] = useState("");
  const addWidget = useAddWidget();
  const saving = useRef(false);
  const { data: goals = [], isLoading: goalsLoading, isError: goalsError, refetch: retryGoals } = useFinancialGoals();

  const visibleCatalogue = WIDGET_CATALOGUE.filter((w) => {
    if (allowedTypes && !allowedTypes.includes(w.type)) return false;
    if (SINGLETON_TYPES.includes(w.type)) {
      return !existingTypes.includes(w.type);
    }
    return true;
  });

  const canAdd = selected !== null && (selected !== "financial-goal" || (!!goalId && !goalsError && !goalsLoading));

  const handleAdd = () => {
    if (saving.current || !selected || !canAdd) return;
    saving.current = true;
    const config = selected === "financial-goal" ? { goalId } : {};
    addWidget.mutate(
      { type: selected, config },
      {
        onSettled: () => {
          saving.current = false;
        },
        onSuccess: onClose,
        onError: () => toast.error("Errore durante l'aggiunta del widget"),
      },
    );
  };

  return (
    <AppDialog
      title="Aggiungi widget"
      description="Scegli un approfondimento per la Home."
      onClose={onClose}
      busy={addWidget.isPending}
      className="max-w-lg"
    >
      {/* Header */}

      {/* Widget tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleCatalogue.map((w) => (
          <Button
            variant="ghost"
            size="auto"
            key={w.type}
            aria-pressed={selected === w.type}
            onClick={() => {
              setSelected(w.type);
              setGoalId("");
            }}
            className={`flex min-w-0 flex-col items-start gap-2 whitespace-normal p-4 rounded-xl border text-left transition-colors ${
              selected === w.type
                ? "bg-wm-primary/15 border-wm-primary/40 text-wm-primary"
                : "bg-wm-muted border-wm-border text-wm-muted-foreground hover:bg-wm-muted hover:border-wm-border"
            }`}
          >
            <span className={selected === w.type ? "text-wm-primary" : "text-wm-muted-foreground"}>{w.icon}</span>
            <div>
              <p className="text-xs font-medium">{w.label}</p>
              <p className="text-sm text-wm-muted-foreground mt-1">{w.description}</p>
            </div>
          </Button>
        ))}
        {visibleCatalogue.length === 0 && (
          <p className="sm:col-span-2 text-xs text-wm-muted-foreground text-center py-4">
            Tutti i widget sono già presenti nella dashboard.
          </p>
        )}
      </div>

      {/* Financial goal picker */}
      {selected === "financial-goal" && (
        <div className="px-4 pb-2">
          {goalsError && <DataError onRetry={() => void retryGoals()} />}
          <Select
            disabled={goalsLoading || goalsError}
            value={goalId}
            onChange={setGoalId}
            dropUp
            options={goals.map((g) => ({ value: g.id, label: `${g.icon ?? ""} ${g.name}`.trim() }))}
            placeholder="Seleziona obiettivo..."
            showPlaceholder={false}
          />
          {!goalsLoading && !goalsError && goals.length === 0 && (
            <p className="text-xs text-wm-muted-foreground mt-1">Nessun obiettivo creato. Creane uno in /finance.</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-4 border-t border-wm-border flex justify-end">
        <Button
          variant="default"
          size="auto"
          onClick={handleAdd}
          disabled={!canAdd || addWidget.isPending}
          className="w-full sm:w-auto px-4 py-2 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {addWidget.isPending ? "Aggiunta..." : "Aggiungi"}
        </Button>
      </div>
    </AppDialog>
  );
}

// ─── Configure widget modal (financial-goal only) ─────────────────────────────

interface ConfigureWidgetModalProps {
  widget: DashboardWidget;
  onClose: () => void;
}

export function ConfigureWidgetModal({ widget, onClose }: ConfigureWidgetModalProps) {
  const [goalId, setGoalId] = useState(widget.config.goalId ?? "");
  const updateConfig = useUpdateWidgetConfig();
  const saving = useRef(false);
  const { data: goals = [], isLoading: goalsLoading, isError: goalsError, refetch: retryGoals } = useFinancialGoals();

  const canSave = widget.type === "financial-goal" && !!goalId && !goalsError && !goalsLoading;

  const handleSave = () => {
    if (saving.current || !canSave) return;
    saving.current = true;
    updateConfig.mutate(
      { id: widget.id, config: { goalId } },
      {
        onSuccess: onClose,
        onError: () => toast.error("Salvataggio non riuscito. Riprova."),
        onSettled: () => {
          saving.current = false;
        },
      },
    );
  };

  return (
    <AppDialog
      title="Configura widget"
      description="Scegli l’obiettivo da mostrare."
      onClose={onClose}
      busy={updateConfig.isPending}
      className="max-w-lg"
    >
      {/* Header */}

      {/* Pickers */}
      <div className="p-4">
        {widget.type === "financial-goal" && (
          <>
            {goalsError && <DataError onRetry={() => void retryGoals()} />}
            <Select
              disabled={goalsLoading || goalsError}
              value={goalId}
              onChange={setGoalId}
              dropUp
              options={goals.map((g) => ({ value: g.id, label: `${g.icon ?? ""} ${g.name}`.trim() }))}
              placeholder="Seleziona obiettivo..."
              showPlaceholder={false}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-wm-border flex justify-end">
        <Button
          variant="default"
          size="auto"
          onClick={handleSave}
          disabled={!canSave || updateConfig.isPending}
          className="w-full sm:w-auto px-4 py-2 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {updateConfig.isPending ? "Salvataggio..." : "Salva"}
        </Button>
      </div>
    </AppDialog>
  );
}
