'use client'

import { RefreshCw, Unlink, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { useStravaConnection } from '@/hooks/useStravaConnection'

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

export function StravaIntegrationCard() {
  const {
    isConnected,
    isLoading,
    athleteId,
    lastSyncedAt,
    connect,
    disconnect,
    sync,
    isSyncing,
    isDisconnecting,
    syncedCount,
  } = useStravaConnection()

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-orange-400" />
          <h2 className="text-sm font-semibold text-white/80">Strava</h2>
        </div>

        {!isLoading && (
          <div className={[
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-white/[0.05] text-white/30 border border-white/[0.08]',
          ].join(' ')}>
            {isConnected ? (
              <><CheckCircle size={11} /> Connesso</>
            ) : (
              <><AlertCircle size={11} /> Non connesso</>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-white/30 text-sm">
          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
          Caricamento...
        </div>
      )}

      {!isLoading && isConnected && (
        <div className="space-y-3">
          {/* Info connessione */}
          <div className="space-y-1.5 text-xs text-white/40">
            {athleteId && (
              <p>Athlete ID: <span className="text-white/60">{athleteId}</span></p>
            )}
            <p>Ultimo sync: <span className="text-white/60">{formatDate(lastSyncedAt)}</span></p>
          </div>

          {/* Messaggio post-sync */}
          {syncedCount !== undefined && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <CheckCircle size={13} className="flex-shrink-0" />
              {syncedCount === 0
                ? 'Tutto già aggiornato.'
                : `${syncedCount} nuova/e attività sincronizzata/e.`}
            </div>
          )}

          {/* Azioni */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => sync()}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50 transition-colors text-xs font-medium"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Sync...' : 'Sincronizza ora'}
            </button>

            <button
              onClick={() => disconnect()}
              disabled={isDisconnecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors text-xs font-medium"
            >
              <Unlink size={13} />
              {isDisconnecting ? 'Disconnessione...' : 'Disconnetti'}
            </button>
          </div>
        </div>
      )}

      {!isLoading && !isConnected && (
        <div className="space-y-3">
          <p className="text-xs text-white/40">
            Collega il tuo account Strava per sincronizzare automaticamente le attività.
          </p>
          <button
            onClick={connect}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors text-sm font-medium"
          >
            <Zap size={15} />
            Connetti Strava
          </button>
        </div>
      )}
    </div>
  )
}
