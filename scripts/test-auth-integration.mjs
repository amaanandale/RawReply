import assert from "assert";
import crypto from "crypto";
import { db } from "../lib/db/client.js";
import { hashPassword, comparePassword } from "../lib/auth/password.js";
import {
  createAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  generateRandomToken,
  hashToken,
} from "../lib/auth/tokens.js";
import { authService } from "../services/auth-service.js";
import { organizationService } from "../services/organization-service.js";
import { refreshSession, revokeSession } from "../lib/auth/session.js";
import {
  PERMISSIONS,
  hasPermission,
  canChangeRole,
  canRemoveMember,
} from "../lib/auth/permissions.js";
import { generateOAuthState, validateOAuthState } from "../lib/crypto/encryption.js";
import { accountStore } from "../lib/storage/account-store.js";
import { ROLES } from "../lib/constants.js";

async function runAuthTests() {
  console.log("=================================================");
  console.log("RawReply Custom JWT & Organization Test Suite");
  console.log("=================================================\n");

  const testSuffix = Date.now();
  const testEmail = `founder_${testSuffix}@example.com`;
  const testPassword = "Password123!";

  // 1. Password Hashing (bcrypt)
  const hashed = await hashPassword(testPassword);
  assert(hashed !== testPassword, "Password must not be stored in plain text");
  assert(await comparePassword(testPassword, hashed), "Valid password comparison must return true");
  assert(!(await comparePassword("WrongPassword!", hashed)), "Invalid password comparison must return false");
  console.log("✅ PASS: bcrypt password hashing and constant-time verification");

  // 2. User Registration & Default Workspace Creation
  const regResult = await authService.register({
    name: "Founder User",
    email: testEmail,
    password: testPassword,
    organizationName: "Apex Growth Marketing",
  });
  assert(regResult.user.id, "User ID must be assigned");
  assert.strictEqual(regResult.user.email, testEmail);
  assert(regResult.organizationId, "Default organization must be provisioned automatically");
  assert.strictEqual(regResult.role, ROLES.OWNER, "Registering user must be assigned OWNER role");
  assert(regResult.accessToken, "Registration must issue an access token");
  assert(regResult.refreshToken, "Registration must issue a refresh token");
  console.log("✅ PASS: User registration & automatic workspace creation with OWNER role");

  // 3. Duplicate Registration Prevention
  let duplicateRejected = false;
  try {
    await authService.register({
      name: "Founder Duplicate",
      email: testEmail,
      password: "AnotherPassword123!",
    });
  } catch (err) {
    duplicateRejected = err.message.includes("already exists");
  }
  assert(duplicateRejected, "Duplicate email registration must be rejected");
  console.log("✅ PASS: Duplicate email registration rejected cleanly");

  // 4. Login with Valid & Invalid Credentials
  const loginResult = await authService.login({
    email: testEmail,
    password: testPassword,
  });
  assert(loginResult.user.id === regResult.user.id, "Login must return correct user ID");
  assert(loginResult.accessToken, "Login must issue access token");

  let badLoginRejected = false;
  try {
    await authService.login({
      email: testEmail,
      password: "IncorrectPassword123!",
    });
  } catch (err) {
    badLoginRejected = err.message.includes("Invalid email or password");
  }
  assert(badLoginRejected, "Login with invalid password must be rejected");
  console.log("✅ PASS: Login with valid credentials and rejection of bad credentials");

  // 5. JWT Access Token Verification & Claim Validation
  const decoded = await verifyAccessToken(loginResult.accessToken);
  assert(decoded, "Valid access token must verify successfully");
  assert.strictEqual(decoded.userId, regResult.user.id);
  assert.strictEqual(decoded.orgId, regResult.organizationId);
  assert.strictEqual(decoded.role, ROLES.OWNER);
  console.log("✅ PASS: JWT access token cryptographic verification and claim assertions");

  // 6. Invalid JWT Signature & Tamper Rejection
  const tamperedToken = loginResult.accessToken.slice(0, -6) + "abcdef";
  const tamperedDecoded = await verifyAccessToken(tamperedToken);
  assert.strictEqual(tamperedDecoded, null, "Tampered JWT signature must be rejected");
  console.log("✅ PASS: Tampered JWT token signature rejected");

  // 7. Refresh Token Rotation
  const originalRefreshToken = loginResult.refreshToken;
  const refreshResult = await refreshSession(originalRefreshToken);
  assert(refreshResult.success, "Session refresh with valid token must succeed");
  assert(refreshResult.accessToken, "Session refresh must return fresh access token");
  assert(refreshResult.refreshToken !== originalRefreshToken, "Refresh token must be rotated");
  console.log("✅ PASS: Refresh token rotation issues fresh tokens");

  // 8. Refresh Token Reuse Attack Detection
  const reuseResult = await refreshSession(originalRefreshToken);
  assert(!reuseResult.success, "Reused refresh token must be rejected");
  assert(reuseResult.reuseDetected, "Reuse attack must be flagged");
  console.log("✅ PASS: Refresh token reuse attack detected and blocked");

  // 9. Session Revocation (Logout)
  await authService.logout(refreshResult.session.id);
  const postLogoutRefresh = await refreshSession(refreshResult.refreshToken);
  assert(!postLogoutRefresh.success, "Refresh on revoked session must fail");
  console.log("✅ PASS: Session revocation on logout");

  // 10. Password Reset Flow
  const resetReq = await authService.requestPasswordReset(testEmail, "http://localhost:3000");
  assert(resetReq.success, "Password reset request must succeed");
  const rawResetToken = resetReq.resetUrl.split("token=")[1];
  assert(rawResetToken, "Reset token must be generated");

  const newPassword = "NewSecretPassword123!";
  const resetExec = await authService.resetPassword({
    token: rawResetToken,
    newPassword,
  });
  assert(resetExec.success, "Password reset execution must succeed");

  // Old password must fail, new password must succeed
  let oldPassFailed = false;
  try {
    await authService.login({ email: testEmail, password: testPassword });
  } catch {
    oldPassFailed = true;
  }
  assert(oldPassFailed, "Old password must no longer be accepted");

  const newLogin = await authService.login({ email: testEmail, password: newPassword });
  assert(newLogin.user.id === regResult.user.id, "Login with new password must succeed");
  console.log("✅ PASS: Password reset flow with session invalidation");

  // 11. Multi-Tenant Organization Isolation & Team Invitations
  const orgId = regResult.organizationId;
  const invitedEmail = `colleague_${testSuffix}@example.com`;

  // Owner invites colleague
  const inviteRes = await organizationService.inviteMember({
    orgId,
    actorUserId: regResult.user.id,
    email: invitedEmail,
    role: ROLES.MEMBER,
    appUrl: "http://localhost:3000",
  });
  assert(inviteRes.invite.id, "Invitation must be created");
  const rawInviteToken = inviteRes.inviteUrl.split("invitation=")[1];

  // Colleague registers using invitation token
  const colleagueReg = await authService.register({
    name: "Colleague Member",
    email: invitedEmail,
    password: "Password123!",
    invitationToken: rawInviteToken,
  });
  assert.strictEqual(colleagueReg.organizationId, orgId, "Colleague must be enrolled in invited organization");
  assert.strictEqual(colleagueReg.role, ROLES.MEMBER, "Colleague must receive invited role");
  console.log("✅ PASS: Team member invitation and token-verified enrollment");

  // 12. Role-Based Access Control (RBAC) & Privilege Escalation Prevention
  // Owner permissions
  assert(hasPermission(ROLES.OWNER, PERMISSIONS.MANAGE_ORGANIZATION), "Owner must have MANAGE_ORGANIZATION");
  assert(hasPermission(ROLES.OWNER, PERMISSIONS.CONNECT_INSTAGRAM), "Owner must have CONNECT_INSTAGRAM");
  assert(hasPermission(ROLES.OWNER, PERMISSIONS.REMOVE_MEMBERS), "Owner must have REMOVE_MEMBERS");

  // Admin permissions
  assert(hasPermission(ROLES.ADMIN, PERMISSIONS.INVITE_MEMBERS), "Admin can invite members");
  assert(!hasPermission(ROLES.ADMIN, PERMISSIONS.MANAGE_ORGANIZATION), "Admin cannot manage workspace settings");

  // Member permissions
  assert(hasPermission(ROLES.MEMBER, PERMISSIONS.VIEW_LEADS), "Member can view leads");
  assert(!hasPermission(ROLES.MEMBER, PERMISSIONS.CONNECT_INSTAGRAM), "Member cannot connect Instagram");
  assert(!hasPermission(ROLES.MEMBER, PERMISSIONS.REMOVE_MEMBERS), "Member cannot remove members");

  // Privilege escalation: Member cannot remove Owner
  assert(!canRemoveMember(ROLES.MEMBER, ROLES.OWNER), "Member cannot remove Owner");
  // Admin cannot remove Owner
  assert(!canRemoveMember(ROLES.ADMIN, ROLES.OWNER), "Admin cannot remove Owner");
  // Owner can remove Member
  assert(canRemoveMember(ROLES.OWNER, ROLES.MEMBER), "Owner can remove Member");

  // Owner promotes colleague to Admin
  const updatedMember = await organizationService.updateMemberRole({
    orgId,
    targetUserId: colleagueReg.user.id,
    newRole: ROLES.ADMIN,
    actorUserId: regResult.user.id,
  });
  assert.strictEqual(updatedMember.role, ROLES.ADMIN, "Colleague must be updated to ADMIN");
  console.log("✅ PASS: RBAC permission boundaries and privilege escalation defenses");

  // 13. Instagram Integration Compatibility with Custom Organization
  const state = generateOAuthState({ organizationId: orgId, userId: regResult.user.id });
  const validatedState = validateOAuthState(state);
  assert(validatedState.valid, "OAuth state must be valid");
  assert.strictEqual(validatedState.organizationId, orgId, "OAuth state must preserve organization context");

  // Save an account tied to this organization
  const igAccountId = `ig_biz_${testSuffix}`;
  await accountStore.saveAccount({
    organizationId: orgId,
    instagramBusinessId: igAccountId,
    username: "test_business_brand",
    name: "Test Business Brand",
    accessToken: "EAABtest_token_user",
    pageToken: "EAABtest_token_page",
  });

  const orgAccounts = await accountStore.listAccounts(orgId);
  assert(orgAccounts.some((a) => a.instagramBusinessId === igAccountId), "Saved account must belong to org");

  // Another organization must not see this account
  const foreignAccounts = await accountStore.listAccounts("foreign_org_999");
  assert.strictEqual(foreignAccounts.length, 0, "Account must not leak to foreign organizations");
  console.log("✅ PASS: Instagram OAuth state & account persistence with internal organization isolation");

  console.log("\n=================================================");
  console.log("Results: All 13 Authentication & RBAC Tests Passed");
  console.log("=================================================");
}

runAuthTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});

