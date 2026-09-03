"use client";
import { PrivacyValue } from "@/components/ui/PrivacyValue";
import { DataError } from "@/components/ui/DataError";
import { Card } from "@/components/watermelon-ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/watermelon-ui/table";
import { Button } from "@/components/watermelon-ui/button";
import { useCurrentTime } from "@/hooks/useCurrentTime";

import { useActivities, ActivityFilters } from "@/hooks/useActivities";
import { Activity, ActivityType } from "@/types";
import { Select, SelectOption } from "@/components/ui/Select";
import { Input } from "@/components/watermelon-ui/input";
import { ExternalLink, Search, ChevronRight, ClipboardList } from "lucide-react";
import { useState } from "react";
import { ActivityBadge } from "./ActivityBadge";
import { ActivityModal } from "./ActivityModal";
import { toLocalDateStr } from "@/lib/dateUtils";

const PAGE_SIZE = 20;

const TYPE_OPTIONS: (SelectOption & { value: ActivityType | "all" })[] = [
  { value: "all", label: "Tutti" },
  { value: "Run", label: "Corsa" },
  { value: "WeightTraining", label: "Palestra" },
  { value: "Walk", label: "Camminata" },
  { value: "Hike", label: "Escursione" },
  { value: "Ski", label: "Sci" },
];

const PERIOD_OPTIONS: SelectOption[] = [
  { value: "0", label: "Sempre" },
  { value: "30", label: "30 giorni" },
  { value: "90", label: "3 mesi" },
  { value: "180", label: "6 mesi" },
  { value: "365", label: "1 anno" },
];

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatPace(secPerKm: number | null) {
  if (!secPerKm) return "—";
  const seconds = Math.round(secPerKm);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ActivityList() {
  const now = useCurrentTime();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [periodDays, setPeriodDays] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const after = periodDays > 0 ? toLocalDateStr(new Date(now - periodDays * 86400000)) : undefined;

  const filters: ActivityFilters = {
    type: typeFilter === "all" ? undefined : typeFilter,
    after,
  };

  const { data: activities, isLoading, isError, refetch } = useActivities(filters);

  const query = search.trim().toLocaleLowerCase("it-IT");
  const filtered = activities?.filter((activity) => activity.name.toLocaleLowerCase("it-IT").includes(query)) ?? [];
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  function resetFilters() {
    setSearch("");
    setTypeFilter("all");
    setPeriodDays(0);
    setPage(0);
  }

  return (
    <Card className="overflow-hidden p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="wm-eyebrow">Il tuo diario</p>
          <h2 className="wm-card-title mt-2">Registro attività</h2>
          <p className="mt-1 text-sm text-wm-muted-foreground">
            Cerca un allenamento e aprilo per esplorare i dettagli.
          </p>
        </div>
        {!isLoading && !isError && (
          <PrivacyValue className="rounded-full bg-wm-muted px-3 py-1.5 text-xs text-wm-muted-foreground">
            {filtered.length} attività
          </PrivacyValue>
        )}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-wm-border bg-wm-muted/40 p-3">
        <div className="relative w-full sm:min-w-48 sm:flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-wm-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Cerca attività per nome"
            placeholder="Cerca un allenamento…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(v) => {
            const option = TYPE_OPTIONS.find((item) => item.value === v);
            if (option) setTypeFilter(option.value);
            setPage(0);
          }}
          options={TYPE_OPTIONS}
          showPlaceholder={false}
          aria-label="Filtra per sport"
          className="min-w-0 flex-1 sm:flex-none sm:w-40"
        />
        <Select
          value={String(periodDays)}
          onChange={(v) => {
            setPeriodDays(Number(v));
            setPage(0);
          }}
          options={PERIOD_OPTIONS}
          showPlaceholder={false}
          aria-label="Filtra per periodo"
          className="min-w-0 flex-1 sm:flex-none sm:w-36"
        />
      </div>

      {isError ? (
        <DataError onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-wm-muted rounded animate-pulse" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="rounded-2xl bg-wm-muted p-4 text-wm-muted-foreground">
            <ClipboardList size={24} aria-hidden="true" />
          </span>
          <h3 className="text-sm font-medium">Nessuna attività trovata</h3>
          <p className="max-w-sm text-sm text-wm-muted-foreground">
            {query || typeFilter !== "all" || periodDays > 0
              ? "Prova a cambiare la ricerca o i filtri."
              : "Sincronizza Strava per vedere qui i tuoi allenamenti."}
          </p>
          {(query || typeFilter !== "all" || periodDays > 0) && (
            <Button variant="outline" onClick={resetFilters}>
              Azzera filtri
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="divide-y divide-wm-border md:hidden">
            {paginated.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => setSelectedActivity(activity)}
                className="flex w-full items-center gap-3 rounded-lg py-4 text-left transition-colors hover:bg-wm-muted focus-visible:outline-2 focus-visible:outline-wm-ring"
              >
                <span className="block min-w-0 flex-1">
                  <span className="mb-2 flex flex-wrap items-center gap-2">
                    <ActivityBadge type={activity.type} />
                    <span className="text-xs text-wm-muted-foreground">
                      {new Date(activity.start_date).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                  <span className="block break-words text-sm font-medium leading-relaxed">{activity.name}</span>
                  <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-wm-muted-foreground">
                    <PrivacyValue>{formatDuration(activity.moving_time)}</PrivacyValue>
                    {Boolean(activity.distance) && (
                      <PrivacyValue>{((activity.distance ?? 0) / 1000).toFixed(1)} km</PrivacyValue>
                    )}
                    {Boolean(activity.average_heartrate) && (
                      <PrivacyValue>{Math.round(activity.average_heartrate ?? 0)} bpm</PrivacyValue>
                    )}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-wm-muted-foreground" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow
                  className="border-b text-left text-xs text-wm-muted-foreground"
                  style={{ borderColor: "var(--border)" }}
                >
                  <TableHead className="pb-2 font-normal">Data</TableHead>
                  <TableHead className="pb-2 font-normal">Tipo</TableHead>
                  <TableHead className="pb-2 font-normal">Nome</TableHead>
                  <TableHead className="pb-2 font-normal text-right">Distanza</TableHead>
                  <TableHead className="pb-2 font-normal text-right">Durata</TableHead>
                  <TableHead className="pb-2 font-normal text-right">FC</TableHead>
                  <TableHead className="pb-2 font-normal text-right">Pace</TableHead>
                  <TableHead className="pb-2 w-6">
                    <span className="sr-only">Apri su Strava</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((a) => (
                  <TableRow
                    key={a.id}
                    onClick={(event) => {
                      event.currentTarget.querySelector("button")?.focus();
                      setSelectedActivity(a);
                    }}
                    className="cursor-pointer border-b transition-colors hover:bg-wm-muted"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <TableCell className="py-2.5 text-wm-muted-foreground whitespace-nowrap">
                      {new Date(a.start_date).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <ActivityBadge type={a.type} />
                    </TableCell>
                    <TableCell className="py-2.5 text-wm-foreground max-w-[240px]">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedActivity(a);
                        }}
                        className="block min-h-11 w-full truncate text-left font-medium hover:text-wm-primary focus-visible:outline-2 focus-visible:outline-wm-ring"
                        aria-label={`Dettagli: ${a.name}`}
                      >
                        {a.name}
                      </button>
                    </TableCell>
                    <TableCell className="py-2.5 text-wm-foreground text-right whitespace-nowrap">
                      <PrivacyValue>{a.distance ? `${(a.distance / 1000).toFixed(1)} km` : "—"}</PrivacyValue>
                    </TableCell>
                    <TableCell className="py-2.5 text-wm-foreground text-right whitespace-nowrap">
                      <PrivacyValue>{formatDuration(a.moving_time)}</PrivacyValue>
                    </TableCell>
                    <TableCell className="py-2.5 text-wm-foreground text-right whitespace-nowrap">
                      <PrivacyValue>
                        {a.average_heartrate ? `${Math.round(a.average_heartrate)} bpm` : "—"}
                      </PrivacyValue>
                    </TableCell>
                    <TableCell className="py-2.5 text-wm-foreground text-right whitespace-nowrap">
                      <PrivacyValue>{a.distance ? formatPace(a.average_pace) : "—"}</PrivacyValue>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      <a
                        href={`https://www.strava.com/activities/${a.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Apri ${a.name} su Strava`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex size-11 items-center justify-center rounded-md text-wm-muted-foreground transition-colors hover:text-fitness"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {!isLoading && !isError && totalPages > 1 && (
        <div className="flex flex-wrap gap-3 items-center justify-between mt-4 text-xs text-wm-muted-foreground">
          <span>
            {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} di{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="auto"
              aria-label="Pagina precedente"
              onClick={() => setPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-2 py-1 rounded hover:bg-wm-muted disabled:opacity-30 transition-colors"
            >
              ←
            </Button>
            <span className="px-2 py-1 text-wm-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="auto"
              aria-label="Pagina successiva"
              onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-2 py-1 rounded hover:bg-wm-muted disabled:opacity-30 transition-colors"
            >
              →
            </Button>
          </div>
        </div>
      )}

      {selectedActivity && <ActivityModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />}
    </Card>
  );
}
