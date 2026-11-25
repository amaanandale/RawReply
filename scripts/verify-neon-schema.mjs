import pg from 'pg';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
if (!match) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

try {
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Neon Tables Count:', res.rows.length);
  console.log('Neon Tables:', res.rows.map(r => r.table_name));

  const subRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%subscription%'");
  console.log('Subscription Tables (Must be empty):', subRes.rows.map(r => r.table_name));

  const migRes = await pool.query("SELECT version, name, applied_at FROM schema_migrations ORDER BY version");
  console.log('Applied Migrations:', migRes.rows);
} catch (err) {
  console.error('Verification error:', err);
} finally {
  await pool.end();
}
