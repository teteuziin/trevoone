-- Migration 013: Consultancy Canonical Timezone Foundation
-- Adds canonical operational timezone to consultancies table and backfills existing rows

-- 1. Add column nullable
ALTER TABLE consultancies
ADD COLUMN timezone VARCHAR(64) NULL AFTER logo_url;

-- 2. Backfill existing consultancies to America/Sao_Paulo bootstrap value
UPDATE consultancies
SET timezone = 'America/Sao_Paulo'
WHERE timezone IS NULL;

-- 3. Enforce NOT NULL without relying on a permanent DB default
ALTER TABLE consultancies
MODIFY COLUMN timezone VARCHAR(64) NOT NULL;
