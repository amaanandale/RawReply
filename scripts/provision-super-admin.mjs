#!/usr/bin/env node

/**
 * Super Admin Provisioning Script for RawReply
 *
 * Usage:
 *   node scripts/provision-super-admin.mjs <email> [name] [password]
 *
 * Examples:
 *   node scripts/provision-super-admin.mjs admin@rawreply.com "Platform Owner" "SecurePassword123!"
 *   node scripts/provision-super-admin.mjs existinguser@company.com
 */

import crypto from "crypto";
import { db } from "../lib/db/client.js";
import { hashPassword } from "../lib/auth/password.js";

function generateId(prefix = "usr") {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

async function main() {
  const args = process.argv.slice(2);
  const email = (args[0] || process.env.SUPER_ADMIN_EMAIL || "").toLowerCase().trim();
  const name = (args[1] || process.env.SUPER_ADMIN_NAME || "Super Admin").trim();
  const password = args[2] || process.env.SUPER_ADMIN_PASSWORD || "";

  if (!email || !email.includes("@")) {
    console.error("Error: A valid email address is required.");
    console.error("Usage: node scripts/provision-super-admin.mjs <email> [name] [password]");
    process.exit(1);
  }

  console.log(`[Provisioning] Checking status for: ${email}`);

  let user = await db.findUserByEmail(email);

  if (user) {
    console.log(`[Provisioning] Existing user found (ID: ${user.id}). Promoting to Super Admin...`);
    await db.makeSuperAdmin(user.id, true);
    await db.recordAuditLog({
      action: "super_admin_promoted",
      performedBy: user.id,
      targetType: "user",
      targetId: user.id,
      details: { email, promotedVia: "cli_script" },
    });
    console.log(`[Success] User ${email} is now a Super Admin (platform_role: 'super_admin').`);
  } else {
    if (!password || password.length < 8) {
      console.error("Error: New super admin creation requires a secure password (min 8 characters).");
      console.error("Usage: node scripts/provision-super-admin.mjs <email> [name] <password>");
      process.exit(1);
    }

    console.log(`[Provisioning] Creating new Super Admin account for ${email}...`);
    const passwordHash = await hashPassword(password);
    const userId = generateId("usr");

    user = await db.createUser({
      id: userId,
      name,
      email,
      passwordHash,
      status: "active",
      isSuperAdmin: true,
      platformRole: "super_admin",
    });

    await db.recordAuditLog({
      action: "super_admin_created",
      performedBy: userId,
      targetType: "user",
      targetId: userId,
      details: { email, name, createdVia: "cli_script" },
    });

    console.log(`[Success] Super Admin user created successfully!`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email:   ${user.email}`);
    console.log(`   Role:    SUPER_ADMIN`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("[Fatal Error]", err);
  process.exit(1);
});

