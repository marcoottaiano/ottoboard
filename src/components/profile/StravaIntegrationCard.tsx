'use client'

import {
  RefreshCw,
  Unlink,
  Zap,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react'
import { useStravaConnection } from '@/hooks/useStravaConnection'
import { useIntegrationHealth } from '@/hooks/useIntegrationHealth'

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

  const { data: health } = useIntegrationHealth()

  // Detect re-auth required: most recent strava log (index 0, ordered desc) is TOKEN_REVOKED
  // and occurred after the last successful sync (prevents stale historical logs triggering re-auth)
  const mostRecentStravaLog = (health?.strava ?? [])[0]
  const requiresReAuth =
    isConnected &&
    health !== undefined &&
    mostRecentStravaLog?.error_code === 'TOKEN_REVOKED' &&
    (!lastSyncedAt || new Date(mostRecentStravaLog.occurred_at) > new Date(lastSyncedAt))

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-orange-400" />
          <h2 className="text-sm font-semibold text-white/80">Strava</h2>
        </div>

        {!isLoading && (
          <div
            className={[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              isConnected && !requiresReAuth
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : isConnected && requiresReAuth
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-white/[0.05] text-white/30 border border-white/[0.08]',
            ].join(' ')}
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
        <div className="flex items-center gap-2 text-white/30 text-sm">
          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
          Caricamento...
        </div>
      )}

      {/* Re-auth warning — shown above normal connected state when token is revoked */}
      {!isLoading && requiresReAuth && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-3 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
            <ShieldAlert size={13} className="shrink-0" />
            Strava: Re-authentication required
          </div>
          <p className="text-xs text-white/40 leading-snug">
            Il token di accesso Strava è scaduto e non può essere rinnovato automaticamente.
          </p>
          <button
            onClick={connect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors text-xs font-medium border border-orange-500/20"
          >
            <Zap size={13} />
            Reconnetti Strava
          </button>
        </div>
      )}

      {!isLoading && isConnected && !requiresReAuth && (
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
