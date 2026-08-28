"use client";

import { GoalsSection } from "@/components/finance/GoalsSection";
import { BudgetTracker } from "@/components/finance/BudgetTracker";
import { CategoryManager } from "@/components/finance/CategoryManager";
import { CSVImport } from "@/components/finance/CSVImport";
import { FirstTimeSetup } from "@/components/finance/FirstTimeSetup";
import { RecurringTransactionManager } from "@/components/finance/RecurringTransactionManager";
import { RuleCard5030 } from "@/components/finance/RuleCard5030";
import { TransactionList } from "@/components/finance/TransactionList";
import { TransactionCreateModal } from "@/components/finance/TransactionCreateModal";
import { FinanceCommandCenter } from "@/components/finance/FinanceCommandCenter";
import { useCategories } from "@/hooks/useCategories";
import { useProcessDueRecurring } from "@/hooks/useRecurringTransactions";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function FinancePage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [setupDone, setSetupDone] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  const { data: categories, isLoading } = useCategories();
  useProcessDueRecurring();

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="h-8 bg-white/5 rounded w-32 animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  const hasCategories = (categories?.length ?? 0) > 0 || setupDone;

  if (!hasCategories) {
    return (
      <div className="p-4 md:p-6">
        <FirstTimeSetup onDone={() => setSetupDone(true)} />
      </div>
    );
  }

  return (
    <main className="ob-page finance-page">
      <PageHeader
        eyebrow="Controllo finanziario"
        title="Finanze"
        description="Flussi, scelte e obiettivi nello stesso quadro."
        actions={
          <button type="button" onClick={() => setIsTransactionModalOpen(true)} className="ob-action">
            <Plus size={15} />
            Aggiungi transazione
          </button>
        }
      />

      <FinanceCommandCenter selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      <section className="mt-9">
        <div className="ob-section-heading">
          <p className="ob-section-title">Gestione obiettivi e budget</p>
        </div>
        <GoalsSection />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BudgetTracker month={selectedMonth} />
          <RuleCard5030 month={selectedMonth} />
        </div>
      </section>

      <section className="mt-9">
        <div className="ob-section-heading">
          <p className="ob-section-title">Movimenti</p>
        </div>
        <div className="space-y-4">
          <TransactionList month={selectedMonth} />
          <RecurringTransactionManager />
        </div>
      </section>

      <section className="mt-9">
        <div className="ob-section-heading">
          <p className="ob-section-title">Strumenti</p>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <CSVImport />
          <CategoryManager />
        </div>
      </section>

      {isTransactionModalOpen && <TransactionCreateModal onClose={() => setIsTransactionModalOpen(false)} />}
    </main>
  );
}
