-- Allow unauthenticated read access for trips with an active share_token.
-- The anon Supabase client respects RLS — no service role key required.

-- trips: public read when share_token is set
CREATE POLICY "trips_public_read"
  ON trips FOR SELECT
  USING (share_token IS NOT NULL);

-- trip_places: public read when the associated trip has a share_token
CREATE POLICY "trip_places_public_read"
  ON trip_places FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_places.trip_id
        AND trips.share_token IS NOT NULL
    )
  );

-- trip_accommodations: public read when the associated trip has a share_token
CREATE POLICY "trip_accommodations_public_read"
  ON trip_accommodations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_accommodations.trip_id
        AND trips.share_token IS NOT NULL
    )
  );

-- trip_transports: public read when the associated trip has a share_token
CREATE POLICY "trip_transports_public_read"
  ON trip_transports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_transports.trip_id
        AND trips.share_token IS NOT NULL
    )
  );

-- trip_itinerary_items: public read when the associated trip has a share_token
CREATE POLICY "trip_itinerary_items_public_read"
  ON trip_itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_itinerary_items.trip_id
        AND trips.share_token IS NOT NULL
    )
  );
