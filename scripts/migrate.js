import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

// Load environment variables from .env.local / .env if not already set
if (!process.env.DATABASE_URL) {
  for (const envFile of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...rest] = trimmed.split("=");
          const val = rest.join("=").replace(/^["']|["']$/g, "").trim();
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

async function runMigrations() {
  console.log("=================================================");
  console.log("RawReply Database Migration Runner");
  console.log("=================================================\n");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("ℹ️ DATABASE_URL is not set. Verifying fallback JSON persistence schema...");
    const dataDir = process.env.VERCEL
      ? path.join("/tmp", "data")
      : path.join(process.cwd(), "data");

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const fallbackFile = path.join(dataDir, "auth_db.json");
    if (!fs.existsSync(fallbackFile)) {
      const initial = {
        users: [],
        organizations: [],
        organization_members: [],
        invitations: [],
        sessions: [],
        auth_tokens: [],
        system_audit_logs: [],
        instagram_accounts: [],
        instagram_media: [],
        automations: [],
        automation_executions: [],
        conversations: [],
        messages: [],
        comments: [],
        captured_leads: [],
        login_events: [],
        system_errors: [],
        webhook_events: [],
        subscriptions: [],
      };
      fs.writeFileSync(fallbackFile, JSON.stringify(initial, null, 2), "utf8");
    }
    console.log("✅ Fallback database schema verified successfully.\n");
    return;
  }

  console.log(`🔌 Connecting to PostgreSQL at ${databaseUrl.replace(/:[^:@]+@/, ":****@")}...`);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl:
      !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1")
        ? { rejectUnauthorized: false }
        : false,
  });

  const client = await pool.connect();

  try {
    // 1. Create migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(128) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // 2. Fetch applied migrations
    const { rows: appliedRows } = await client.query("SELECT version FROM schema_migrations");
    const appliedVersions = new Set(appliedRows.map((r) => r.version));

    // 3. Scan migrations directory
    const migrationsDir = path.join(process.cwd(), "lib", "db", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    let appliedCount = 0;

    for (const file of migrationFiles) {
      if (appliedVersions.has(file)) {
        console.log(`⏭️  Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`🚀 Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version, applied_at) VALUES ($1, CURRENT_TIMESTAMP)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`✅ Applied migration: ${file}`);
        appliedCount++;
      } catch (migrationErr) {
        await client.query("ROLLBACK");
        console.error(`❌ Migration failed in ${file}: ${migrationErr.message}`);
        throw migrationErr;
      }
    }

    console.log(`\n=================================================`);
    console.log(`Migration Complete: ${appliedCount} new migrations applied.`);
    console.log(`=================================================`);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error("Fatal Migration Error:", err);
  process.exit(1);
});

