-- ============================================================================
-- RAWREPLY COMPLETE NEON POSTGRESQL ARCHITECTURE & IMPLEMENTATION
-- Migration Version: 007
-- Description: Complete 8-group production schema with strict foreign keys,
--              CHECK constraints, JSONB metadata, audit logging, data deletion,
--              lead tracking, and removal of subscription dependencies.
-- ============================================================================

-- 0. Enable cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- OVERRIDE: DECOUPLE & DROP SUBSCRIPTIONS (RawReply is 100% Free & Unlimited)
-- ============================================================================
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS subscription_events CASCADE;

-- ============================================================================
-- GROUP 1: AUTHENTICATION & IDENTITY
-- ============================================================================

-- 1.1 Users Table Upgrades
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role VARCHAR(32) DEFAULT 'customer' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(32) DEFAULT 'local' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_status') THEN
        ALTER TABLE users ADD CONSTRAINT chk_user_status CHECK (status IN ('active', 'suspended', 'deleted'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_platform_role') THEN
        ALTER TABLE users ADD CONSTRAINT chk_user_platform_role CHECK (platform_role IN ('super_admin', 'customer'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);
CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON users (is_super_admin) WHERE is_super_admin = true;

-- 1.2 User Credentials (Multi-Provider: local bcrypt, Google OAuth, Email OTP)
CREATE TABLE IF NOT EXISTS user_credentials (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auth_provider VARCHAR(32) DEFAULT 'local' NOT NULL,
    password_hash VARCHAR(255) NULL,
    provider_subject VARCHAR(255) NULL,
    password_changed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_user_provider UNIQUE (user_id, auth_provider)
);
CREATE INDEX IF NOT EXISTS idx_user_credentials_provider_sub ON user_credentials (auth_provider, provider_subject);

-- 1.3 OTP Verifications (Email verification & passwordless auth)
CREATE TABLE IF NOT EXISTS otp_verifications (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    otp_code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT DEFAULT 0 NOT NULL,
    max_attempts INT DEFAULT 5 NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_otp_purpose CHECK (purpose IN ('email_verification', 'password_reset', 'login'))
);
CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON otp_verifications (LOWER(email), purpose);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications (expires_at);

-- 1.4 Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_token_hash ON password_reset_tokens (token_hash);

-- 1.5 User Sessions & Active Refresh Tokens
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(64) NULL,
    ip_address VARCHAR(64) NULL,
    user_agent TEXT NULL,
    is_revoked BOOLEAN DEFAULT false NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(64) NULL;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions (expires_at);

-- 1.6 Login Events (Security & Anomaly Detection)
CREATE TABLE IF NOT EXISTS login_events (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(64) NULL,
    user_agent TEXT NULL,
    success BOOLEAN DEFAULT false NOT NULL,
    failure_reason VARCHAR(128) NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE login_events ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(128) NULL;
ALTER TABLE login_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb NOT NULL;
CREATE INDEX IF NOT EXISTS idx_login_events_user_id ON login_events (user_id);
CREATE INDEX IF NOT EXISTS idx_login_events_created_at ON login_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_ip ON login_events (ip_address);

-- ============================================================================
-- GROUP 2: MULTI-TENANT WORKSPACES & TEAMS
-- ============================================================================

-- 2.1 Organizations Upgrades
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug VARCHAR(128) NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active' NOT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_org_status') THEN
        ALTER TABLE organizations ADD CONSTRAINT chk_org_status CHECK (status IN ('active', 'suspended', 'archived'));
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations (status);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);

-- 2.2 Organization Members
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'member' NOT NULL;
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_org_member_role') THEN
        ALTER TABLE organization_members ADD CONSTRAINT chk_org_member_role CHECK (role IN ('owner', 'admin', 'member'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_org_member_user') THEN
        ALTER TABLE organization_members ADD CONSTRAINT uq_org_member_user UNIQUE (organization_id, user_id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members (user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_role ON organization_members (organization_id, role);

-- 2.3 Organization Settings
CREATE TABLE IF NOT EXISTS organization_settings (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    timezone VARCHAR(64) DEFAULT 'UTC' NOT NULL,
    default_export_destination VARCHAR(32) DEFAULT 'excel' NOT NULL,
    excel_auto_sync BOOLEAN DEFAULT true NOT NULL,
    google_sheets_auto_sync BOOLEAN DEFAULT false NOT NULL,
    lead_qualification_rules JSONB DEFAULT '{"require_phone": true}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- GROUP 3: INSTAGRAM INTEGRATION & TOKEN MANAGEMENT
-- ============================================================================

-- 3.1 Instagram Accounts Upgrades
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS instagram_user_id VARCHAR(128) NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS instagram_business_id VARCHAR(128) NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS facebook_page_id VARCHAR(128) NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS page_id VARCHAR(128) NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS page_access_token_encrypted TEXT NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS encrypted_page_token TEXT NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS encrypted_access_token TEXT NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS instagram_business_account_id VARCHAR(128) NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS profile_picture_url TEXT NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS account_type VARCHAR(32) DEFAULT 'BUSINESS' NOT NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'connected' NOT NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS token_type VARCHAR(32) DEFAULT 'long_lived_user' NOT NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS scopes JSONB DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS token_health_status VARCHAR(32) DEFAULT 'valid' NOT NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS last_token_refresh_at TIMESTAMPTZ NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS webhook_subscription_status VARCHAR(32) DEFAULT 'active' NOT NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS webhook_subscribed_at TIMESTAMPTZ NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS platform VARCHAR(32) DEFAULT 'instagram' NOT NULL;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instagram_accounts' AND column_name = 'instagram_business_id') THEN
        UPDATE instagram_accounts SET instagram_user_id = COALESCE(instagram_user_id, instagram_business_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instagram_accounts' AND column_name = 'instagram_user_id') THEN
        UPDATE instagram_accounts SET instagram_business_id = COALESCE(instagram_business_id, instagram_user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ig_acc_status') THEN
        ALTER TABLE instagram_accounts ADD CONSTRAINT chk_ig_acc_status CHECK (status IN ('connected', 'active', 'disconnected', 'expired', 'error'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ig_acc_token_health') THEN
        ALTER TABLE instagram_accounts ADD CONSTRAINT chk_ig_acc_token_health CHECK (token_health_status IN ('valid', 'expiring_soon', 'expired', 'revoked', 'rate_limited'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_ig_acc_org_ig_user') AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_org_instagram_account') THEN
        ALTER TABLE instagram_accounts ADD CONSTRAINT uq_ig_acc_org_ig_user UNIQUE (organization_id, instagram_user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ig_accounts_org_status ON instagram_accounts (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_ig_user_id ON instagram_accounts (instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_token_expires ON instagram_accounts (token_expires_at);

-- 3.2 Instagram OAuth States (CSRF & State Security)
CREATE TABLE IF NOT EXISTS instagram_oauth_states (
    id VARCHAR(64) PRIMARY KEY,
    state VARCHAR(128) NOT NULL UNIQUE,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    platform VARCHAR(32) DEFAULT 'instagram' NOT NULL,
    return_to TEXT DEFAULT '/dashboard' NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ig_oauth_states_state ON instagram_oauth_states (state);
CREATE INDEX IF NOT EXISTS idx_ig_oauth_states_expires ON instagram_oauth_states (expires_at);

-- 3.3 Instagram Media Cache Upgrades
ALTER TABLE instagram_media ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0 NOT NULL;
ALTER TABLE instagram_media ADD COLUMN IF NOT EXISTS comments_count INT DEFAULT 0 NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ig_media_account_id ON instagram_media (instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_ig_media_org_published ON instagram_media (organization_id, published_at DESC);

-- 3.4 Instagram Webhook Events
CREATE TABLE IF NOT EXISTS instagram_webhook_events (
    id VARCHAR(64) PRIMARY KEY,
    external_event_id VARCHAR(255) NULL,
    organization_id VARCHAR(64) NULL REFERENCES organizations(id) ON DELETE SET NULL,
    instagram_account_id VARCHAR(64) NULL,
    object_type VARCHAR(64) DEFAULT 'instagram' NOT NULL,
    entry_id VARCHAR(128) NULL,
    field VARCHAR(64) NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) DEFAULT 'received' NOT NULL,
    error_message TEXT NULL,
    processed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_ig_wh_status CHECK (status IN ('received', 'processed', 'ignored', 'failed'))
);
CREATE INDEX IF NOT EXISTS idx_ig_wh_external_id ON instagram_webhook_events (external_event_id);
CREATE INDEX IF NOT EXISTS idx_ig_wh_status_created ON instagram_webhook_events (status, created_at DESC);

-- ============================================================================
-- GROUP 4: AUTOMATION MANAGEMENT
-- ============================================================================

-- 4.1 Automations Upgrades
ALTER TABLE automations ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active' NOT NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(64) DEFAULT 'comment_keyword' NOT NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS trigger_keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS dm_template TEXT;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS public_reply_template TEXT;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS delay_seconds INT DEFAULT 0 NOT NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS execution_count INT DEFAULT 0 NOT NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_automation_status') THEN
        ALTER TABLE automations ADD CONSTRAINT chk_automation_status CHECK (status IN ('active', 'paused', 'draft', 'archived'));
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_automations_org_status ON automations (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_automations_post_id ON automations (post_id);

-- 4.2 Automation Triggers
CREATE TABLE IF NOT EXISTS automation_triggers (
    id VARCHAR(64) PRIMARY KEY,
    automation_id VARCHAR(64) NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    trigger_type VARCHAR(64) DEFAULT 'comment_keyword' NOT NULL,
    keywords JSONB DEFAULT '[]'::jsonb NOT NULL,
    match_type VARCHAR(32) DEFAULT 'contains' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_trigger_match CHECK (match_type IN ('contains', 'exact', 'starts_with'))
);
CREATE INDEX IF NOT EXISTS idx_auto_triggers_auto_id ON automation_triggers (automation_id);

-- 4.3 Automation Posts
CREATE TABLE IF NOT EXISTS automation_posts (
    id VARCHAR(64) PRIMARY KEY,
    automation_id VARCHAR(64) NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    post_id VARCHAR(128) NOT NULL,
    post_type VARCHAR(32) DEFAULT 'post' NOT NULL,
    post_caption TEXT NULL,
    post_thumbnail_url TEXT NULL,
    post_permalink TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auto_posts_auto_id ON automation_posts (automation_id);
CREATE INDEX IF NOT EXISTS idx_auto_posts_post_id ON automation_posts (post_id);

-- 4.4 Automation Actions
CREATE TABLE IF NOT EXISTS automation_actions (
    id VARCHAR(64) PRIMARY KEY,
    automation_id VARCHAR(64) NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    action_type VARCHAR(32) NOT NULL,
    public_reply_text TEXT NULL,
    dm_message_text TEXT NULL,
    delay_seconds INT DEFAULT 0 NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_action_type CHECK (action_type IN ('public_reply', 'private_dm'))
);
CREATE INDEX IF NOT EXISTS idx_auto_actions_auto_id ON automation_actions (automation_id);

-- 4.5 Automation Execution Logs (Idempotent Execution Audit)
CREATE TABLE IF NOT EXISTS automation_execution_logs (
    id VARCHAR(64) PRIMARY KEY,
    automation_id VARCHAR(64) NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instagram_account_id VARCHAR(64) NULL,
    account_id VARCHAR(64) NULL,
    platform VARCHAR(32) DEFAULT 'instagram' NOT NULL,
    comment_id VARCHAR(128) NOT NULL,
    post_id VARCHAR(128) NULL,
    commenter_id VARCHAR(128) NULL,
    commenter_username VARCHAR(255) NULL,
    comment_text TEXT NULL,
    matched_keyword VARCHAR(128) NULL,
    public_reply_status VARCHAR(32) DEFAULT 'skipped' NOT NULL,
    public_reply_id VARCHAR(128) NULL,
    dm_status VARCHAR(32) DEFAULT 'skipped' NOT NULL,
    dm_id VARCHAR(128) NULL,
    status VARCHAR(32) DEFAULT 'success' NOT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_auto_exec_log UNIQUE (automation_id, comment_id)
);
CREATE INDEX IF NOT EXISTS idx_auto_exec_logs_auto ON automation_execution_logs (automation_id);
CREATE INDEX IF NOT EXISTS idx_auto_exec_logs_org_created ON automation_execution_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_exec_logs_comment ON automation_execution_logs (comment_id);

-- ============================================================================
-- GROUP 5: INSTAGRAM CONVERSATIONS & COMMENTS
-- ============================================================================

-- 5.1 Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instagram_account_id VARCHAR(64) NULL,
    participant_id VARCHAR(128) NULL,
    participant_username VARCHAR(255) NULL,
    participant_name VARCHAR(255) NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL,
    last_message_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS instagram_account_id VARCHAR(64) NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS participant_id VARCHAR(128) NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS participant_username VARCHAR(255) NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS participant_name VARCHAR(255) NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ NULL;
UPDATE conversations SET participant_id = COALESCE(participant_id, id);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_conversation_participant') THEN
        ALTER TABLE conversations ADD CONSTRAINT uq_conversation_participant UNIQUE (instagram_account_id, participant_id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations (organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant ON conversations (participant_id);

-- 5.2 Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    external_message_id VARCHAR(128) NULL,
    sender_type VARCHAR(32) DEFAULT 'user' NOT NULL,
    sender_id VARCHAR(128) NULL,
    recipient_id VARCHAR(128) NULL,
    text TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb NOT NULL,
    delivery_status VARCHAR(32) DEFAULT 'delivered' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_sender_type CHECK (sender_type IN ('user', 'lead', 'bot'))
);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) NULL REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS external_message_id VARCHAR(128) NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_type VARCHAR(32) DEFAULT 'user' NOT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id VARCHAR(128) NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id VARCHAR(128) NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS text TEXT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(32) DEFAULT 'delivered' NOT NULL;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'mid') THEN
        UPDATE messages SET external_message_id = COALESCE(external_message_id, mid);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'body') THEN
        UPDATE messages SET text = COALESCE(text, body, '');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON messages (external_message_id);

-- 5.3 Instagram Comments Table
CREATE TABLE IF NOT EXISTS instagram_comments (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instagram_account_id VARCHAR(64) NULL,
    instagram_comment_id VARCHAR(128) NOT NULL UNIQUE,
    post_id VARCHAR(128) NULL,
    commenter_id VARCHAR(128) NULL,
    commenter_username VARCHAR(255) NULL,
    comment_text TEXT NOT NULL,
    is_reply_sent BOOLEAN DEFAULT false NOT NULL,
    reply_comment_id VARCHAR(128) NULL,
    parent_comment_id VARCHAR(128) NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ig_comments_org ON instagram_comments (organization_id);
CREATE INDEX IF NOT EXISTS idx_ig_comments_comment_id ON instagram_comments (instagram_comment_id);
CREATE INDEX IF NOT EXISTS idx_ig_comments_post_id ON instagram_comments (post_id);

-- ============================================================================
-- GROUP 6: QUALIFIED LEAD CAPTURE
-- ============================================================================

-- 6.1 Captured Leads (Strict Phone Number Qualification)
ALTER TABLE captured_leads ADD COLUMN IF NOT EXISTS source_post_id VARCHAR(128) NULL;
ALTER TABLE captured_leads ADD COLUMN IF NOT EXISTS source_comment_id VARCHAR(128) NULL;
ALTER TABLE captured_leads ADD COLUMN IF NOT EXISTS instagram_user_id VARCHAR(128) NULL;
ALTER TABLE captured_leads ADD COLUMN IF NOT EXISTS exported_to_sheets BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE captured_leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_lead_org_phone_post') THEN
        ALTER TABLE captured_leads ADD CONSTRAINT uq_lead_org_phone_post UNIQUE (organization_id, phone, source_post_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_lead_status') THEN
        ALTER TABLE captured_leads ADD CONSTRAINT chk_lead_status CHECK (status IN ('new', 'qualified', 'contacted', 'converted', 'exported', 'archived', 'not_interested'));
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_captured_leads_org_phone ON captured_leads (organization_id, phone);
CREATE INDEX IF NOT EXISTS idx_captured_leads_status ON captured_leads (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_captured_leads_created_at ON captured_leads (created_at DESC);

-- 6.2 Lead Export Logs (Excel & Sheets Tracking)
CREATE TABLE IF NOT EXISTS lead_export_logs (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    exported_by_user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    export_destination VARCHAR(64) DEFAULT 'excel' NOT NULL,
    lead_count INT DEFAULT 0 NOT NULL,
    file_name VARCHAR(255) NULL,
    file_size_bytes INT NULL,
    filters_applied JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_export_dest CHECK (export_destination IN ('excel', 'google_sheets', 'csv'))
);
CREATE INDEX IF NOT EXISTS idx_lead_export_logs_org ON lead_export_logs (organization_id, created_at DESC);

-- ============================================================================
-- GROUP 7: SUPER ADMIN & OBSERVABILITY
-- ============================================================================

-- 7.1 Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NULL REFERENCES organizations(id) ON DELETE SET NULL,
    user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) NULL,
    resource_id VARCHAR(128) NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip_address VARCHAR(64) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_user ON audit_logs (organization_id, user_id);

-- Synced compatibility with system_audit_logs if present
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_audit_logs' AND table_type = 'BASE TABLE') THEN
        INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, metadata, ip_address, created_at)
        SELECT 
            s.id, 
            u.id, 
            s.action, 
            s.target_type, 
            s.target_id, 
            json_build_object('details', s.details, 'actor_email', s.actor_email, 'actor_id', s.actor_id)::jsonb, 
            s.ip_address, 
            s.created_at
        FROM system_audit_logs s
        LEFT JOIN users u ON u.id = s.actor_id
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 7.2 Admin Actions (Super Admin Governance)
CREATE TABLE IF NOT EXISTS admin_actions (
    id VARCHAR(64) PRIMARY KEY,
    super_admin_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    target_organization_id VARCHAR(64) NULL REFERENCES organizations(id) ON DELETE SET NULL,
    action_type VARCHAR(64) NOT NULL,
    reason TEXT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_admin_action_type CHECK (action_type IN ('suspend_user', 'activate_user', 'change_role', 'delete_user', 'force_disconnect_ig', 'system_setting_change'))
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_super_admin ON admin_actions (super_admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user ON admin_actions (target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions (created_at DESC);

-- 7.3 System Errors (Sanitized Exception Monitoring)
CREATE TABLE IF NOT EXISTS system_errors (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NULL REFERENCES organizations(id) ON DELETE SET NULL,
    customer_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    endpoint VARCHAR(255) NULL,
    error_fingerprint VARCHAR(128) NULL,
    safe_message TEXT NOT NULL,
    error_stack_sanitized TEXT NULL,
    resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_at TIMESTAMPTZ NULL,
    resolved_by_user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT NULL,
    occurrence_count INT DEFAULT 1 NOT NULL,
    first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_system_error_sev CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS organization_id VARCHAR(64) NULL REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS customer_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255) NULL;
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS error_fingerprint VARCHAR(128) NULL;
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS safe_message TEXT NULL;
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS error_stack_sanitized TEXT NULL;
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS resolved_by_user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS resolution_notes TEXT NULL;
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS occurrence_count INT DEFAULT 1 NOT NULL;
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;
ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_errors' AND column_name = 'fingerprint') THEN
        UPDATE system_errors SET error_fingerprint = COALESCE(error_fingerprint, fingerprint);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_errors' AND column_name = 'message') THEN
        UPDATE system_errors SET safe_message = COALESCE(safe_message, message, 'Internal error');
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_errors' AND column_name = 'stack_trace') THEN
        UPDATE system_errors SET error_stack_sanitized = COALESCE(error_stack_sanitized, stack_trace);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_system_errors_created ON system_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_errors_fingerprint ON system_errors (error_fingerprint);
CREATE INDEX IF NOT EXISTS idx_system_errors_resolved ON system_errors (resolved);

-- 7.4 Webhook Events (Idempotency & Deduplication)
CREATE TABLE IF NOT EXISTS webhook_events (
    id VARCHAR(64) PRIMARY KEY,
    external_event_id VARCHAR(255) NULL,
    event_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'received' NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_wh_event_status CHECK (status IN ('received', 'processed', 'failed', 'deduplicated'))
);
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS external_event_id VARCHAR(255) NULL;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS payload JSONB NULL;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS error_message TEXT NULL;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'dedup_key') THEN
        UPDATE webhook_events SET external_event_id = COALESCE(external_event_id, dedup_key);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'raw_payload') THEN
        UPDATE webhook_events SET payload = COALESCE(payload, raw_payload, '{}'::jsonb);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'last_error') THEN
        UPDATE webhook_events SET error_message = COALESCE(error_message, last_error);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wh_events_external_id ON webhook_events (external_event_id);
CREATE INDEX IF NOT EXISTS idx_wh_events_status_created ON webhook_events (status, created_at DESC);

-- ============================================================================
-- GROUP 8: PRIVACY & DATA DELETION
-- ============================================================================

-- 8.1 Data Deletion Requests (User Self-Service & Meta Callbacks)
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id VARCHAR(64) PRIMARY KEY,
    confirmation_code VARCHAR(64) NOT NULL UNIQUE,
    request_type VARCHAR(64) DEFAULT 'user_self_service' NOT NULL,
    user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    organization_id VARCHAR(64) NULL REFERENCES organizations(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NULL,
    instagram_user_id VARCHAR(128) NULL,
    status VARCHAR(32) DEFAULT 'pending' NOT NULL,
    deletion_scope JSONB DEFAULT '{"meta_data": true, "leads": false, "workspace": false}'::jsonb NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMPTZ NULL,
    verification_details JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_deletion_req_type CHECK (request_type IN ('user_self_service', 'meta_callback', 'admin_request')),
    CONSTRAINT chk_deletion_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);
CREATE INDEX IF NOT EXISTS idx_data_deletion_code ON data_deletion_requests (confirmation_code);
CREATE INDEX IF NOT EXISTS idx_data_deletion_status ON data_deletion_requests (status);

-- 8.2 Data Deletion Events (Execution Audit Trail)
CREATE TABLE IF NOT EXISTS data_deletion_events (
    id VARCHAR(64) PRIMARY KEY,
    request_id VARCHAR(64) NOT NULL REFERENCES data_deletion_requests(id) ON DELETE CASCADE,
    table_name VARCHAR(64) NOT NULL,
    records_deleted INT DEFAULT 0 NOT NULL,
    status VARCHAR(32) DEFAULT 'success' NOT NULL,
    error_message TEXT NULL,
    executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_data_deletion_events_req ON data_deletion_events (request_id);

-- 8.3 Privacy Requests (GDPR / CCPA Requests)
CREATE TABLE IF NOT EXISTS privacy_requests (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    request_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'pending' NOT NULL,
    notes TEXT NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_privacy_req_type CHECK (request_type IN ('export', 'deletion', 'rectification')),
    CONSTRAINT chk_privacy_status CHECK (status IN ('pending', 'completed', 'rejected'))
);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_email ON privacy_requests (LOWER(user_email));
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests (status);
