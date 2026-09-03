"use client";
import { useRef, useState } from "react";
import {
  ArrowDownUp,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Settings2,
  Target,
} from "lucide-react";
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
import { DataError } from "@/components/ui/DataError";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { useProcessDueRecurring } from "@/hooks/useRecurringTransactions";
import { Button } from "@/components/watermelon-ui/button";
import { Skeleton } from "@/components/watermelon-ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/watermelon-ui/tabs";
import { buildCsvString, downloadCsv } from "@/lib/finance/exportCsv";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/finance/presentation";

type FinanceTab = "overview" | "transactions" | "planning" | "tools";
const tabs: { value: FinanceTab; label: string; icon: typeof Target }[] = [
  { value: "overview", label: "Panoramica", icon: ChartNoAxesCombined },
  { value: "transactions", label: "Movimenti", icon: ArrowDownUp },
  { value: "planning", label: "Pianificazione", icon: Target },
  { value: "tools", label: "Strumenti", icon: Settings2 },
];
function isFinanceTab(value: string): value is FinanceTab {
  return tabs.some((tab) => tab.value === value);
}

export default function FinancePage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<FinanceTab>("overview");
  const [visited, setVisited] = useState<Set<FinanceTab>>(() => new Set<FinanceTab>(["overview"]));
  const [setupDone, setSetupDone] = useState(false);
  const [creating, setCreating] = useState(false);
  const exporting = useRef(false);
  const categories = useCategories();
  const transactions = useTransactions({ month: selectedMonth });
  useProcessDueRecurring();

  function changeTab(value: string) {
    if (!isFinanceTab(value)) return;
    setActiveTab(value);
    setVisited((previous) => new Set([...previous, value]));
  }
  function exportMonth() {
    if (exporting.current || transactions.isFetching || transactions.isError || !transactions.data?.length) return;
    exporting.current = true;
    try {
      const [year, month] = selectedMonth.split("-");
      downloadCsv(buildCsvString(transactions.data), `ottoboard-finance-${month}-${year}.csv`);
    } finally {
      exporting.current = false;
    }
  }
  const hasCategories = (categories.data?.length ?? 0) > 0 || setupDone;
  return (
    <div className="wm-page">
      <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="wm-eyebrow mb-2">Il tuo spazio finanziario</p>
          <h1 className="text-3xl font-semibold tracking-tight">Finanze</h1>
          <p className="mt-2 text-sm text-wm-muted-foreground">Una visione chiara di movimenti, budget e obiettivi.</p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap">
          <div
            className="flex min-w-0 items-center justify-between rounded-lg border border-wm-border bg-wm-card p-1"
            aria-label="Periodo selezionato"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-11"
              aria-label="Mese precedente"
              onClick={() => setSelectedMonth((month) => shiftMonth(month, -1))}
            >
              <ChevronLeft />
            </Button>
            <span
              aria-live="polite"
              className="min-w-0 flex-1 px-1 text-center text-sm font-medium capitalize sm:min-w-32"
            >
              {monthLabel(selectedMonth)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-11"
              aria-label="Mese successivo"
              disabled={selectedMonth >= currentMonth()}
              onClick={() => setSelectedMonth((month) => shiftMonth(month, 1))}
            >
              <ChevronRight />
            </Button>
          </div>

          <Button
            variant="outline"
            size="auto"
            aria-label="Esporta i movimenti del mese in CSV"
            onClick={exportMonth}
            disabled={transactions.isFetching || transactions.isError || !transactions.data?.length}
          >
            <Download />
            CSV
          </Button>
          <Button
            size="auto"
            className="col-span-2 min-h-12 w-full sm:w-auto"
            onClick={() => setCreating(true)}
            disabled={!hasCategories || categories.isError || categories.isLoading}
          >
            <Plus />
            Aggiungi transazione
          </Button>
        </div>
      </header>
      {categories.isError ? (
        <DataError
          onRetry={() => void categories.refetch()}
          message="Impossibile caricare le categorie. Riprova prima di configurare Finanze."
        />
      ) : categories.isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Caricamento Finanze">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32" />
          ))}
        </div>
      ) : !hasCategories ? (
        <FirstTimeSetup onDone={() => setSetupDone(true)} />
      ) : (
        <Tabs value={activeTab} onValueChange={changeTab}>
          <TabsList aria-label="Sezioni Finanze">
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value}>
                <Icon size={16} className="shrink-0" aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {visited.has("overview") && (
            <TabsContent value="overview" forceMount hidden={activeTab !== "overview"}>
              <FinanceCommandCenter selectedMonth={selectedMonth} />
            </TabsContent>
          )}
          {visited.has("transactions") && (
            <TabsContent value="transactions" forceMount hidden={activeTab !== "transactions"}>
              <div className="space-y-5">
                <TransactionList key={selectedMonth} month={selectedMonth} />
                <RecurringTransactionManager />
              </div>
            </TabsContent>
          )}
          {visited.has("planning") && (
            <TabsContent value="planning" forceMount hidden={activeTab !== "planning"}>
              <div className="space-y-6">
                <GoalsSection />
                <div className="grid items-start gap-5 xl:grid-cols-2">
                  <BudgetTracker key={selectedMonth} month={selectedMonth} />
                  <RuleCard5030 month={selectedMonth} />
                </div>
              </div>
            </TabsContent>
          )}
          {visited.has("tools") && (
            <TabsContent value="tools" forceMount hidden={activeTab !== "tools"}>
              <div className="grid items-start gap-5 xl:grid-cols-2">
                <CSVImport />
                <CategoryManager />
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}
      {creating && <TransactionCreateModal onClose={() => setCreating(false)} />}
    </div>
  );
}
