'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const STATUS_KEY = ['notification-status']

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

export function useNotificationPermission() {
  const queryClient = useQueryClient()
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const statusQuery = useQuery<{ subscribed: boolean }>({
    queryKey: STATUS_KEY,
    queryFn: async () => {
      const res = await fetch('/api/notifications/status')
      if (!res.ok) return { subscribed: false }
      return res.json()
    },
    enabled: isSupported,
  })

  const subscribe = useCallback(async () => {
    if (!isSupported) return
    setIsSubscribing(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const swTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Service worker non disponibile. Apri l\'app dal browser dopo averla installata come PWA.')), 5000)
      )
      const reg = await Promise.race([navigator.serviceWorker.ready, swTimeout])

      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error('VAPID key non configurata')

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      if (!res.ok) throw new Error('Errore nel salvataggio della subscription')

      queryClient.invalidateQueries({ queryKey: STATUS_KEY })
      toast.success('Notifiche attivate')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
      toast.error(msg)
    } finally {
      setIsSubscribing(false)
    }
  }, [isSupported, queryClient])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return
    setIsUnsubscribing(true)
    try {
      const swReg = await navigator.serviceWorker.getRegistration()
      if (swReg) {
        const sub = await swReg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      }

      await fetch('/api/notifications/subscribe', { method: 'DELETE' })
      queryClient.invalidateQueries({ queryKey: STATUS_KEY })
      toast.success('Notifiche disattivate')
    } finally {
      setIsUnsubscribing(false)
    }
  }, [isSupported, queryClient])

  return {
    isSupported,
    permission,
    isSubscribed: statusQuery.data?.subscribed ?? false,
    isLoading: statusQuery.isLoading,
    isSubscribing,
    isUnsubscribing,
    subscribe,
    unsubscribe,
  }
}
