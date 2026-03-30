-- Migration: Create wishlist_items table for Epic 11 Gift & Wishlist module
-- Includes columns for Story 11.2 (category, is_public, share_id) to avoid a second migration

CREATE TABLE wishlist_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL DEFAULT auth.uid(),
  name         TEXT NOT NULL,
  link         TEXT,
  price        DECIMAL(10,2),
  photo_url    TEXT,
  status       TEXT NOT NULL DEFAULT 'desiderato', -- 'desiderato' | 'ricevuto' | 'acquistato'
  category     TEXT,                               -- free text, used by Story 11.2
  is_public    BOOLEAN NOT NULL DEFAULT FALSE,     -- public sharing flag, used by Story 11.2
  share_id     UUID UNIQUE DEFAULT gen_random_uuid(), -- stable public URL token, used by Story 11.2
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- Owner policy: user can only see/modify their own items
CREATE POLICY "Users can only see their own wishlist items"
ON wishlist_items FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Public read policy: anon users can read items where is_public = TRUE (used by Story 11.2)
CREATE POLICY "Public read for shared wishlists"
ON wishlist_items FOR SELECT
USING (is_public = TRUE);
