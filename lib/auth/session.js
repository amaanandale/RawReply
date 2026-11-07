import crypto from "crypto";
import { db } from "../db/client.js";
import {
  createAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "./tokens.js";
import { getTokensFromRequest } from "./cookies.js";

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

/**
 * Generate a unique session identifier.
 */
function generateId(prefix = "ses") {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

/**
 * Create a new user session and issue the first pair of tokens.
 */
export async function createSession({ userId, activeOrganizationId = null, userAgent = "", ipAddress = "" }) {
  const sessionId = generateId("ses");
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // If no active organization was explicitly selected, pick the user's primary/first organization
  let resolvedOrgId = activeOrganizationId;
  let resolvedRole = "member";

  if (!resolvedOrgId) {
    const userOrgs = await db.listUserOrganizations(userId);
    if (userOrgs.length > 0) {
      resolvedOrgId = userOrgs[0].id;
      resolvedRole = userOrgs[0].role;
    }
  } else {
    const member = await db.findMember(resolvedOrgId, userId);
    if (member) {
      resolvedRole = member.role;
    }
  }

  const user = await db.findUserById(userId);
  const isSuperAdmin = Boolean(user?.is_super_admin);

  const sessionRecord = await db.createSession({
    id: sessionId,
    userId,
    activeOrganizationId: resolvedOrgId,
    refreshTokenHash,
    expiresAt,
    userAgent,
    ipAddress,
  });

  const accessToken = await createAccessToken({
    userId,
    sessionId,
    orgId: resolvedOrgId,
    role: resolvedRole,
    isSuperAdmin,
  });

  return {
    session: sessionRecord,
    accessToken,
    refreshToken,
    organizationId: resolvedOrgId,
    role: resolvedRole,
    isSuperAdmin,
  };
}

/**
 * Refresh an active session, rotating the refresh token.
 * Detects reuse attacks: if a hashed refresh token matches a revoked session
 * or invalid token, revokes all sessions for that user.
 */
export async function refreshSession(rawRefreshToken, { userAgent = "", ipAddress = "" } = {}) {
  if (!rawRefreshToken) {
    return { success: false, error: "Missing refresh token" };
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const session = await db.findSessionByRefreshTokenHash(tokenHash);

  if (!session) {
    // Possible token reuse or forged token
    return { success: false, error: "Invalid refresh token", reuseDetected: true };
  }

  // Check if session has been revoked or expired
  const now = new Date();
  if (session.revoked_at || new Date(session.expires_at) < now) {
    // If revoked token is being presented again, treat as a reuse attack and revoke all sessions
    await db.revokeAllUserSessions(session.user_id);
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "SessionManager",
        action: "refresh_token_reuse_detected",
        userId: session.user_id,
        sessionId: session.id,
      })
    );
    return { success: false, error: "Session has been revoked", reuseDetected: true };
  }

  // Rotate refresh token
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db.updateSessionRefreshToken(session.id, newRefreshTokenHash, newExpiresAt);

  // Ensure user is still active
  const user = await db.findUserById(session.user_id);
  if (!user || user.status !== "active") {
    return { success: false, error: "Account is not active or suspended" };
  }

  // Resolve current active role
  let role = "member";
  if (session.active_organization_id) {
    const member = await db.findMember(session.active_organization_id, session.user_id);
    if (member) {
      role = member.role;
    }
  }

  const isSuperAdmin = Boolean(user.is_super_admin);

  // Issue fresh access token
  const newAccessToken = await createAccessToken({
    userId: session.user_id,
    sessionId: session.id,
    orgId: session.active_organization_id,
    role,
    isSuperAdmin,
  });

  return {
    success: true,
    session,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    userId: session.user_id,
    organizationId: session.active_organization_id,
    role,
    isSuperAdmin,
  };
}

/**
 * Revoke a specific session (single device logout).
 */
export async function revokeSession(sessionId) {
  if (!sessionId) return;
  await db.revokeSession(sessionId);
}

/**
 * Revoke all sessions for a user (logout all devices).
 */
export async function revokeAllUserSessions(userId) {
  if (!userId) return;
  await db.revokeAllUserSessions(userId);
}

/**
 * Change the active organization in a session.
 */
export async function switchActiveOrganization({ sessionId, userId, organizationId }) {
  const member = await db.findMember(organizationId, userId);
  if (!member) {
    throw new Error("You are not a member of this organization.");
  }

  await db.updateSessionActiveOrganization(sessionId, organizationId);

  const user = await db.findUserById(userId);
  const isSuperAdmin = Boolean(user?.is_super_admin);

  // Issue new access token reflecting the newly selected org & role
  const newAccessToken = await createAccessToken({
    userId,
    sessionId,
    orgId: organizationId,
    role: member.role,
    isSuperAdmin,
  });

  return {
    accessToken: newAccessToken,
    organizationId,
    role: member.role,
    isSuperAdmin,
  };
}

/**
 * Resolve the current authenticated user and active organization context from a Next.js request.
 * Can be called inside Route Handlers or Server Components.
 */
export async function getCurrentSession(req) {
  const { accessToken, refreshToken } = getTokensFromRequest(req);

  // 1. Try verifying existing access token
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      const user = await db.findUserById(payload.userId);
      if (user && user.status === "active") {
        let organization = null;
        if (payload.orgId) {
          organization = await db.findOrganizationById(payload.orgId);
        }
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: Boolean(user.email_verified_at),
            isSuperAdmin: Boolean(user.is_super_admin),
            platformRole: user.platform_role || (user.is_super_admin ? "super_admin" : null),
          },
          sessionId: payload.sessionId,
          organizationId: payload.orgId,
          organization,
          role: payload.role || "member",
          isSuperAdmin: Boolean(user.is_super_admin),
        };
      }
    }
  }

  // 2. If access token is expired or absent, try refreshing via refresh token
  if (refreshToken) {
    const refreshResult = await refreshSession(refreshToken);
    if (refreshResult.success) {
      const user = await db.findUserById(refreshResult.userId);
      if (user && user.status === "active") {
        let organization = null;
        if (refreshResult.organizationId) {
          organization = await db.findOrganizationById(refreshResult.organizationId);
        }
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: Boolean(user.email_verified_at),
            isSuperAdmin: Boolean(user.is_super_admin),
            platformRole: user.platform_role || (user.is_super_admin ? "super_admin" : null),
          },
          sessionId: refreshResult.session.id,
          organizationId: refreshResult.organizationId,
          organization,
          role: refreshResult.role || "member",
          isSuperAdmin: Boolean(user.is_super_admin),
          rotatedTokens: {
            accessToken: refreshResult.accessToken,
            refreshToken: refreshResult.refreshToken,
          },
        };
      }
    }
  }

  return null;
}
