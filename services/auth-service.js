import crypto from "crypto";
import { db } from "../lib/db/client.js";
import { hashPassword, comparePassword } from "../lib/auth/password.js";
import { generateRandomToken, hashToken } from "../lib/auth/tokens.js";
import { createSession, revokeSession, revokeAllUserSessions } from "../lib/auth/session.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email/client.js";
import { ROLES } from "../lib/constants.js";
import { trackLoginEvent, LOGIN_EVENT_TYPES } from "../lib/monitoring/login-tracker.js";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .substring(0, 40);
}

export const authService = {
  /**
   * Register a new user.
   * Creates an organization automatically if no invitation token is provided.
   */
  async register({ email, password, name, organizationName, invitationToken, userAgent, ipAddress }) {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Assert email is unique
    const existing = await db.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error("An account with this email address already exists.");
    }

    // 2. Hash password
    const passwordHash = await hashPassword(password);
    const userId = generateId("usr");

    const user = await db.createUser({
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      status: "active",
      isSuperAdmin: false,
      platformRole: null,
    });

    let activeOrgId = null;

    // 3. Check invitation or create default organization
    if (invitationToken) {
      const tokenHash = hashToken(invitationToken);
      const invite = await db.findInvitationByTokenHash(tokenHash);
      if (invite && !invite.accepted_at && new Date(invite.expires_at) > new Date()) {
        await db.addOrganizationMember({
          id: generateId("mem"),
          organizationId: invite.organization_id,
          userId,
          role: invite.role,
        });
        await db.markInvitationAccepted(invite.id);
        activeOrgId = invite.organization_id;
      }
    }

    if (!activeOrgId) {
      // Create user's initial organization
      const orgName = (organizationName || `${name.trim()}'s Team`).trim();
      const orgId = generateId("org");
      let baseSlug = slugify(orgName) || "workspace";
      let slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;

      const org = await db.createOrganization({
        id: orgId,
        name: orgName,
        slug,
      });

      // Add user as Owner
      await db.addOrganizationMember({
        id: generateId("mem"),
        organizationId: org.id,
        userId,
        role: ROLES.OWNER,
      });

      activeOrgId = org.id;
    }

    // 4. Create session & tokens
    const sessionResult = await createSession({
      userId,
      activeOrganizationId: activeOrgId,
      userAgent,
      ipAddress,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: false,
      },
      ...sessionResult,
    };
  },

  /**
   * Authenticate a user with email and password.
   */
  async login({ email, password, userAgent, ipAddress }) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.findUserByEmail(normalizedEmail);

    if (!user) {
      await trackLoginEvent({
        email: normalizedEmail,
        eventType: LOGIN_EVENT_TYPES.INVALID_CREDENTIALS,
        status: "failure",
        safeErrorCode: "user_not_found",
        safeErrorDescription: "Invalid email or password",
        userAgent,
        ipAddress,
      });
      throw new Error("Invalid email or password.");
    }

    if (user.status === "suspended") {
      await trackLoginEvent({
        userId: user.id,
        email: normalizedEmail,
        eventType: LOGIN_EVENT_TYPES.ACCOUNT_SUSPENDED,
        status: "failure",
        safeErrorCode: "account_suspended",
        safeErrorDescription: "Your account has been suspended",
        userAgent,
        ipAddress,
      });
      throw new Error("Your account has been suspended. Please contact support.");
    }

    if (user.status !== "active") {
      await trackLoginEvent({
        userId: user.id,
        email: normalizedEmail,
        eventType: LOGIN_EVENT_TYPES.AUTH_ERROR,
        status: "failure",
        safeErrorCode: "account_inactive",
        safeErrorDescription: "This account is not active",
        userAgent,
        ipAddress,
      });
      throw new Error("This account is not active. Please contact support.");
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      await trackLoginEvent({
        userId: user.id,
        email: normalizedEmail,
        eventType: LOGIN_EVENT_TYPES.INVALID_CREDENTIALS,
        status: "failure",
        safeErrorCode: "password_mismatch",
        safeErrorDescription: "Invalid email or password",
        userAgent,
        ipAddress,
      });
      throw new Error("Invalid email or password.");
    }

    const sessionResult = await createSession({
      userId: user.id,
      userAgent,
      ipAddress,
    });

    await trackLoginEvent({
      userId: user.id,
      organizationId: sessionResult.session?.active_organization_id,
      email: normalizedEmail,
      eventType: LOGIN_EVENT_TYPES.LOGIN_SUCCESS,
      status: "success",
      userAgent,
      ipAddress,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: Boolean(user.email_verified_at),
        isSuperAdmin: Boolean(user.is_super_admin),
        platformRole: user.platform_role || (user.is_super_admin ? "super_admin" : null),
      },
      ...sessionResult,
    };
  },

  /**
   * Log out an active session.
   */
  async logout(sessionId) {
    if (sessionId) {
      await revokeSession(sessionId);
    }
  },

  /**
   * Revoke all sessions for a user across all browsers/devices.
   */
  async logoutAll(userId) {
    if (userId) {
      await revokeAllUserSessions(userId);
    }
  },

  /**
   * Generate and dispatch a password reset token & 6-digit OTP.
   */
  async requestPasswordReset(email, appUrl = "") {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.findUserByEmail(normalizedEmail);

    if (!user) {
      // Return true without dispatching to prevent account enumeration
      return { success: true };
    }

    // 1. Generate 6-digit numeric OTP code (cryptographically secure)
    const otpCode = Math.floor(100000 + crypto.randomInt(900000)).toString();
    const otpHash = hashToken(otpCode);
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    await db.createAuthToken({
      id: generateId("otp"),
      userId: user.id,
      type: "password_reset_otp",
      tokenHash: otpHash,
      expiresAt: otpExpiresAt,
    });

    // 2. Generate long URL token for direct links / backwards compatibility
    const rawToken = generateRandomToken();
    const tokenHash = hashToken(rawToken);
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await db.createAuthToken({
      id: generateId("tok"),
      userId: user.id,
      type: "password_reset",
      tokenHash,
      expiresAt: tokenExpiresAt,
    });

    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      otpCode,
    });

    return { success: true, resetUrl, otpCode };
  },

  /**
   * Apply a new password using either a 6-digit OTP code or a verified reset token.
   */
  async resetPassword({ token, email, otp, newPassword }) {
    if (!newPassword) {
      throw new Error("New password is required.");
    }

    let user = null;
    let tokenRecord = null;

    if (otp && email) {
      const normalizedEmail = email.toLowerCase().trim();
      user = await db.findUserByEmail(normalizedEmail);
      if (!user) {
        throw new Error("Invalid verification code or email address.");
      }

      const otpHash = hashToken(otp.trim());
      tokenRecord = await db.findAuthToken(otpHash, "password_reset_otp");

      if (!tokenRecord || tokenRecord.user_id !== user.id) {
        throw new Error("Invalid or expired 6-digit verification code.");
      }
    } else if (token) {
      const tokenHash = hashToken(token);
      tokenRecord = await db.findAuthToken(tokenHash, "password_reset");

      if (!tokenRecord) {
        throw new Error("Invalid or expired password reset link.");
      }

      user = await db.findUserById(tokenRecord.user_id);
      if (!user) {
        throw new Error("User associated with this reset link no longer exists.");
      }
    } else {
      throw new Error("Verification code or reset token is required.");
    }

    if (tokenRecord.used_at) {
      throw new Error("This verification code or reset link has already been used.");
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new Error("This verification code or reset link has expired. Please request a new code.");
    }

    const newPasswordHash = await hashPassword(newPassword);

    // Update password, mark token used, and revoke all active sessions
    await db.updateUserPassword(user.id, newPasswordHash);
    await db.markAuthTokenUsed(tokenRecord.id);
    await db.revokeAllUserSessions(user.id);

    return { success: true };
  },
};
