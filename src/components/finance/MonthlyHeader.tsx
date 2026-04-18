"use client";

import { useRef } from "react";
import { useMonthStats } from "@/hooks/useMonthStats";
import { useTransactions } from "@/hooks/useTransactions";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { buildCsvString, downloadCsv } from "@/lib/finance/exportCsv";

function formatEur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function Delta({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="text-xs text-gray-500">
        → 0% <span className="text-gray-600">vs media</span>
      </span>
    );
  const isPositive = value > 0;
  return (
    <span className={`text-xs ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
      {isPositive ? "↑" : "↓"} {Math.abs(value)}% <span className="text-gray-600">vs media</span>
    </span>
  );
}

function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

function addMonths(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface Props {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function MonthlyHeader({ selectedMonth, onMonthChange }: Props) {
  const { current, delta, isLoading } = useMonthStats(selectedMonth);
  // P3: isFetching disabilita export durante fetch per evitare CSV con dati del mese sbagliato
  const { data: transactions, isFetching } = useTransactions({ month: selectedMonth });
  // P7: ref flag per bloccare doppi click sull'export
  const isExporting = useRef(false);

  const currentYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const isFuture = selectedMonth > currentYM;

  function handleExport() {
    if (!transactions?.length || isExporting.current) return;
    isExporting.current = true;
    const csv = buildCsvString(transactions);
    const [yyyy, mm] = selectedMonth.split("-");
    downloadCsv(csv, `ottoboard-finance-${mm}-${yyyy}.csv`);
    isExporting.current = false;
  }

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-5">
      {/* Header: export a destra, spazio dal nav mese */}
      <div className="flex justify-end mb-3">
        <button onClick={handleExport} disabled={!transactions?.length || isFetching} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30">
          <Download size={13} />
          Esporta CSV
        </button>
      </div>

      {/* Selector mese */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(addMonths(selectedMonth, -1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-white capitalize">{monthLabel(selectedMonth)}</span>
        <button onClick={() => onMonthChange(addMonths(selectedMonth, 1))} disabled={isFuture} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-white/10 rounded w-40 mx-auto" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-14 bg-white/5 rounded-lg" />
            <div className="h-14 bg-white/5 rounded-lg" />
          </div>
        </div>
      ) : (
        <>
          {/* Saldo principale */}
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500 mb-1">Saldo</p>
            <p className={`text-4xl font-bold ${(current?.balance ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              <PrivacyValue>{formatEur(current?.balance ?? 0)}</PrivacyValue>
            </p>
            {delta && (
              <div className="mt-1">
                <Delta value={delta.balance} />
              </div>
            )}
          </div>

          {/* Entrate + Uscite */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                <TrendingUp size={12} />
                Entrate
              </div>
              <span className="text-xl font-bold text-white">
                <PrivacyValue>{formatEur(current?.totalIncome ?? 0)}</PrivacyValue>
              </span>
              {delta && <Delta value={delta.income} />}
            </div>
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-1.5 text-red-400 text-xs">
                <TrendingDown size={12} />
                Uscite
              </div>
              <span className="text-xl font-bold text-white">
                <PrivacyValue>{formatEur(current?.totalExpense ?? 0)}</PrivacyValue>
              </span>
              {delta && <Delta value={delta.expense} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
