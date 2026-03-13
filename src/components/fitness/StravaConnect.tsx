'use client'

import { useStravaConnection } from '@/hooks/useStravaConnection'
import { RefreshCw, Unlink, Zap } from 'lucide-react'

function formatDate(iso: string | undefined) {
  if (!iso) return 'Mai'
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface StravaConnectProps {
  mode?: 'full' | 'compact'
}

export function StravaConnect({ mode = 'full' }: StravaConnectProps) {
  const { isConnected, isLoading, lastSyncedAt, connect, disconnect, sync, isSyncing, isDisconnecting } =
    useStravaConnection()

  if (isLoading) return null

  if (mode === 'compact' && isConnected) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
        <span className="text-gray-400">
          Ultimo sync: <span className="text-white">{formatDate(lastSyncedAt)}</span>
        </span>
        <button
          onClick={() => sync()}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Sync...' : 'Sincronizza'}
        </button>
        <button
          onClick={() => disconnect()}
          disabled={isDisconnecting}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
        >
          <Unlink size={14} />
          Disconnetti
        </button>
      </div>
    )
  }

  if (mode === 'full') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 border border-orange-500/30">
          <Zap className="text-orange-400" size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Connetti Strava</h2>
          <p className="text-gray-400 max-w-sm">
            Collega il tuo account Strava per visualizzare le tue attività, statistiche e grafici di allenamento.
          </p>
        </div>
        <button
          onClick={connect}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
        >
          <Zap size={18} />
          Connetti Strava
        </button>
        <p className="text-xs text-gray-600">
          Accesso in sola lettura alle tue attività
        </p>
      </div>
    )
  }

  return null
}
