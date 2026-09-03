"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface StravaStatus {
  connected: boolean;
  athleteId?: number;
  lastSyncedAt?: string;
  expiresAt?: string;
}

interface SyncResult {
  synced: number;
}

export function useStravaConnection() {
  const syncing = useRef(false);
  const queryClient = useQueryClient();

  const statusQuery = useQuery<StravaStatus>({
    queryKey: ["stravaConnection"],
    queryFn: async () => {
      const res = await fetch("/api/strava/status");
      if (!res.ok) throw new Error("Errore controllo connessione Strava");
      return res.json();
    },
  });

  const syncMutation = useMutation<SyncResult>({
    mutationFn: async () => {
      const res = await fetch("/api/strava/sync", { method: "POST" });
      if (!res.ok) throw new Error("Errore sincronizzazione");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["stravaConnection"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/strava/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Errore disconnessione");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stravaConnection"] });
      queryClient.removeQueries({ queryKey: ["activities"] });
    },
  });

  return {
    isConnected: statusQuery.data?.connected ?? false,
    isLoading: statusQuery.isLoading,
    isConnectionError: statusQuery.isError,
    refetchConnection: statusQuery.refetch,
    athleteId: statusQuery.data?.athleteId,
    lastSyncedAt: statusQuery.data?.lastSyncedAt,
    connect: () => {
      // Route Handler redirects to external OAuth and requires document navigation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/api/strava/connect";
    },
    disconnect: disconnectMutation.mutate,
    disconnectAsync: disconnectMutation.mutateAsync,
    sync: () => {
      if (syncing.current) return;
      syncing.current = true;
      syncMutation.mutate(undefined, {
        onError: () => toast.error("Sincronizzazione non riuscita. Riprova."),
        onSettled: () => {
          syncing.current = false;
        },
      });
    },
    isSyncing: syncMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    syncedCount: syncMutation.data?.synced,
  };
}
