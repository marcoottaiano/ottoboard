'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface StravaStatus {
  connected: boolean
  athleteId?: number
  lastSyncedAt?: string
  expiresAt?: string
}

interface SyncResult {
  synced: number
}

export function useStravaConnection() {
  const queryClient = useQueryClient()

  const statusQuery = useQuery<StravaStatus>({
    queryKey: ['stravaConnection'],
    queryFn: async () => {
      const res = await fetch('/api/strava/status')
      if (!res.ok) throw new Error('Errore controllo connessione Strava')
      return res.json()
    },
  })

  const syncMutation = useMutation<SyncResult>({
    mutationFn: async () => {
      const res = await fetch('/api/strava/sync', { method: 'POST' })
      if (!res.ok) throw new Error('Errore sincronizzazione')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['stravaConnection'] })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/strava/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Errore disconnessione')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stravaConnection'] })
      queryClient.removeQueries({ queryKey: ['activities'] })
    },
  })

  return {
    isConnected: statusQuery.data?.connected ?? false,
    isLoading: statusQuery.isLoading,
    isConnectionError: statusQuery.isError,
    athleteId: statusQuery.data?.athleteId,
    lastSyncedAt: statusQuery.data?.lastSyncedAt,
    connect: () => { window.location.href = '/api/strava/connect' },
    disconnect: disconnectMutation.mutate,
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    syncedCount: syncMutation.data?.synced,
  }
}
