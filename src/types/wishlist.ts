export type WishlistItemStatus = 'desiderato' | 'ricevuto' | 'acquistato'

export interface WishlistItem {
  id: string
  user_id: string
  name: string
  link: string | null
  price: number | null
  photo_url: string | null
  status: WishlistItemStatus
  category: string | null
  is_public: boolean
  share_id: string
  created_at: string
}

export type CreateWishlistItemInput = Pick<
  WishlistItem,
  'name' | 'link' | 'price' | 'photo_url' | 'category'
>

export type UpdateWishlistItemInput = Partial<
  Pick<WishlistItem, 'name' | 'link' | 'price' | 'photo_url' | 'status' | 'category' | 'is_public'>
>

export const STATUS_CYCLE: WishlistItemStatus[] = ['desiderato', 'ricevuto', 'acquistato']

export const STATUS_LABELS: Record<WishlistItemStatus, string> = {
  desiderato: 'Desiderato',
  ricevuto: 'Ricevuto',
  acquistato: 'Acquistato',
}

export function nextStatus(current: WishlistItemStatus): WishlistItemStatus {
  const idx = STATUS_CYCLE.indexOf(current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}
