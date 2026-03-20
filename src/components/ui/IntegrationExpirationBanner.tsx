'use client'

import Link from 'next/link'
import { AlertTriangle, XCircle } from 'lucide-react'
import { useIntegrationExpirationWarning } from '@/hooks/useIntegrationExpirationWarning'

export function IntegrationExpirationBanner() {
  const warnings = useIntegrationExpirationWarning()

  if (warnings.length === 0) return null

  return (
    <div className="space-y-2">
      {warnings.map((w) => {
        const label = w.service === 'strava' ? 'Strava' : 'Linear'

        const message = w.expired
          ? `${label}: connessione persa — Riautentica`
          : `${label}: il token scade in ${w.hoursUntilExpiry}h — Rinnova ora`

        const Icon = w.expired ? XCircle : AlertTriangle
        const colorClass = w.expired
          ? 'bg-red-500/10 border-red-500/20 text-red-400'
          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'

        return (
          <div
            key={w.service}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${colorClass}`}
          >
            <div className="flex items-center gap-2 text-xs font-medium">
              <Icon size={14} className="shrink-0" />
              {message}
            </div>
            <Link
              href="/profile"
              className="text-xs font-semibold underline underline-offset-2 whitespace-nowrap hover:opacity-80 transition-opacity"
            >
              {w.expired ? 'Risolvi ora' : 'Rinnova ora'}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
