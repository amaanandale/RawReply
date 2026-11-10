-- RawReply Multi-Platform: Instagram & Facebook Pages Schema Extension
-- Version: 006

-- 1. Automations Table Platform Support
ALTER TABLE automations ADD COLUMN IF NOT EXISTS platform VARCHAR(32) DEFAULT 'instagram' NOT NULL;
ALTER TABLE automations ADD COLUMN IF NOT EXISTS account_id VARCHAR(64) NULL;
CREATE INDEX IF NOT EXISTS idx_automations_platform ON automations(platform);

-- 2. Automation Executions Platform Support
ALTER TABLE automation_executions ADD COLUMN IF NOT EXISTS platform VARCHAR(32) DEFAULT 'instagram' NOT NULL;
ALTER TABLE automation_executions ADD COLUMN IF NOT EXISTS account_id VARCHAR(64) NULL;
CREATE INDEX IF NOT EXISTS idx_executions_platform ON automation_executions(platform);

-- 3. Instagram Media Cache Table Platform Support
ALTER TABLE instagram_media ADD COLUMN IF NOT EXISTS platform VARCHAR(32) DEFAULT 'instagram' NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ig_media_platform ON instagram_media(platform);

-- 4. Captured Leads Table Platform Support
ALTER TABLE captured_leads ADD COLUMN IF NOT EXISTS platform VARCHAR(32) DEFAULT 'instagram' NOT NULL;
CREATE INDEX IF NOT EXISTS idx_captured_leads_platform ON captured_leads(platform);

-- 5. Instagram Accounts Platform Support
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS platform VARCHAR(32) DEFAULT 'instagram' NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_platform ON instagram_accounts(platform);

