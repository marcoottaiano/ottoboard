-- Epic 10.3: Trip itinerary items for day-by-day drag-and-drop planning

CREATE TABLE trip_itinerary_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id          UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL DEFAULT auth.uid(),
  day_date         DATE NOT NULL,
  time_slot        TEXT NOT NULL CHECK (time_slot IN ('colazione', 'mattina', 'pranzo', 'pomeriggio', 'cena', 'sera')),
  item_type        TEXT NOT NULL CHECK (item_type IN ('place', 'accommodation_checkin', 'accommodation_checkout')),
  place_id         UUID REFERENCES trip_places(id) ON DELETE CASCADE,
  accommodation_id UUID REFERENCES trip_accommodations(id) ON DELETE CASCADE,
  orario_preciso   TIME,
  position         INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE trip_itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_itinerary_items_rls" ON trip_itinerary_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
