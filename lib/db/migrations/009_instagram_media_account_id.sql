-- ============================================================================
-- RAWREPLY DATABASE MIGRATION 009
-- Description: Add account_id column to instagram_media table for multi-platform
--              compatibility and backfill from instagram_account_id.
-- ============================================================================

ALTER TABLE instagram_media ADD COLUMN IF NOT EXISTS account_id VARCHAR(64);
UPDATE instagram_media SET account_id = instagram_account_id WHERE account_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_ig_media_account_col ON instagram_media (account_id);
