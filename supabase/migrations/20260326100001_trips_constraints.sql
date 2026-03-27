-- Epic 10: Add DB-level constraints to trips table
ALTER TABLE trips
  ADD CONSTRAINT trips_stato_check
    CHECK (stato IN ('bozza', 'pianificato', 'in_corso', 'completato')),
  ADD CONSTRAINT trips_partecipanti_check
    CHECK (partecipanti >= 1),
  ADD CONSTRAINT trips_date_order_check
    CHECK (data_fine IS NULL OR data_inizio IS NULL OR data_fine >= data_inizio);
