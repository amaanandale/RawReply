-- RawReply Super Admin & System Audit Schema (PostgreSQL)
-- Version: 002

-- 1. Extend Users table with platform_role and is_super_admin
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role VARCHAR(32) DEFAULT 'customer' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_is_super_admin ON users(is_super_admin);

-- 2. Extend Organizations table with status
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active' NOT NULL;

-- 3. System Audit Logs Table
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id VARCHAR(64) NULL,
    details TEXT NULL,
    ip_address VARCHAR(64) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON system_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON system_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON system_audit_logs(created_at DESC);

