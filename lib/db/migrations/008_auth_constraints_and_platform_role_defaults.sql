-- ============================================================================
-- RAWREPLY DATABASE MIGRATION 008
-- Description: Enforce NOT NULL column defaults for platform_role, status,
--              roles, and backfill null values across auth and workspaces.
-- ============================================================================

-- 1. Users Table Defaults & Backfill
ALTER TABLE users ALTER COLUMN platform_role SET DEFAULT 'customer';
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE users ALTER COLUMN is_super_admin SET DEFAULT false;
ALTER TABLE users ALTER COLUMN auth_provider SET DEFAULT 'local';

UPDATE users SET platform_role = 'customer' WHERE platform_role IS NULL;
UPDATE users SET status = 'active' WHERE status IS NULL;
UPDATE users SET is_super_admin = false WHERE is_super_admin IS NULL;
UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL;

-- 2. Organizations Table Defaults & Backfill
ALTER TABLE organizations ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE organizations ALTER COLUMN settings SET DEFAULT '{}'::jsonb;

UPDATE organizations SET status = 'active' WHERE status IS NULL;
UPDATE organizations SET settings = '{}'::jsonb WHERE settings IS NULL;

-- 3. Organization Members Table Defaults & Backfill
ALTER TABLE organization_members ALTER COLUMN role SET DEFAULT 'member';

UPDATE organization_members SET role = 'member' WHERE role IS NULL;

-- 4. Sessions & User Sessions Defaults
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        ALTER TABLE user_sessions ALTER COLUMN is_revoked SET DEFAULT false;
        UPDATE user_sessions SET is_revoked = false WHERE is_revoked IS NULL;
    END IF;
END $$;
