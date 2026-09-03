"use client";

import { Card } from "@/components/watermelon-ui/card";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { DataError } from "@/components/ui/DataError";
import { Button } from "@/components/watermelon-ui/button";
import { RefreshCw, Unlink, Zap, CheckCircle, AlertCircle, ShieldAlert } from "lucide-react";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { useIntegrationHealth } from "@/hooks/useIntegrationHealth";

function formatDate(iso: string | undefined) {
  if (!iso) return "Mai";
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StravaIntegrationCard() {
  const [confirming, setConfirming] = useState(false);
  const {
    isConnected,
    isLoading,
    athleteId,
    lastSyncedAt,
    connect,
    disconnectAsync,
    isConnectionError,
    refetchConnection,
    sync,
    isSyncing,
    isDisconnecting,
    syncedCount,
  } = useStravaConnection();

  const { data: health, isError: healthError, refetch: retryHealth } = useIntegrationHealth();

  // Detect re-auth required: most recent strava log (index 0, ordered desc) is TOKEN_REVOKED
  // and occurred after the last successful sync (prevents stale historical logs triggering re-auth)
  const mostRecentStravaLog = (health?.strava ?? [])[0];
  const requiresReAuth =
    isConnected &&
    health !== undefined &&
    mostRecentStravaLog?.error_code === "TOKEN_REVOKED" &&
    (!lastSyncedAt || new Date(mostRecentStravaLog.occurred_at) > new Date(lastSyncedAt));

  if (isConnectionError) return <DataError onRetry={() => void refetchConnection()} />;
  return (
    <Card className="rounded-xl border border-wm-border bg-wm-card p-5 space-y-4">
      <ConfirmDeleteDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Disconnettere Strava?"
        description="La sincronizzazione sarà interrotta. Potrai collegare nuovamente Strava dal tuo profilo."
        confirmLabel="Disconnetti"
        pendingLabel="Disconnessione..."
        onConfirm={() => disconnectAsync()}
      />
      {/* Header */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-wm-fitness" />
          <h2 className="text-sm font-semibold text-wm-foreground">Strava</h2>
        </div>

        {!isLoading && (
          <div
            className={[
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              isConnected && !requiresReAuth
                ? "bg-wm-success/10 text-wm-success border border-wm-success/20"
                : isConnected && requiresReAuth
                  ? "bg-wm-warning/10 text-wm-warning border border-wm-warning/20"
                  : "bg-wm-muted text-wm-muted-foreground border border-wm-border",
            ].join(" ")}
          >
            {isConnected && !requiresReAuth && (
              <>
                <CheckCircle size={11} /> Connesso
              </>
            )}
            {isConnected && requiresReAuth && (
              <>
                <AlertCircle size={11} /> Errore Token
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

      {isLoading && (
        <div className="flex items-center gap-2 text-wm-muted-foreground text-sm">
          <div className="w-3.5 h-3.5 border-2 border-wm-border border-t-wm-border rounded-full animate-spin" />
          Caricamento...
        </div>
      )}

      {healthError && (
        <DataError message="Stato delle integrazioni non disponibile." onRetry={() => void retryHealth()} />
      )}
      {/* Re-auth warning — shown above normal connected state when token is revoked */}
      {!isLoading && requiresReAuth && (
        <div className="rounded-lg bg-wm-warning/10 border border-wm-warning/20 px-3 py-3 space-y-2">
          <div className="flex items-center gap-2 text-wm-warning text-xs font-medium">
            <ShieldAlert size={13} className="shrink-0" />
            Strava: Re-authentication required
          </div>
          <p className="text-xs text-wm-muted-foreground leading-snug">
            Il token di accesso Strava è scaduto e non può essere rinnovato automaticamente.
          </p>
          <Button
            variant="ghost"
            size="auto"
            onClick={connect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-wm-fitness/20 text-wm-fitness hover:bg-wm-fitness/30 transition-colors text-xs font-medium border border-wm-fitness/20"
          >
            <Zap size={13} />
            Reconnetti Strava
          </Button>
        </div>
      )}

      {!isLoading && isConnected && !requiresReAuth && (
        <div className="space-y-3">
          {/* Info connessione */}
          <div className="space-y-1.5 text-xs text-wm-muted-foreground">
            {athleteId && (
              <p>
                Athlete ID: <span className="text-wm-muted-foreground">{athleteId}</span>
              </p>
            )}
            <p>
              Ultimo sync: <span className="text-wm-muted-foreground">{formatDate(lastSyncedAt)}</span>
            </p>
          </div>

          {/* Messaggio post-sync */}
          {syncedCount !== undefined && (
            <div className="flex items-center gap-2 text-wm-success text-xs bg-wm-success/10 border border-wm-success/20 rounded-lg px-3 py-2">
              <CheckCircle size={13} className="flex-shrink-0" />
              {syncedCount === 0 ? "Tutto già aggiornato." : `${syncedCount} nuova/e attività sincronizzata/e.`}
            </div>
          )}

          {/* Azioni */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
            <Button
              variant="ghost"
              size="auto"
              onClick={() => sync()}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-wm-fitness/20 text-wm-fitness hover:bg-wm-fitness/30 disabled:opacity-50 transition-colors text-xs font-medium"
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Sync..." : "Sincronizza ora"}
            </Button>

            <Button
              variant="ghost"
              size="auto"
              onClick={() => setConfirming(true)}
              disabled={isDisconnecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-wm-destructive/10 text-wm-destructive hover:bg-wm-destructive/20 disabled:opacity-50 transition-colors text-xs font-medium"
            >
              <Unlink size={13} />
              {isDisconnecting ? "Disconnessione..." : "Disconnetti"}
            </Button>
          </div>
        </div>
      )}

      {!isLoading && !isConnected && (
        <div className="space-y-3">
          <p className="text-xs text-wm-muted-foreground">
            Collega il tuo account Strava per sincronizzare automaticamente le attività.
          </p>
          <Button
            variant="ghost"
            size="auto"
            onClick={connect}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-wm-fitness/20 text-wm-fitness hover:bg-wm-fitness/30 transition-colors text-sm font-medium"
          >
            <Zap size={15} />
            Connetti Strava
          </Button>
        </div>
      )}
    </Card>
  );
}
