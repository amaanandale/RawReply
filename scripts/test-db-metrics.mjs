import pg from 'pg';
import fs from 'fs';
import { db } from '../lib/db/client.js';

const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/DATABASE_URL="?([^"\r\n]+)"?/);
process.env.DATABASE_URL = match[1];

try {
  console.log("Testing db.getPlatformMetrics()...");
  const metrics = await db.getPlatformMetrics();
  console.log("✅ db.getPlatformMetrics() SUCCESS!");
  console.log("Metrics sample:", {
    totalCustomers: metrics.totalCustomers,
    totalOrganizations: metrics.totalOrganizations,
    connectedAccounts: metrics.connectedAccounts,
    totalActiveAutomations: metrics.totalActiveAutomations,
    totalCapturedLeads: metrics.totalCapturedLeads,
  });
} catch (err) {
  console.error("❌ db.getPlatformMetrics() FAILED:", err);
  process.exit(1);
}
