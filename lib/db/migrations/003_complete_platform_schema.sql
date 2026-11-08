-- RawReply Complete Platform, Integrations, Monitoring & Governance Schema (PostgreSQL)
-- Version: 003

-- 1. Extend Users table with last_login_at
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE NULL;

-- 2. Instagram Accounts Table (Multi-tenant persistent Instagram accounts)
CREATE TABLE IF NOT EXISTS instagram_accounts (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instagram_business_id VARCHAR(128) NOT NULL,
    username VARCHAR(255) NOT NULL,
    name VARCHAR(255) NULL,
    profile_picture_url TEXT NULL,
    account_type VARCHAR(32) DEFAULT 'BUSINESS' NOT NULL,
    page_id VARCHAR(128) NULL,
    page_name VARCHAR(255) NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_page_token TEXT NULL,
    status VARCHAR(32) DEFAULT 'connected' NOT NULL, -- 'connected' or 'disconnected'
    token_expires_at TIMESTAMP WITH TIME ZONE NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE NULL,
    last_webhook_at TIMESTAMP WITH TIME ZONE NULL,
    last_error TEXT NULL,
    CONSTRAINT uq_org_instagram_account UNIQUE (organization_id, instagram_business_id)
);

CREATE INDEX IF NOT EXISTS idx_ig_accounts_org ON instagram_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_business_id ON instagram_accounts(instagram_business_id);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_username ON instagram_accounts(username);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_status ON instagram_accounts(status);

-- 3. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instagram_account_id VARCHAR(64) NULL,
    participant_id VARCHAR(128) NOT NULL,
    participant_username VARCHAR(255) NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL, -- 'active', 'waiting_phone', 'qualified', 'closed'
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_org_participant UNIQUE (organization_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant ON conversations(participant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sender_type VARCHAR(32) NOT NULL, -- 'participant', 'bot', 'admin'
    sender_id VARCHAR(128) NOT NULL,
    text TEXT NOT NULL,
    mid VARCHAR(255) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 5. Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instagram_account_id VARCHAR(64) NULL,
    media_id VARCHAR(128) NOT NULL,
    comment_id VARCHAR(128) UNIQUE NOT NULL,
    from_id VARCHAR(128) NOT NULL,
    from_username VARCHAR(255) NULL,
    text TEXT NOT NULL,
    matched_keyword VARCHAR(128) NULL,
    automation_id VARCHAR(64) NULL,
    trigger_status VARCHAR(32) DEFAULT 'processed' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_org ON comments(organization_id);
CREATE INDEX IF NOT EXISTS idx_comments_media ON comments(media_id);
CREATE INDEX IF NOT EXISTS idx_comments_comment_id ON comments(comment_id);

-- 6. Captured Qualified Leads Table
CREATE TABLE IF NOT EXISTS captured_leads (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    instagram_account_id VARCHAR(64) NULL,
    conversation_id VARCHAR(64) NULL,
    comment_id VARCHAR(64) NULL,
    participant_id VARCHAR(128) NULL,
    username VARCHAR(255) NULL,
    full_name VARCHAR(255) NULL,
    phone VARCHAR(32) NOT NULL,
    country_code VARCHAR(16) NULL,
    status VARCHAR(32) DEFAULT 'qualified' NOT NULL, -- 'qualified', 'contacted', 'exported', 'archived'
    source_post_id VARCHAR(128) NULL,
    source_post_caption TEXT NULL,
    source_automation_id VARCHAR(64) NULL,
    source_automation_name VARCHAR(255) NULL,
    exported_to_excel_at TIMESTAMP WITH TIME ZONE NULL,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_org_account_phone UNIQUE (organization_id, instagram_account_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_captured_leads_org ON captured_leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_captured_leads_phone ON captured_leads(phone);
CREATE INDEX IF NOT EXISTS idx_captured_leads_status ON captured_leads(status);
CREATE INDEX IF NOT EXISTS idx_captured_leads_created_at ON captured_leads(created_at DESC);

-- 7. Login Events Table (Persistent authentication monitoring)
CREATE TABLE IF NOT EXISTS login_events (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    organization_id VARCHAR(64) NULL REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    event_type VARCHAR(64) NOT NULL, -- 'login_success', 'login_failed', 'invalid_credentials', 'invalid_session', 'session_expired', 'unauthorized_access', 'account_suspended', 'logout', 'password_reset_request', 'password_reset_success', 'auth_error'
    status VARCHAR(32) NOT NULL, -- 'success', 'failure'
    safe_error_code VARCHAR(64) NULL,
    safe_error_description TEXT NULL,
    ip_address VARCHAR(64) NULL,
    user_agent TEXT NULL,
    request_id VARCHAR(64) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id);
CREATE INDEX IF NOT EXISTS idx_login_events_org ON login_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_login_events_email ON login_events(email);
CREATE INDEX IF NOT EXISTS idx_login_events_type ON login_events(event_type);
CREATE INDEX IF NOT EXISTS idx_login_events_created_at ON login_events(created_at DESC);

-- 8. Centralized System Errors Table (Platform error logging & fingerprinting)
CREATE TABLE IF NOT EXISTS system_errors (
    id VARCHAR(64) PRIMARY KEY,
    fingerprint VARCHAR(64) NOT NULL,
    severity VARCHAR(32) DEFAULT 'error' NOT NULL, -- 'info', 'warn', 'error', 'critical'
    category VARCHAR(64) NOT NULL, -- 'auth', 'instagram_oauth', 'instagram_webhook', 'token_exchange', 'comment_processing', 'message_processing', 'lead_extraction', 'database', 'api', 'background_job'
    customer_id VARCHAR(64) NULL REFERENCES users(id) ON DELETE SET NULL,
    organization_id VARCHAR(64) NULL REFERENCES organizations(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NULL,
    safe_message TEXT NOT NULL,
    stack_trace TEXT NULL, -- Restricted to Super Admins only
    request_id VARCHAR(64) NULL,
    resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE NULL,
    resolved_by VARCHAR(64) NULL,
    occurrence_count INTEGER DEFAULT 1 NOT NULL,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_errors_fingerprint ON system_errors(fingerprint);
CREATE INDEX IF NOT EXISTS idx_system_errors_category ON system_errors(category);
CREATE INDEX IF NOT EXISTS idx_system_errors_severity ON system_errors(severity);
CREATE INDEX IF NOT EXISTS idx_system_errors_org ON system_errors(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_errors_customer ON system_errors(customer_id);
CREATE INDEX IF NOT EXISTS idx_system_errors_resolved ON system_errors(resolved);
CREATE INDEX IF NOT EXISTS idx_system_errors_last_seen ON system_errors(last_seen_at DESC);

-- 9. Durable Webhook Events Table (Webhook reliability & deduplication)
CREATE TABLE IF NOT EXISTS webhook_events (
    id VARCHAR(64) PRIMARY KEY,
    dedup_key VARCHAR(128) UNIQUE NOT NULL,
    object_type VARCHAR(64) NOT NULL,
    entry_id VARCHAR(128) NULL,
    event_type VARCHAR(64) NOT NULL,
    raw_payload JSONB NOT NULL,
    status VARCHAR(32) DEFAULT 'received' NOT NULL, -- 'received', 'processed', 'duplicate', 'failed'
    error_message TEXT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_dedup ON webhook_events(dedup_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- 10. Subscriptions Table (Future billing compatibility only; no feature blocking)
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id VARCHAR(64) DEFAULT 'scale' NOT NULL,
    status VARCHAR(32) DEFAULT 'active' NOT NULL, -- 'active', 'trialing', 'past_due', 'canceled'
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days') NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_org_subscription UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

