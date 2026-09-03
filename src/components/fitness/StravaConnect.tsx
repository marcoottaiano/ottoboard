"use client";

import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { DataError } from "@/components/ui/DataError";
import { Button } from "@/components/watermelon-ui/button";
import { useStravaConnection } from "@/hooks/useStravaConnection";
import { RefreshCw, Unlink, Zap } from "lucide-react";

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

interface StravaConnectProps {
  mode?: "full" | "compact";
}

export function StravaConnect({ mode = "full" }: StravaConnectProps) {
  const [confirming, setConfirming] = useState(false);
  const {
    isConnected,
    isLoading,
    lastSyncedAt,
    connect,
    disconnectAsync,
    isConnectionError,
    refetchConnection,
    sync,
    isSyncing,
    isDisconnecting,
  } = useStravaConnection();

  if (isConnectionError) return <DataError onRetry={() => void refetchConnection()} />;
  if (isLoading) return null;

  if (mode === "compact" && isConnected) {
    return (
      <div className="flex w-full flex-wrap items-center gap-2 text-sm sm:w-auto">
        <ConfirmDeleteDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Disconnettere Strava?"
          description="La sincronizzazione sarà interrotta. Potrai collegare nuovamente Strava dal tuo profilo."
          confirmLabel="Disconnetti"
          pendingLabel="Disconnessione..."
          onConfirm={() => disconnectAsync()}
        />
        <span className="hidden sm:block text-xs text-wm-muted-foreground whitespace-nowrap">
          Sync: <span className="text-wm-foreground">{formatDate(lastSyncedAt)}</span>
        </span>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => sync()}
          disabled={isSyncing}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-wm-fitness/20 border border-wm-fitness/20 text-wm-fitness hover:bg-wm-fitness/30 disabled:opacity-50 transition-colors text-xs whitespace-nowrap"
        >
          <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Sync..." : "Sincronizza"}
        </Button>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => setConfirming(true)}
          disabled={isDisconnecting}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-wm-destructive/10 border border-wm-destructive/10 text-wm-destructive hover:bg-wm-destructive/20 disabled:opacity-50 transition-colors text-xs whitespace-nowrap"
        >
          <Unlink size={13} />
          Disconnetti
        </Button>
      </div>
    );
  }

  if (mode === "compact")
    return (
      <Button onClick={connect}>
        <Zap size={16} />
        Connetti Strava
      </Button>
    );
  if (mode === "full") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-wm-fitness/20 border border-wm-fitness/30">
          <Zap className="text-wm-fitness" size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-wm-foreground mb-2">Connetti Strava</h2>
          <p className="text-wm-muted-foreground max-w-sm">
            Collega il tuo account Strava per visualizzare le tue attività, statistiche e grafici di allenamento.
          </p>
        </div>
        <Button
          variant="ghost"
          size="auto"
          onClick={connect}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-wm-fitness hover:bg-wm-fitness text-white wm-dark:text-wm-background font-medium transition-colors"
        >
          <Zap size={18} />
          Connetti Strava
        </Button>
        <p className="text-xs text-wm-muted-foreground">Accesso in sola lettura alle tue attività</p>
      </div>
    );
  }

  return null;
}
