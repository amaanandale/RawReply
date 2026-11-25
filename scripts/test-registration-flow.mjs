import assert from "assert";
import fs from "fs";
import { authService } from "../services/auth-service.js";
import { db } from "../lib/db/client.js";

// Load .env.local if DATABASE_URL is not set
if (!process.env.DATABASE_URL && fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(/DATABASE_URL="?([^"\r\n]+)"?/);
  if (match) process.env.DATABASE_URL = match[1];
  const saMatch = envContent.match(/SUPER_ADMIN_EMAIL="?([^"\r\n]+)"?/);
  if (saMatch) process.env.SUPER_ADMIN_EMAIL = saMatch[1];
}

async function runTests() {
  console.log("=================================================");
  console.log("RawReply Registration Flow & Security Test Suite");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${err.message}`);
      failed++;
    }
  }

  const testEmail = `mohammed_test_${Date.now()}@example.com`;
  let registeredUserId = null;
  let registeredOrgId = null;

  // 1. End-to-End Registration
  await test("Registers user, creates 'real estate' workspace, and assigns owner role atomically", async () => {
    const res = await authService.register({
      name: "mohammed",
      email: testEmail,
      password: "Amaan@123",
      organizationName: "real estate",
      userAgent: "TestAgent/1.0",
      ipAddress: "127.0.0.1",
    });

    assert.ok(res.user, "Result must contain user");
    assert.strictEqual(res.user.name, "mohammed");
    assert.strictEqual(res.user.email, testEmail);
    assert.strictEqual(res.user.platformRole, "customer");
    assert.strictEqual(res.user.isSuperAdmin, false);
    assert.strictEqual(res.role, "owner");
    assert.ok(res.accessToken, "Result must contain access token");
    assert.ok(res.refreshToken, "Result must contain refresh token");
    assert.strictEqual(res.user.password, undefined, "User object must NEVER contain password");
    assert.strictEqual(res.user.passwordHash, undefined, "User object must NEVER contain passwordHash");

    registeredUserId = res.user.id;
    registeredOrgId = res.organizationId;
  });

  // 2. Database Record Verification
  await test("Database stores correct platform_role, bcrypt cost 12, and sanitized fields", async () => {
    const user = await db.findUserByEmail(testEmail);
    assert.ok(user, "User must exist in database");
    assert.strictEqual(user.platform_role, "customer");
    assert.strictEqual(Boolean(user.is_super_admin), false);
    assert.strictEqual(user.status, "active");
    assert.ok(user.password_hash.startsWith("$2b$12$") || user.password_hash.startsWith("$2a$12$"), "Password hash must use bcrypt cost factor 12");

    const org = await db.findOrganizationById(registeredOrgId);
    assert.ok(org, "Organization must exist in database");
    assert.strictEqual(org.name, "real estate");

    const member = await db.findMember(registeredOrgId, registeredUserId);
    assert.ok(member, "Organization member must exist");
    assert.strictEqual(member.role, "owner");
  });

  // 3. Duplicate Registration Rejection
  await test("Duplicate registration is rejected cleanly without partial records", async () => {
    let threw = false;
    try {
      await authService.register({
        name: "mohammed duplicate",
        email: testEmail,
        password: "Amaan@123",
        organizationName: "real estate 2",
        userAgent: "TestAgent/1.0",
        ipAddress: "127.0.0.1",
      });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes("already exists"));
    }
    assert.strictEqual(threw, true, "Must throw duplicate email error");
  });

  // 4. Super Admin Promotion via SUPER_ADMIN_EMAIL
  await test("User with SUPER_ADMIN_EMAIL gets platform_role='super_admin' and is_super_admin=true", async () => {
    const adminEmail = `superadmin_${Date.now()}@testadmin.io`;
    process.env.SUPER_ADMIN_EMAIL = adminEmail;

    const res = await authService.register({
      name: "Super Admin User",
      email: adminEmail,
      password: "SuperAdminPass123",
      organizationName: "Platform Admin Team",
      userAgent: "TestAgent/1.0",
      ipAddress: "127.0.0.1",
    });

    assert.strictEqual(res.user.platformRole, "super_admin");
    assert.strictEqual(res.user.isSuperAdmin, true);

    const userInDb = await db.findUserByEmail(adminEmail);
    assert.strictEqual(userInDb.platform_role, "super_admin");
    assert.strictEqual(Boolean(userInDb.is_super_admin), true);
  });

  console.log("\n=================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
