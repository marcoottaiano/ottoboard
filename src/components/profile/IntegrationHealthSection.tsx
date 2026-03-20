'use client'

import { Activity, Link2, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { useIntegrationHealth } from '@/hooks/useIntegrationHealth'
import { useLinearConnection } from '@/hooks/useLinearConnection'
import { useStravaConnection } from '@/hooks/useStravaConnection'

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ServiceHealthCard({
  name,
  icon,
  color,
  isConnected,
  isLoading: connectionLoading,
  lastSyncedAt,
  errorLogs,
  logsLoading,
  onReconcile,
  isReconciling,
  reconcileError,
  reconcileResult,
}: {
  name: string
  icon: React.ReactNode
  color: 'orange' | 'purple'
  isConnected: boolean
  isLoading: boolean
  lastSyncedAt?: string
  errorLogs: Array<{ id: string; error_message: string; occurred_at: string }>
  logsLoading: boolean
  onReconcile?: () => void
  isReconciling?: boolean
  reconcileError?: string | null
  reconcileResult?: { reconciled: { projects: number; columns: number; tasks: number; orphansRemoved: number } } | null
}) {
  const iconColor = color === 'orange' ? 'text-orange-400' : 'text-purple-400'

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={iconColor}>{icon}</span>
          <h3 className="text-sm font-semibold text-white/80">{name}</h3>
        </div>

        {!connectionLoading && (
          <div
            className={[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              isConnected && errorLogs.length === 0
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : isConnected && errorLogs.length > 0
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-white/[0.05] text-white/30 border border-white/[0.08]',
            ].join(' ')}
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
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <Clock size={11} className="shrink-0" />
          Ultimo sync:{' '}
          <span className="text-white/60">
            {lastSyncedAt ? formatTimestamp(lastSyncedAt) : 'Mai'}
          </span>
        </div>
      )}

      {/* Error logs */}
      {logsLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : errorLogs.length === 0 && isConnected ? (
        <p className="text-xs text-white/30 italic">Nessun errore registrato di recente.</p>
      ) : errorLogs.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-white/40 uppercase tracking-widest">
            Ultimi errori
          </p>
          <ul className="space-y-1.5">
            {errorLogs.map((log) => (
              <li
                key={log.id}
                className="rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2 space-y-0.5"
              >
                <p className="text-xs text-red-400/90">{log.error_message}</p>
                <p className="text-xs text-white/30">{formatTimestamp(log.occurred_at)}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Force Reconciliation — only for Linear */}
      {onReconcile && (
        <div className="pt-2 border-t border-white/[0.05] space-y-2">
          <button
            onClick={onReconcile}
            disabled={isReconciling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-colors text-xs font-medium border border-purple-500/20"
          >
            <RefreshCw size={12} className={isReconciling ? 'animate-spin' : ''} />
            {isReconciling ? 'Riconciliazione...' : 'Force Reconciliation'}
          </button>

          {/* Inline error message */}
          {reconcileError && !isReconciling && (
            <p className="text-xs text-red-400/80 leading-snug">{reconcileError}</p>
          )}

          {/* Inline success message */}
          {reconcileResult && !isReconciling && !reconcileError && (
            <p className="text-xs text-emerald-400/80">
              ✓ {reconcileResult.reconciled.projects} progetti,{' '}
              {reconcileResult.reconciled.tasks} task
              {reconcileResult.reconciled.orphansRemoved > 0
                ? ` · ${reconcileResult.reconciled.orphansRemoved} rimossi`
                : ''}
            </p>
          )}
        </div>
      )}

      {!isConnected && !connectionLoading && (
        <p className="text-xs text-white/30">
          Connetti l&apos;integrazione per monitorarne la salute.
        </p>
      )}
    </div>
  )
}

export function IntegrationHealthSection() {
  const { data: health, isLoading: logsLoading } = useIntegrationHealth()
  const {
    isConnected: linearConnected,
    isLoading: linearLoading,
    lastSyncedAt: linearLastSync,
    forceReconcile,
    isReconciling,
    reconcileError,
    reconcileResult,
  } = useLinearConnection()
  const {
    isConnected: stravaConnected,
    isLoading: stravaLoading,
    lastSyncedAt: stravaLastSync,
  } = useStravaConnection()

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest px-1">
        Salute Integrazioni
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ServiceHealthCard
          name="Strava"
          icon={<Activity size={16} />}
          color="orange"
          isConnected={stravaConnected}
          isLoading={stravaLoading}
          lastSyncedAt={stravaLastSync}
          errorLogs={health?.strava ?? []}
          logsLoading={logsLoading}
        />
        <ServiceHealthCard
          name="Linear"
          icon={<Link2 size={16} />}
          color="purple"
          isConnected={linearConnected}
          isLoading={linearLoading}
          lastSyncedAt={linearLastSync}
          errorLogs={health?.linear ?? []}
          logsLoading={logsLoading}
          onReconcile={linearConnected ? forceReconcile : undefined}
          isReconciling={isReconciling}
          reconcileError={reconcileError}
          reconcileResult={reconcileResult}
        />
      </div>
    </div>
  )
}

