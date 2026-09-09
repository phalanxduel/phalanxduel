-- Match lifecycle timestamps are UTC instants. Existing timestamp-without-timezone
-- values were written by the application as UTC and must be interpreted as such.
ALTER TABLE matches
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
