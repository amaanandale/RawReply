import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SUPER_ADMIN_EMAIL, MAX_INSTAGRAM_ACCOUNTS_PER_CUSTOMER, SUBSCRIPTION_STATUS } from "../lib/constants.js";
import { isDesignatedSuperAdmin } from "../lib/admin/auth.js";
import { db } from "../lib/db/client.js";
import { accountStore } from "../lib/storage/account-store.js";
import { checkIsSuperAdmin } from "../lib/auth/session.js";

async function runTests() {
  console.log("=================================================");
  console.log("  PHASE 1 ARCHITECTURE COMPREHENSIVE TEST SUITE  ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Super Admin Email Designation & Restrictions
  test("1. Designated Super Admin email is correctly defined", () => {
    assert.equal(DEFAULT_SUPER_ADMIN_EMAIL, "admin@rawreply.com");
    assert.equal(isDesignatedSuperAdmin("admin@rawreply.com"), true);
    assert.equal(isDesignatedSuperAdmin("ADMIN@RAWREPLY.COM"), true);
    assert.equal(isDesignatedSuperAdmin("customer@example.com"), false);
    assert.equal(isDesignatedSuperAdmin("hacker@malicious.com"), false);
  });

  // 2. Strict Super Admin Verification Guard
  test("2. checkIsSuperAdmin rejects non-designated emails claiming super admin", () => {
    const maliciousUser = { email: "attacker@gmail.com", is_super_admin: true };
    assert.equal(checkIsSuperAdmin(maliciousUser), false);

    const validSuperAdmin = { email: "admin@rawreply.com", is_super_admin: true };
    assert.equal(checkIsSuperAdmin(validSuperAdmin), true);

    const normalCustomer = { email: "customer@company.com", is_super_admin: false };
    assert.equal(checkIsSuperAdmin(normalCustomer), false);
  });

  // 3. Navigation Clean-up: Team Members removed
  test("3. Customer dashboard navigation does not include Team Members", () => {
    const navContent = fs.readFileSync(path.join(process.cwd(), "config", "navigation.js"), "utf8");
    const hasTeam = /title:\s*["']Team Members["']/i.test(navContent);
    assert.equal(hasTeam, false, "Team Members must be removed from customer navigation");
  });

  // 4. Instagram Account Limit (Strict 4 Accounts)
  test("4. Instagram account limit constant is strictly set to 4", () => {
    assert.equal(MAX_INSTAGRAM_ACCOUNTS_PER_CUSTOMER, 4);
  });

  // 5. Account Store Limit Validation
  await asyncTest("5. Account store enforces 4-account limit for customer workspaces", async () => {
    const testOrgId = `test_limit_org_${Date.now()}`;
    const statusBefore = await accountStore.getAccountLimitStatus(testOrgId);
    assert.equal(statusBefore.limit, 4);
    assert.equal(statusBefore.used, 0);
    assert.equal(statusBefore.remaining, 4);
    assert.equal(statusBefore.isLimitReached, false);

    // Save 4 accounts
    for (let i = 1; i <= 4; i++) {
      await accountStore.saveAccount({
        organizationId: testOrgId,
        instagramBusinessId: `ig_biz_${testOrgId}_${i}`,
        username: `account_test_${i}`,
        name: `Account Test ${i}`,
        accessToken: "test_access_token",
      });
    }

    const statusFull = await accountStore.getAccountLimitStatus(testOrgId);
    assert.equal(statusFull.used, 4);
    assert.equal(statusFull.remaining, 0);
    assert.equal(statusFull.isLimitReached, true);

    // 5th account must be rejected with error
    let rejected = false;
    try {
      await accountStore.saveAccount({
        organizationId: testOrgId,
        instagramBusinessId: `ig_biz_${testOrgId}_5`,
        username: `account_test_5`,
        name: `Account Test 5`,
        accessToken: "test_access_token_5",
      });
    } catch (err) {
      rejected = true;
      assert.match(err.message, /Maximum limit of 4.*Instagram accounts reached/i);
    }
    assert.equal(rejected, true, "5th account should throw limit error");

    // Clean up test accounts
    for (let i = 1; i <= 4; i++) {
      await accountStore.disconnectAccount(testOrgId, `ig_biz_${testOrgId}_${i}`);
    }
  });

  // 6. Platform Accounts bypass customer limit
  await asyncTest("6. Platform-owned accounts (org_platform_super_admin) bypass customer limits", async () => {
    const platformOrgId = "org_platform_super_admin";
    const status = await accountStore.getAccountLimitStatus(platformOrgId);
    assert.equal(status.isLimitReached, false);
    assert.equal(status.limit, Infinity);
  });

  // 7. Subscriptions — Free Access for Everyone
  test("7. Free launch plan constants are properly configured", () => {
    assert.equal(SUBSCRIPTION_STATUS.FREE, "free");
    assert.equal(SUBSCRIPTION_STATUS.ACTIVE, "active");
  });

  // 8. Live Database Platform Metrics Query
  await asyncTest("8. db.getPlatformMetrics returns live accurate direct metrics", async () => {
    const metrics = await db.getPlatformMetrics();
    assert(typeof metrics.totalCustomers === "number", "totalCustomers must be a number");
    assert(typeof metrics.customersViaEmailOtp === "number", "customersViaEmailOtp must be a number");
    assert(typeof metrics.customersViaGoogle === "number", "customersViaGoogle must be a number");
    assert(typeof metrics.customersWithVerifiedEmail === "number", "customersWithVerifiedEmail must be a number");
    assert(typeof metrics.customersWithConnectedInstagram === "number", "customersWithConnectedInstagram must be a number");
    assert(typeof metrics.connectedAccounts === "number", "connectedAccounts must be a number");
    assert(typeof metrics.totalActiveAutomations === "number", "totalActiveAutomations must be a number");
    assert(typeof metrics.totalCreatedAutomations === "number", "totalCreatedAutomations must be a number");
    assert(typeof metrics.freeSubscriptions === "number", "freeSubscriptions must be a number");
    assert(Array.isArray(metrics.recentUsers), "recentUsers must be an array");
    assert(Array.isArray(metrics.recentConnections), "recentConnections must be an array");
  });

  // 9. Customer details aggregation with Instagram, Subscriptions, and Automations
  await asyncTest("9. db.findCustomerDetails aggregates profile, Free plan, and automations", async () => {
    const customers = await db.listAllCustomers({ limit: 1 });
    if (customers.length > 0) {
      const customerId = customers[0].id;
      const details = await db.findCustomerDetails(customerId);
      assert(details !== null, "Details must not be null");
      assert.equal(details.user.id, customerId);
      assert.equal(details.subscription.planId, "free");
      assert.equal(details.subscription.status, "active");
      assert.equal(details.subscription.price, "$0 / month");
      assert(Array.isArray(details.automations), "Automations must be an array");
      assert(Array.isArray(details.organizations), "Organizations must be an array");
    }
  });

  // 10. Automations CRUD functionality
  await asyncTest("10. Automations repository supports create, list, and delete", async () => {
    const testOrgId = `test_auto_org_${Date.now()}`;
    const created = await db.createAutomation({
      organizationId: testOrgId,
      name: "Phase 1 Test Automation",
      triggerKeyword: "PRICE",
      replyText: "Thanks for commenting! Checking your DM now.",
      status: "active",
    });

    assert(created.id, "Created automation must have an id");
    assert.equal(created.name, "Phase 1 Test Automation");
    assert.equal(created.status, "active");

    const list = await db.listAutomations(testOrgId);
    assert.equal(list.length, 1);
    assert.equal(list[0].id, created.id);

    const deleted = await db.deleteAutomation(created.id);
    assert.equal(deleted, true);

    const listAfter = await db.listAutomations(testOrgId);
    assert.equal(listAfter.length, 0);
  });

  // 11. Customer Filtering in db.listAllCustomers
  await asyncTest("11. db.listAllCustomers supports filtering by auth method and verification", async () => {
    const googleCustomers = await db.listAllCustomers({ filter: "google" });
    assert(Array.isArray(googleCustomers));
    for (const c of googleCustomers) {
      assert.equal(c.auth_provider, "google");
    }

    const emailOtpCustomers = await db.listAllCustomers({ filter: "email_otp" });
    assert(Array.isArray(emailOtpCustomers));
    for (const c of emailOtpCustomers) {
      assert(c.auth_provider === "email_otp" || c.auth_provider === "email" || !c.auth_provider);
    }
  });

  // 12. Middleware matcher and session security
  test("12. Middleware configuration protects root, admin, dashboard, and auth routes", () => {
    const proxyContent = fs.readFileSync(path.join(process.cwd(), "proxy.js"), "utf8");
    assert(proxyContent.includes('"/"'), "Middleware matcher must include root path '/'");
    assert(proxyContent.includes('"/admin/:path*"'), "Middleware matcher must include '/admin/:path*'");
    assert(proxyContent.includes('"/dashboard/:path*"'), "Middleware matcher must include '/dashboard/:path*'");
    assert(proxyContent.includes('"/login/:path*"'), "Middleware matcher must include '/login/:path*'");
    assert(proxyContent.includes("isSuperAdmin ? \"/admin\" : \"/dashboard\"") || proxyContent.includes("adm ? \"/admin\" : \"/dashboard\""), "Root redirection must route according to super admin role");
  });

  // Summary
  console.log("\n-------------------------------------------------");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("-------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
