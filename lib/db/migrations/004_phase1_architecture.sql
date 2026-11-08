-- RawReply Phase 1 Architecture Schema Update
-- Version: 004

-- 1. Add auth_provider to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(32) DEFAULT 'email_otp' NOT NULL;

-- 2. Automations Table (Multi-tenant comment-to-DM triggers and workflows)
CREATE TABLE IF NOT EXISTS automations (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instagram_account_id VARCHAR(64) NULL,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(64) DEFAULT 'comment' NOT NULL,
    post_id VARCHAR(128) NULL,
    post_caption TEXT NULL,
    post_thumbnail_url TEXT NULL,
    trigger_keyword VARCHAR(128) NULL,
    public_reply_text TEXT NULL,
    dm_message_text TEXT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL, -- 'active', 'draft', 'paused'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automations_org ON automations(organization_id);
CREATE INDEX IF NOT EXISTS idx_automations_status ON automations(status);
CREATE INDEX IF NOT EXISTS idx_automations_instagram_account ON automations(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_automations_created_at ON automations(created_at DESC);

