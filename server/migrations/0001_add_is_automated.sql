ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_automated boolean NOT NULL DEFAULT false;
