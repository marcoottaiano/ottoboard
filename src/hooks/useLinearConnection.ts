'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface LinearStatus {
  connected: boolean
  selectedTeamId?: string
  selectedTeamName?: string
  lastSyncedAt?: string
}

interface LinearTeam {
  id: string
  name: string
  key: string
}

interface SyncResult {
  synced: { projects: number; columns: number; tasks: number; unassigned: number }
}

const STATUS_KEY = ['linear-status']
const TEAMS_KEY = ['linear-teams']

export function useLinearConnection(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient()

  const statusQuery = useQuery<LinearStatus>({
    queryKey: STATUS_KEY,
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await fetch('/api/linear/status')
      return res.json()
    },
  })

  const isConnected = statusQuery.data?.connected ?? false

  const teamsQuery = useQuery<{ teams: LinearTeam[] }>({
    queryKey: TEAMS_KEY,
    queryFn: async () => {
      const res = await fetch('/api/linear/teams')
      if (!res.ok) throw new Error('Errore fetch teams')
      return res.json()
    },
    enabled: isConnected,
  })

  const connectMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const res = await fetch('/api/linear/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore connessione')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/linear/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Errore disconnessione')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STATUS_KEY })
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY })
    },
  })

  const syncMutation = useMutation<SyncResult>({
    mutationFn: async () => {
      const res = await fetch('/api/linear/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore sync')
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STATUS_KEY })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['columns'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      const { projects, tasks, unassigned } = data.synced
      const unassignedNote = unassigned > 0 ? ` (${unassigned} senza progetto)` : ''
      toast.success(`Sync completata — ${projects} progetti, ${tasks} task${unassignedNote}`)
    },
    onError: (err) => {
      toast.error(`Errore sync: ${err.message}`)
    },
  })

  const selectTeamMutation = useMutation({
    mutationFn: async ({ teamId, teamName }: { teamId: string; teamName: string }) => {
      const res = await fetch('/api/linear/select-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, teamName }),
      })
      if (!res.ok) throw new Error('Errore selezione team')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  })

  return {
    isConnected,
    isLoading: statusQuery.isLoading,
    isConnectionError: statusQuery.isError,
    selectedTeamId: statusQuery.data?.selectedTeamId,
    selectedTeamName: statusQuery.data?.selectedTeamName,
    lastSyncedAt: statusQuery.data?.lastSyncedAt,
    teams: teamsQuery.data?.teams ?? [],
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error?.message,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    syncResult: syncMutation.data,
    selectTeam: selectTeamMutation.mutate,
    isSelectingTeam: selectTeamMutation.isPending,
  }
}
