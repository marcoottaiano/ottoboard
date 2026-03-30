export type WishlistItemStatus = 'desiderato' | 'ricevuto' | 'acquistato'
export type WishlistItemPriority = 'alta' | 'media' | 'bassa'

export interface WishlistItem {
  id: string
  user_id: string
  name: string
  link: string | null
  price: number | null
  photo_url: string | null
  status: WishlistItemStatus
  category: string | null
  priority: WishlistItemPriority | null
  is_public: boolean
  share_id: string
  created_at: string
}

export type CreateWishlistItemInput = Pick<
  WishlistItem,
  'name' | 'link' | 'price' | 'photo_url' | 'category' | 'priority'
>

export type UpdateWishlistItemInput = Partial<
  Pick<WishlistItem, 'name' | 'link' | 'price' | 'photo_url' | 'status' | 'category' | 'is_public' | 'priority'>
>

export const STATUS_CYCLE: WishlistItemStatus[] = ['desiderato', 'ricevuto', 'acquistato']

export const STATUS_LABELS: Record<WishlistItemStatus, string> = {
  desiderato: 'Desiderato',
  ricevuto: 'Ricevuto',
  acquistato: 'Acquistato',
}

export const PRIORITY_LABELS: Record<WishlistItemPriority, string> = {
  alta: 'Alta',
  media: 'Media',
  bassa: 'Bassa',
}

// Sort order for priority: alta=0, media=1, bassa=2, null=3
export const PRIORITY_ORDER: Record<WishlistItemPriority, number> = {
  alta: 0,
  media: 1,
  bassa: 2,
}

export function prioritySortValue(priority: WishlistItemPriority | null): number {
  return priority !== null ? PRIORITY_ORDER[priority] : 3
}

export function nextStatus(current: WishlistItemStatus): WishlistItemStatus {
  const idx = STATUS_CYCLE.indexOf(current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}
