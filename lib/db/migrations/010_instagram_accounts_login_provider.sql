-- RawReply Migration 010: Add login_provider to instagram_accounts
-- Allows differentiating between accounts connected via Direct Instagram Login (graph.instagram.com)
-- and accounts connected via Facebook Unified Login (graph.facebook.com).

ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS login_provider VARCHAR(32) DEFAULT 'facebook' NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ig_accounts_login_provider ON instagram_accounts(login_provider);
