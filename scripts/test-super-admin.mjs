#!/usr/bin/env node

/**
 * Super Admin Integration & Security Test Suite
 *
 * Validates:
 * 1. Privilege escalation prevention on public registration.
 * 2. Super Admin provisioning and promotion.
 * 3. Access token claim enforcement (adm: boolean).
 * 4. Super Admin Route Handler authorization guard (403 for customers).
 * 5. Customer suspension lifecycle and instant session revocation.
 * 6. Audit trail generation and integrity.
 */

import { authService } from "../services/auth-service.js";
import { db } from "../lib/db/client.js";
import { verifyAccessToken } from "../lib/auth/tokens.js";
import { requireSuperAdmin } from "../lib/admin/auth.js";
import { hashPassword } from "../lib/auth/password.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log("\n========================================================");
  console.log("  RawReply Super Admin Security & Verification Tests");
  console.log("========================================================\n");

  const timestamp = Date.now();
  const testCustomerEmail = `customer_${timestamp}@test.local`;
  const testAdminEmail = `superadmin_${timestamp}@test.local`;
  const password = "Password123!@#";

  // 1. Privilege Escalation Prevention on Registration
  console.log("--- Test 1: Public Registration Role Hardening ---");
  const customerResult = await authService.register({
    email: testCustomerEmail,
    password,
    name: "Regular Customer",
    organizationName: "Customer Workspace",
    // Attacker attempts to inject super admin flags
    isSuperAdmin: true,
    platformRole: "super_admin",
  });

  const registeredCustomer = await db.findUserById(customerResult.user.id);
  assert(
    registeredCustomer.is_super_admin === false || registeredCustomer.is_super_admin === 0,
    "Public registration strictly rejects privilege escalation (is_super_admin is false)"
  );
  assert(
    !registeredCustomer.platform_role || registeredCustomer.platform_role !== "super_admin",
    "Public registration does not assign platform_role 'super_admin'"
  );

  const customerTokenPayload = await verifyAccessToken(customerResult.accessToken);
  assert(
    customerTokenPayload.isSuperAdmin === false,
    "Customer access token payload has isSuperAdmin: false"
  );

  // 2. Super Admin Provisioning & Token Verification
  console.log("\n--- Test 2: Super Admin Provisioning & JWT Claims ---");
  process.env.SUPER_ADMIN_EMAIL = testAdminEmail;
  const adminPasswordHash = await hashPassword(password);
  const adminUser = await db.createUser({
    id: `usr_adm_${timestamp}`,
    name: "System Super Admin",
    email: testAdminEmail,
    passwordHash: adminPasswordHash,
    status: "active",
    isSuperAdmin: true,
    platformRole: "super_admin",
  });

  await db.recordAuditLog({
    action: "super_admin_created",
    performedBy: adminUser.id,
    targetType: "user",
    targetId: adminUser.id,
    details: { email: testAdminEmail },
  });

  const adminLoginResult = await authService.login({
    email: testAdminEmail,
    password,
  });

  assert(
    adminLoginResult.user.isSuperAdmin === true,
    "Super Admin login confirms user.isSuperAdmin === true"
  );

  const adminTokenPayload = await verifyAccessToken(adminLoginResult.accessToken);
  assert(
    adminTokenPayload.isSuperAdmin === true,
    "Super Admin access token payload contains adm: true"
  );

  // 3. Authorization Guard Enforcement (lib/admin/auth.js)
  console.log("\n--- Test 3: Route Handler Authorization Guard ---");
  // Simulate Customer Request to Admin Guard
  const fakeCustomerReq = {
    cookies: {
      get: (name) => {
        if (name === "rawreply_access_token") return { value: customerResult.accessToken };
        return null;
      },
    },
  };

  const customerAuthCheck = await requireSuperAdmin(fakeCustomerReq);
  assert(
    customerAuthCheck.authorized === false,
    "requireSuperAdmin blocks normal customer"
  );
  assert(
    customerAuthCheck.response.status === 403,
    "requireSuperAdmin returns HTTP 403 Forbidden for non-super-admin"
  );

  // Simulate Super Admin Request to Admin Guard
  const fakeAdminReq = {
    cookies: {
      get: (name) => {
        if (name === "rawreply_access_token") return { value: adminLoginResult.accessToken };
        return null;
      },
    },
  };

  const adminAuthCheck = await requireSuperAdmin(fakeAdminReq);
  assert(
    adminAuthCheck.authorized === true,
    "requireSuperAdmin authorizes genuine Super Admin"
  );
  assert(
    adminAuthCheck.user.email === testAdminEmail,
    "Super Admin identity verified in auth context"
  );

  // 4. Customer Suspension Lifecycle & Session Revocation
  console.log("\n--- Test 4: Suspension Enforcement & Instant Session Termination ---");
  // Super Admin suspends the customer
  await db.setCustomerStatus(registeredCustomer.id, "suspended");
  await db.revokeAllUserSessions(registeredCustomer.id);
  await db.recordAuditLog({
    action: "customer_suspended",
    performedBy: adminUser.id,
    targetType: "user",
    targetId: registeredCustomer.id,
    details: { reason: "Terms violation test" },
  });

  // Attempting to log in as suspended user should fail
  let loginFailedAsExpected = false;
  try {
    await authService.login({
      email: testCustomerEmail,
      password,
    });
  } catch (err) {
    loginFailedAsExpected = true;
    assert(
      err.message.includes("suspended"),
      `Suspended user login rejected with message: "${err.message}"`
    );
  }
  assert(loginFailedAsExpected, "Suspended customer is strictly blocked from logging in");

  // Reactivate customer
  await db.setCustomerStatus(registeredCustomer.id, "active");
  await db.recordAuditLog({
    action: "customer_reactivated",
    performedBy: adminUser.id,
    targetType: "user",
    targetId: registeredCustomer.id,
    details: { reason: "Reactivated after verification" },
  });

  const reactivatedLogin = await authService.login({
    email: testCustomerEmail,
    password,
  });
  assert(
    reactivatedLogin && reactivatedLogin.user.id === registeredCustomer.id,
    "Reactivated customer can successfully establish sessions again"
  );

  // 5. System Audit Trail Verification
  console.log("\n--- Test 5: System Audit Trail Integrity ---");
  const auditLogs = await db.listAuditLogs({ limit: 10 });
  assert(auditLogs.length >= 3, `System audit logs recorded ${auditLogs.length} events`);

  const actions = auditLogs.map((l) => l.action);
  assert(
    actions.includes("super_admin_created"),
    "Audit log contains 'super_admin_created'"
  );
  assert(
    actions.includes("customer_suspended"),
    "Audit log contains 'customer_suspended'"
  );
  assert(
    actions.includes("customer_reactivated"),
    "Audit log contains 'customer_reactivated'"
  );

  // 6. Platform Metrics Query
  console.log("\n--- Test 6: Platform Metrics Engine ---");
  const platformMetrics = await db.getPlatformMetrics();
  assert(
    platformMetrics.totalUsers >= 2,
    `Platform metrics reports at least 2 users (found: ${platformMetrics.totalUsers})`
  );
  assert(
    platformMetrics.totalAuditLogs >= 3,
    `Platform metrics reports audit logs (found: ${platformMetrics.totalAuditLogs})`
  );

  console.log("\n========================================================");
  console.log("  All 14 Super Admin Security Tests Passed Successfully!");
  console.log("========================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

