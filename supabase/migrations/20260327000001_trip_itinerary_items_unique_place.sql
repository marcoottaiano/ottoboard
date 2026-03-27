-- Prevent duplicate place assignments to the same slot on the same day.
-- A place can appear in multiple slots (references, not copies), but not twice
-- in the exact same (trip_id, day_date, time_slot, place_id) combination.
CREATE UNIQUE INDEX IF NOT EXISTS trip_itinerary_items_unique_place_slot
  ON trip_itinerary_items (trip_id, day_date, time_slot, place_id)
  WHERE place_id IS NOT NULL;
