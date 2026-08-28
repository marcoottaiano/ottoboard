set lock_timeout = '5s';
set statement_timeout = '30s';

-- Remove persisted dashboard entries before the habits widget is removed from the app.
delete from public.dashboard_widgets
where type = 'habits';

-- Drop dependent travel tables before their parent table.
drop table if exists public.trip_itinerary_items;
drop table if exists public.trip_transports;
drop table if exists public.trip_accommodations;
drop table if exists public.trip_places;
drop table if exists public.trips;

drop table if exists public.wishlist_items;

drop table if exists public.habit_completions;
drop table if exists public.habits;
