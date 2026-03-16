'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Unlink, Link2, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { useLinearConnection } from '@/hooks/useLinearConnection'

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

export function LinearIntegrationCard() {
  const {
    isConnected,
    isLoading,
    selectedTeamId,
    selectedTeamName,
    lastSyncedAt,
    teams,
    connect,
    isConnecting,
    connectError,
    disconnect,
    isDisconnecting,
    sync,
    isSyncing,
    syncResult,
    selectTeam,
  } = useLinearConnection()

  const [apiKeyInput, setApiKeyInput] = useState('')

  // Auto-select the first team when connected but no team is selected yet
  useEffect(() => {
    if (isConnected && !selectedTeamId && teams.length > 0) {
      selectTeam({ teamId: teams[0].id, teamName: teams[0].name })
    }
  }, [isConnected, selectedTeamId, teams, selectTeam])

  const handleConnect = () => {
    if (!apiKeyInput.trim()) return
    connect(apiKeyInput.trim())
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-white/80">Linear</h2>
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
          <div className="space-y-1.5 text-xs text-white/40">
            {selectedTeamName && (
              <p>Team: <span className="text-white/60">{selectedTeamName}</span></p>
            )}
            <p>Ultimo sync: <span className="text-white/60">{formatDate(lastSyncedAt)}</span></p>
          </div>

          {/* Team selector */}
          {teams.length > 0 && (
            <div className="relative">
              <select
                value={selectedTeamId ?? ''}
                onChange={(e) => {
                  const team = teams.find(t => t.id === e.target.value)
                  if (team) selectTeam({ teamId: team.id, teamName: team.name })
                }}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-8 text-xs text-white/70 focus:outline-none focus:border-white/30"
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            </div>
          )}

          {syncResult && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <CheckCircle size={13} className="flex-shrink-0" />
              {syncResult.synced.tasks === 0
                ? 'Tutto già aggiornato.'
                : `Sync: ${syncResult.synced.projects} progetti, ${syncResult.synced.tasks} task.`}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => sync()}
              disabled={isSyncing || !selectedTeamId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 transition-colors text-xs font-medium"
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
            Inserisci la tua API key Linear per sincronizzare i progetti.
          </p>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConnect() }}
            placeholder="lin_api_..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30"
          />
          {connectError && (
            <p className="text-xs text-red-400">{connectError}</p>
          )}
          <button
            onClick={handleConnect}
            disabled={isConnecting || !apiKeyInput.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <Link2 size={15} />
            {isConnecting ? 'Connessione...' : 'Connetti Linear'}
          </button>
        </div>
      )}
    </div>
  )
}
