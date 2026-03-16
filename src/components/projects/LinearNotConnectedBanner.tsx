'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export function LinearNotConnectedBanner() {
  return (
    <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
      <AlertTriangle size={16} className="flex-shrink-0" />
      <p className="flex-1">
        Collega Linear in Impostazioni per sincronizzare i tuoi progetti.
      </p>
      <Link
        href="/profile"
        className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
      >
        Impostazioni
      </Link>
    </div>
  )
}
