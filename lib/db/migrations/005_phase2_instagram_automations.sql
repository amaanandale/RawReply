-- RawReply Phase 2: Real Instagram API, Media Library & Comment-to-DM Schema
-- Version: 005

-- 1. Instagram Media Cache Table
CREATE TABLE IF NOT EXISTS instagram_media (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instagram_account_id VARCHAR(64) NOT NULL,
    media_id VARCHAR(128) NOT NULL,
    media_type VARCHAR(64) NOT NULL, -- 'VIDEO', 'IMAGE', 'CAROUSEL_ALBUM', 'REELS'
    caption TEXT NULL,
    thumbnail_url TEXT NULL,
    media_url TEXT NULL,
    permalink TEXT NULL,
    published_at TIMESTAMP WITH TIME ZONE NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_media_account UNIQUE (instagram_account_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_ig_media_org ON instagram_media(organization_id);
CREATE INDEX IF NOT EXISTS idx_ig_media_account ON instagram_media(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_ig_media_published_at ON instagram_media(published_at DESC);

-- 2. Enhance Automations Table with Phase 2 fields
ALTER TABLE automations ADD COLUMN IF NOT EXISTS user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS post_permalink TEXT NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS trigger_keywords TEXT NULL; -- Comma-separated or JSON list of keywords
ALTER TABLE automations ADD COLUMN IF NOT EXISTS keyword_match_type VARCHAR(32) DEFAULT 'contains' NOT NULL; -- 'any', 'exact', 'contains'
ALTER TABLE automations ADD COLUMN IF NOT EXISTS public_reply_enabled BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS dm_enabled BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS execution_count INT DEFAULT 0 NOT NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMP WITH TIME ZONE NULL;

-- 3. Automation Executions Table (Audit & Idempotency)
CREATE TABLE IF NOT EXISTS automation_executions (
    id VARCHAR(64) PRIMARY KEY,
    automation_id VARCHAR(64) NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instagram_account_id VARCHAR(64) NULL,
    comment_id VARCHAR(128) NOT NULL,
    post_id VARCHAR(128) NULL,
    commenter_id VARCHAR(128) NULL,
    commenter_username VARCHAR(255) NULL,
    comment_text TEXT NULL,
    matched_keyword VARCHAR(128) NULL,
    public_reply_status VARCHAR(32) DEFAULT 'skipped' NOT NULL, -- 'sent', 'skipped', 'failed'
    public_reply_id VARCHAR(128) NULL,
    dm_status VARCHAR(32) DEFAULT 'skipped' NOT NULL, -- 'sent', 'skipped', 'failed'
    dm_id VARCHAR(128) NULL,
    status VARCHAR(32) DEFAULT 'success' NOT NULL, -- 'success', 'partial', 'failed'
    error_message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_automation_comment UNIQUE (automation_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_executions_automation ON automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_executions_org ON automation_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_executions_comment ON automation_executions(comment_id);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON automation_executions(created_at DESC);
