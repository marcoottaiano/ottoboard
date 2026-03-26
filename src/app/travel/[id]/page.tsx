'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plane } from 'lucide-react'

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/travel"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Plane size={15} className="text-blue-400" />
        </div>
        <h1 className="text-lg font-semibold text-white">Dettaglio viaggio</h1>
      </div>
      <p className="text-sm text-white/40">
        Trip ID: {id} — Sezioni disponibili nelle storie 10.2–10.5
      </p>
    </div>
  )
}
