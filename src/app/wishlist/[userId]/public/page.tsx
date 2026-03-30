// Public wishlist page — server component, no auth required.
// Uses the Supabase anon client (RLS: is_public = TRUE allows public SELECT).

import { notFound } from 'next/navigation'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { Gift } from 'lucide-react'
import type { WishlistItem, WishlistItemStatus, WishlistItemPriority } from '@/types/wishlist'
import { prioritySortValue, PRIORITY_LABELS } from '@/types/wishlist'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<WishlistItemStatus, string> = {
  desiderato: 'Desiderato',
  ricevuto: 'Ricevuto',
  acquistato: 'Acquistato',
}

const STATUS_COLORS: Record<WishlistItemStatus, string> = {
  desiderato: 'text-rose-300 bg-rose-500/20 border-rose-500/30',
  ricevuto:   'text-blue-300 bg-blue-500/20 border-blue-500/30',
  acquistato: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30',
}

const PRIORITY_COLORS: Record<WishlistItemPriority, string> = {
  alta:  'text-rose-300 bg-rose-500/10 border-rose-500/20',
  media: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  bassa: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

// ─── Item card (read-only) ─────────────────────────────────────────────────

function PublicItemCard({ item }: { item: WishlistItem }) {
  const isDone = item.status !== 'desiderato'
  const safeLink = item.link && isSafeUrl(item.link) ? item.link : null

  return (
    <div className={`flex items-start gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl transition-all duration-200 ${isDone ? 'opacity-60' : ''}`}>
      {/* Photo thumbnail */}
      {item.photo_url && isSafeUrl(item.photo_url) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photo_url}
          alt={item.name}
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/[0.06]"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-white/[0.06] flex-shrink-0" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium block truncate ${isDone ? 'line-through text-white/40' : 'text-white/80'}`}>
          {safeLink ? (
            <a href={safeLink} target="_blank" rel="noopener noreferrer" className="hover:text-rose-300 transition-colors">
              {item.name}
            </a>
          ) : (
            item.name
          )}
        </span>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[item.status]}`}>
            {STATUS_LABELS[item.status]}
          </span>
          {item.priority && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[item.priority]}`}>
              ↑ {PRIORITY_LABELS[item.priority]}
            </span>
          )}
          {item.price != null && (
            <span className={`text-xs ${isDone ? 'text-white/25' : 'text-white/40'}`}>
              €{item.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { userId: string }
}

// F5: reject malformed userId early — avoids unnecessary DB round-trip and masks real errors
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PublicWishlistPage({ params }: PageProps) {
  if (!UUID_RE.test(params.userId)) notFound()

  // Use anonymous client (no cookies) — public page, no auth session required
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', params.userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error || !data || data.length === 0) {
    notFound()
  }

  // Sort by priority (alta first, null last), preserving created_at order within same priority
  const items = (data as WishlistItem[]).sort(
    (a, b) => prioritySortValue(a.priority) - prioritySortValue(b.priority)
  )

  // Group by category — items without category go into a null group
  // F7: use push (O(n)) instead of spread (O(n²))
  const categoryMap = new Map<string | null, WishlistItem[]>()
  for (const item of items) {
    const key = item.category ?? null
    const existing = categoryMap.get(key)
    if (existing) {
      existing.push(item)
    } else {
      categoryMap.set(key, [item])
    }
  }

  // Order: named categories alphabetically, then uncategorized
  const namedCategories = Array.from(categoryMap.keys()).filter((k): k is string => k !== null).sort()
  const hasUncategorized = categoryMap.has(null)
  const orderedGroups: Array<{ label: string | null; items: WishlistItem[] }> = [
    ...namedCategories.map((cat) => ({ label: cat, items: categoryMap.get(cat)! })),
    ...(hasUncategorized ? [{ label: null, items: categoryMap.get(null)! }] : []),
  ]
  const hasCategories = namedCategories.length > 0

  return (
    <div className="max-w-xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
          <Gift size={22} className="text-rose-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white mb-0.5">Lista Desideri</h1>
          <p className="text-sm text-white/40">{items.length} {items.length === 1 ? 'articolo' : 'articoli'}</p>
        </div>
      </div>

      {/* Items — grouped by category if categories exist */}
      {hasCategories ? (
        <div className="flex flex-col gap-6">
          {orderedGroups.map(({ label, items: groupItems }) => (
            <div key={label ?? '__none__'}>
              {label && (
                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3 px-1">
                  {label}
                </h2>
              )}
              <div className="space-y-2">
                {groupItems.map((item) => (
                  <PublicItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <PublicItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-xs text-white/20 pb-4">
        Condiviso con Ottoboard
      </p>
    </div>
  )
}
