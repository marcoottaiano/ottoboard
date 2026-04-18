// NOTE: this file uses browser-only APIs (Blob, URL, document) — only import from client components.

import { TransactionWithCategory } from "@/types";

export function buildCsvString(transactions: TransactionWithCategory[]): string {
  // P6: tiebreaker su created_at — guard su null/undefined per evitare sort instabile
  const sorted = [...transactions].sort((a, b) => {
    const dateA = a.date ?? "";
    const dateB = b.date ?? "";
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    const createdA = a.created_at ?? "";
    const createdB = b.created_at ?? "";
    if (createdA < createdB) return -1;
    if (createdA > createdB) return 1;
    return 0;
  });

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const header = "Data;Importo;Tipo;Categoria;Descrizione;Tipologia";

  const rows = sorted.map((t) => {
    const date = t.date ?? "";
    // P2: guard su NaN — fallback a 0 se amount non è un numero valido
    const numeric = Number(t.amount);
    const rawAmount = (isFinite(numeric) ? numeric : 0).toFixed(2).replace(".", ",");
    const amount = t.type === "expense" ? `-${rawAmount}` : rawAmount;
    const tipo = t.type === "expense" ? "Uscita" : "Entrata";
    const categoria = t.category?.name ?? "";
    const descrizione = t.description ?? "";
    const tipologia = t.type === "expense" ? (t.category?.spending_type === "needs" ? "Necessaria" : t.category?.spending_type === "wants" ? "Accessoria" : "") : "";

    return [escape(date), escape(amount), escape(tipo), escape(categoria), escape(descrizione), escape(tipologia)].join(";");
  });

  // P4: RFC 4180 richiede \r\n — garantisce compatibilità con Excel su Windows
  return "\uFEFF" + [header, ...rows].join("\r\n");
}

export function downloadCsv(csvString: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csvString], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  // P5: try/finally garantisce rimozione dal DOM anche se click() lancia
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    document.body.removeChild(a);
  }
  // P1: delay 100ms — evita revoca prima che il browser avvii il download
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
