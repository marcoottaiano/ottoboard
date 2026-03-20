'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Loader2 } from 'lucide-react'
import { useNotificationPermission } from '@/hooks/useNotificationPermission'

const DISMISSED_KEY = 'notification-banner-dismissed'

export function NotificationPermissionBanner() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isSubscribing,
    subscribe,
  } = useNotificationPermission()

  const [isDismissed, setIsDismissed] = useState(true) // Start true to prevent flash
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const dismissed = localStorage.getItem(DISMISSED_KEY) === 'true'
    setIsDismissed(dismissed)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setIsDismissed(true)
  }

  // Show banner when ALL conditions true:
  // - Client-side mounted
  // - Browser supports notifications
  // - Not currently loading status
  // - Not already subscribed
  // - Permission not explicitly granted (though usually implied by !isSubscribed, but safe check)
  // - Not dismissed by user
  if (
    !isClient ||
    !isSupported ||
    isLoading ||
    isSubscribed ||
    permission === 'granted' ||
    isDismissed
  ) {
    return null
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <Bell size={15} className="text-amber-400 shrink-0" />
      <span className="text-white/70 flex-1 text-xs">
        Attiva notifiche per i promemoria
      </span>
      <button
        onClick={subscribe}
        disabled={isSubscribing}
        className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-colors whitespace-nowrap flex items-center gap-1.5"
      >
        {isSubscribing ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          'Attiva'
        )}
      </button>
      <button
        onClick={handleDismiss}
        className="text-gray-600 hover:text-gray-400 transition-colors ml-1 p-0.5"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
