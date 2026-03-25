-- Story 7.1: Remove 'linear' from integration_error_logs CHECK constraint
-- The Linear integration has been removed; only 'strava' is a valid service.

ALTER TABLE integration_error_logs
  DROP CONSTRAINT IF EXISTS integration_error_logs_service_check;

ALTER TABLE integration_error_logs
  ADD CONSTRAINT integration_error_logs_service_check
  CHECK (service IN ('strava'));
