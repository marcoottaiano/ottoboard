"use client";

import { DataError } from "@/components/ui/DataError";
import { Card } from "@/components/watermelon-ui/card";
import { Activity, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useIntegrationHealth } from "@/hooks/useIntegrationHealth";
import { useStravaConnection } from "@/hooks/useStravaConnection";

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ServiceHealthCard({
  name,
  icon,
  isConnected,
  isLoading: connectionLoading,
  lastSyncedAt,
  errorLogs,
  logsLoading,
}: {
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isLoading: boolean;
  lastSyncedAt?: string;
  errorLogs: Array<{ id: string; error_message: string; occurred_at: string }>;
  logsLoading: boolean;
}) {
  return (
    <Card className="rounded-xl border border-wm-border bg-wm-card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-wm-fitness">{icon}</span>
          <h3 className="text-sm font-semibold text-wm-foreground">{name}</h3>
        </div>

        {!connectionLoading && (
          <div
            className={[
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              isConnected && errorLogs.length === 0
                ? "bg-wm-success/10 text-wm-success border border-wm-success/20"
                : isConnected && errorLogs.length > 0
                  ? "bg-wm-warning/10 text-wm-warning border border-wm-warning/20"
                  : "bg-wm-muted text-wm-muted-foreground border border-wm-border",
            ].join(" ")}
          >
            {isConnected && errorLogs.length === 0 && (
              <>
                <CheckCircle size={11} /> Operativo
              </>
            )}
            {isConnected && errorLogs.length > 0 && (
              <>
                <AlertCircle size={11} /> Errori rilevati
              </>
            )}
            {!isConnected && (
              <>
                <AlertCircle size={11} /> Non connesso
              </>
            )}
          </div>
        )}
      </div>

      {/* Last sync */}
      {isConnected && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-wm-muted-foreground">
          <Clock size={11} className="shrink-0" />
          Ultimo sync:{" "}
          <span className="text-wm-muted-foreground">{lastSyncedAt ? formatTimestamp(lastSyncedAt) : "Mai"}</span>
        </div>
      )}

      {/* Error logs */}
      {logsLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-wm-muted animate-pulse" />
          ))}
        </div>
      ) : errorLogs.length === 0 && isConnected ? (
        <p className="text-xs text-wm-muted-foreground italic">Nessun errore registrato di recente.</p>
      ) : errorLogs.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-wm-muted-foreground uppercase tracking-widest">Ultimi errori</p>
          <ul className="space-y-1.5">
            {errorLogs.map((log) => (
              <li
                key={log.id}
                className="rounded-lg bg-wm-destructive/5 border border-wm-destructive/10 px-3 py-2 space-y-0.5"
              >
                <p className="break-words text-xs text-wm-destructive/90">{log.error_message}</p>
                <p className="text-xs text-wm-muted-foreground">{formatTimestamp(log.occurred_at)}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!isConnected && !connectionLoading && (
        <p className="text-xs text-wm-muted-foreground">Connetti l&apos;integrazione per monitorarne la salute.</p>
      )}
    </Card>
  );
}

export function IntegrationHealthSection() {
  const { data: health, isLoading: logsLoading, isError, refetch } = useIntegrationHealth();
  const {
    isConnected: stravaConnected,
    isLoading: stravaLoading,
    lastSyncedAt: stravaLastSync,
  } = useStravaConnection();

  if (isError) return <DataError onRetry={() => void refetch()} />;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-wm-muted-foreground uppercase tracking-widest px-1">
        Salute Integrazioni
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <ServiceHealthCard
          name="Strava"
          icon={<Activity size={16} />}
          isConnected={stravaConnected}
          isLoading={stravaLoading}
          lastSyncedAt={stravaLastSync}
          errorLogs={health?.strava ?? []}
          logsLoading={logsLoading}
        />
      </div>
    </div>
  );
}
