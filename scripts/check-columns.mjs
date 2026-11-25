import pg from 'pg';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
const pool = new pg.Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

const tables = ['login_events', 'captured_leads', 'automations', 'instagram_accounts', 'audit_logs', 'system_errors'];
for (const t of tables) {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [t]);
  console.log(`\nTable ${t}:`, res.rows.map(r => r.column_name).join(', '));
}
await pool.end();
