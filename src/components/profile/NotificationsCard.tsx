'use client'

import { Bell, BellOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useNotificationPermission } from '@/hooks/useNotificationPermission'

export function NotificationsCard() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isSubscribing,
    isUnsubscribing,
    subscribe,
    unsubscribe,
  } = useNotificationPermission()

  const isBusy = isSubscribing || isUnsubscribing

  if (!isSupported) {
    return (
      <div className="bg-white/5 rounded-xl p-5 border border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Bell size={18} className="text-yellow-400" />
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">Notifiche Push</h3>
            <p className="text-xs text-gray-500">Promemoria in scadenza</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Il tuo browser non supporta le notifiche push.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 rounded-xl p-5 border border-white/10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-yellow-500/20 flex items-center justify-center">
          <Bell size={18} className="text-yellow-400" />
        </div>
        <div>
          <h3 className="font-medium text-white text-sm">Notifiche Push</h3>
          <p className="text-xs text-gray-500">Promemoria in scadenza</p>
        </div>
        {!isLoading && (
          <div className="ml-auto flex items-center gap-1.5">
            {isSubscribed ? (
              <>
                <CheckCircle size={14} className="text-green-400" />
                <span className="text-xs text-green-400 font-medium">Attive</span>
              </>
            ) : permission === 'denied' ? (
              <>
                <AlertCircle size={14} className="text-red-400" />
                <span className="text-xs text-red-400 font-medium">Bloccate</span>
              </>
            ) : (
              <>
                <BellOff size={14} className="text-gray-500" />
                <span className="text-xs text-gray-500">Non attivate</span>
              </>
            )}
          </div>
        )}
      </div>

      {permission === 'denied' ? (
        <p className="text-xs text-gray-500">
          Le notifiche sono bloccate dal browser. Abilitale nelle impostazioni del browser per ricevere i promemoria.
        </p>
      ) : isSubscribed ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            Riceverai una notifica ogni mattina per i promemoria in scadenza oggi o scaduti.
          </p>
          <button
            onClick={unsubscribe}
            disabled={isBusy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {isUnsubscribing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <BellOff size={13} />
            )}
            Disattiva notifiche
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            Attiva le notifiche per ricevere un promemoria mattutino sui task in scadenza.
          </p>
          <button
            onClick={subscribe}
            disabled={isBusy || isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
          >
            {isSubscribing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Bell size={13} />
            )}
            Attiva notifiche
          </button>
        </div>
      )}
    </div>
  )
}
