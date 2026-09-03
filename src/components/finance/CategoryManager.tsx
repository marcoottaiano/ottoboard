"use client";

import { Button } from "@/components/watermelon-ui/button";
import { Input } from "@/components/watermelon-ui/input";
import { Card } from "@/components/watermelon-ui/card";

import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { DataError } from "@/components/ui/DataError";
import { useCategories } from "@/hooks/useCategories";
import { useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useFinanceMutations";
import { Select, SelectOption } from "@/components/ui/Select";
import { Category, CategoryType } from "@/types";
import { ChevronDown, ChevronUp, Pencil, Plus, Settings2, Trash2, X, Check } from "lucide-react";
import { useRef, useState } from "react";

// ─── Costanti ──────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#10b981",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#a855f7",
  "#6b7280",
];

const QUICK_ICONS = ["🏠", "🍔", "🚗", "💊", "🎬", "📱", "🛍️", "✈️", "💰", "🎓", "💼", "🍕", "🏋️", "🎮", "🐶"];

const SPENDING_OPTIONS: SelectOption[] = [
  { value: "needs", label: "Necessaria — 50%" },
  { value: "wants", label: "Accessoria — 30%" },
  { value: "savings", label: "Risparmio — 20%" },
];

const TYPE_OPTIONS: SelectOption[] = [
  { value: "expense", label: "Uscita" },
  { value: "income", label: "Entrata" },
  { value: "both", label: "Entrambi" },
];

const SPENDING_BADGE: Record<string, string> = {
  needs: "Necessaria",
  wants: "Accessoria",
  savings: "Risparmio",
};

// ─── ColorPicker ──────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESET_COLORS.map((c) => (
        <Button
          variant="ghost"
          size="sm"
          key={c}
          type="button"
          aria-label={`Colore ${c}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={`p-0 w-5 h-5 rounded-full transition-transform flex-shrink-0 ${value === c ? "scale-125 ring-2 ring-wm-ring" : "hover:scale-110"}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

// ─── IconPicker ───────────────────────────────────────────────────────────────

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Input
        type="text"
        placeholder="🏷️"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 bg-wm-muted border border-wm-border rounded-lg px-1.5 py-1.5 text-sm text-wm-foreground text-center focus:outline-hidden focus:border-wm-border"
        maxLength={16}
      />
      <div className="flex gap-1 flex-wrap">
        {QUICK_ICONS.map((icon) => (
          <Button
            variant="ghost"
            size="sm"
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={`p-0 w-7 h-7 rounded text-base hover:bg-wm-muted transition-colors flex items-center justify-center ${value === icon ? "bg-wm-muted ring-1 ring-wm-ring" : ""}`}
          >
            {icon}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ─── CategoryRow ──────────────────────────────────────────────────────────────

function CategoryRow({ category }: { category: Category }) {
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saving = useRef(false);
  const [confirming, setConfirming] = useState(false);

  // edit state
  const [editName, setEditName] = useState(category.name);
  const [editIcon, setEditIcon] = useState(category.icon ?? "");
  const [editColor, setEditColor] = useState(category.color ?? PRESET_COLORS[0]);
  const [editSpendingType, setEditSpendingType] = useState(category.spending_type ?? "");

  const startEdit = () => {
    setEditName(category.name);
    setEditIcon(category.icon ?? "");
    setEditColor(category.color ?? PRESET_COLORS[0]);
    setEditSpendingType(category.spending_type ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (saving.current) return;
    saving.current = true;
    setSaveError(null);
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        name: editName.trim() || category.name,
        icon: editIcon.trim() || undefined,
        color: editColor,
        spending_type:
          editSpendingType === "needs" || editSpendingType === "wants" || editSpendingType === "savings"
            ? editSpendingType
            : null,
      });
      setEditing(false);
    } catch {
      setSaveError("Impossibile salvare la categoria. Riprova.");
    } finally {
      saving.current = false;
    }
  };

  if (editing) {
    return (
      <div className="p-3 bg-wm-muted border border-wm-border rounded-lg space-y-3 mb-1">
        {saveError && (
          <p role="alert" className="text-xs text-wm-destructive">
            {saveError}
          </p>
        )}
        <IconPicker value={editIcon} onChange={setEditIcon} />

        <div className="flex flex-wrap gap-2 items-center">
          <Input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 min-w-[140px] bg-wm-muted border border-wm-border rounded-lg px-2 py-1.5 text-sm text-wm-foreground focus:outline-hidden focus:border-wm-border"
          />
          {(category.type === "expense" || category.type === "both") && (
            <Select
              value={editSpendingType}
              onChange={setEditSpendingType}
              options={SPENDING_OPTIONS}
              placeholder="Tipo spesa..."
              className="min-w-[180px]"
            />
          )}
        </div>

        <ColorPicker value={editColor} onChange={setEditColor} />

        <div className="flex gap-2 pt-1">
          <Button
            variant="default"
            size="sm"
            type="button"
            onClick={handleSave}
            disabled={updateCategory.isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-50"
          >
            <Check size={12} /> Salva
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled={updateCategory.isPending}
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 text-xs text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors"
          >
            <X size={12} /> Annulla
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-wm-muted group transition-colors">
      <div className="flex w-full items-center gap-2 min-w-0 sm:w-auto sm:flex-1">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: category.color ?? "#6b7280" }} />
        <span className="break-words text-sm text-wm-muted-foreground sm:truncate">
          {category.icon} {category.name}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        {category.spending_type && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-wm-muted text-wm-muted-foreground hidden sm:inline">
            {SPENDING_BADGE[category.spending_type]}
          </span>
        )}

        <>
          <Button variant="ghost" size="icon-sm" onClick={startEdit} aria-label="Modifica categoria">
            <Pencil size={13} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setConfirming(true)} aria-label="Elimina categoria">
            <Trash2 size={13} />
          </Button>
          <ConfirmDeleteDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Elimina categoria"
            description={`La categoria ${category.name} verrà eliminata. I movimenti esistenti non verranno eliminati.`}
            onConfirm={() => deleteCategory.mutateAsync(category.id)}
          />
        </>
      </div>
    </div>
  );
}

// ─── NewCategoryForm ──────────────────────────────────────────────────────────

function NewCategoryForm({ onClose }: { onClose: () => void }) {
  const createCat = useCreateCategory();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [catType, setCatType] = useState<CategoryType>("expense");
  const [spendingType, setSpendingType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const creating = useRef(false);

  const handleCreate = async () => {
    if (creating.current) return;
    if (!name.trim()) {
      setError("Inserisci un nome");
      return;
    }
    creating.current = true;
    setError(null);
    try {
      await createCat.mutateAsync({
        name: name.trim(),
        icon: icon.trim() || undefined,
        color,
        type: catType,
        spending_type:
          spendingType === "needs" || spendingType === "wants" || spendingType === "savings" ? spendingType : null,
      });
      onClose();
    } catch {
      setError("Errore durante la creazione");
    } finally {
      creating.current = false;
    }
  };

  return (
    <div className="mt-3 p-4 bg-wm-muted border border-wm-border rounded-xl space-y-3">
      <p className="text-xs font-medium text-wm-muted-foreground">Nuova categoria</p>

      <IconPicker value={icon} onChange={setIcon} />

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="text"
          placeholder="Nome categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[160px] bg-wm-muted border border-wm-border rounded-lg px-2 py-1.5 text-sm text-wm-foreground placeholder:text-wm-muted-foreground focus:outline-hidden focus:border-wm-border"
        />
        <Select
          value={catType}
          onChange={(value) => {
            if (value === "income" || value === "expense" || value === "both") setCatType(value);
          }}
          showPlaceholder={false}
          options={TYPE_OPTIONS}
          placeholder="Tipo..."
          className="min-w-[130px]"
        />
        {(catType === "expense" || catType === "both") && (
          <Select
            value={spendingType}
            onChange={setSpendingType}
            options={SPENDING_OPTIONS}
            placeholder="Tipo spesa (50/30/20)..."
            className="min-w-[200px]"
          />
        )}
      </div>

      <ColorPicker value={color} onChange={setColor} />

      {error && <p className="text-xs text-wm-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || createCat.isPending}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-wm-success/20 border border-wm-success/30 text-wm-primary hover:bg-wm-success/30 transition-colors disabled:opacity-50"
        >
          <Plus size={12} /> {createCat.isPending ? "Creando..." : "Crea categoria"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          disabled={createCat.isPending}
          onClick={onClose}
          className="text-xs text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors"
        >
          Annulla
        </Button>
      </div>
    </div>
  );
}

// ─── CategoryManager ──────────────────────────────────────────────────────────

export function CategoryManager() {
  const { data: categories, isLoading, isError, refetch } = useCategories();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  if (isError) return <DataError onRetry={() => void refetch()} message="Impossibile caricare le categorie." />;

  const incomeCategories = (categories ?? []).filter((c) => c.type === "income");
  const expenseCategories = (categories ?? []).filter((c) => c.type === "expense" || c.type === "both");

  return (
    <Card className="wm-card">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex h-auto w-full items-center justify-between p-5 text-sm text-wm-muted-foreground transition-colors hover:text-wm-foreground"
      >
        <div className="flex items-center gap-2">
          <Settings2 size={14} />
          Gestisci categorie
          {categories && <span className="text-xs text-wm-muted-foreground">({categories.length})</span>}
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </Button>

      {isOpen && (
        <div className="px-4 pb-5 border-t border-wm-border">
          {isLoading ? (
            <div className="py-4 space-y-2 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-wm-muted rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {expenseCategories.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-wm-muted-foreground mb-1 px-3">Uscite</p>
                  {expenseCategories.map((cat) => (
                    <CategoryRow key={cat.id} category={cat} />
                  ))}
                </div>
              )}

              {incomeCategories.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-wm-muted-foreground mb-1 px-3">Entrate</p>
                  {incomeCategories.map((cat) => (
                    <CategoryRow key={cat.id} category={cat} />
                  ))}
                </div>
              )}

              {(!categories || categories.length === 0) && (
                <p className="text-center text-wm-muted-foreground text-sm py-4">Nessuna categoria</p>
              )}

              {/* New category form / button */}
              {showNewForm ? (
                <NewCategoryForm onClose={() => setShowNewForm(false)} />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setShowNewForm(true)}
                  className="flex items-center gap-1.5 text-xs text-wm-muted-foreground hover:text-wm-muted-foreground transition-colors px-3 py-2"
                >
                  <Plus size={13} /> Nuova categoria
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
