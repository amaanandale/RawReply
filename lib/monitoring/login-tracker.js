import { db } from "../db/client.js";

export const LOGIN_EVENT_TYPES = {
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  INVALID_CREDENTIALS: "invalid_credentials",
  INVALID_SESSION: "invalid_session",
  SESSION_EXPIRED: "session_expired",
  UNAUTHORIZED_ACCESS: "unauthorized_access",
  ACCOUNT_SUSPENDED: "account_suspended",
  LOGOUT: "logout",
  PASSWORD_RESET_REQUEST: "password_reset_request",
  PASSWORD_RESET_SUCCESS: "password_reset_success",
  AUTH_ERROR: "auth_error",
};

/**
 * Records an immutable login and authentication monitoring event.
 * Never stores plaintext passwords, secret keys, or authentication tokens.
 */
export async function trackLoginEvent({
  userId,
  organizationId,
  email,
  eventType,
  status = "success",
  safeErrorCode,
  safeErrorDescription,
  req,
  ipAddress,
  userAgent,
  requestId,
}) {
  try {
    let resolvedIp = ipAddress;
    let resolvedUa = userAgent;

    if (req) {
      resolvedIp =
        resolvedIp ||
        req.headers?.get?.("x-forwarded-for")?.split(",")?.[0]?.trim() ||
        req.headers?.get?.("x-real-ip") ||
        "127.0.0.1";
      resolvedUa = resolvedUa || req.headers?.get?.("user-agent") || "unknown";
    }

    const event = await db.recordLoginEvent({
      userId: userId || null,
      organizationId: organizationId || null,
      email: (email || "unknown").toLowerCase().trim(),
      eventType,
      status,
      safeErrorCode: safeErrorCode || null,
      safeErrorDescription: safeErrorDescription || null,
      ipAddress: resolvedIp || null,
      userAgent: resolvedUa || null,
      requestId: requestId || req?.headers?.get?.("x-request-id") || null,
    });

    if (status === "success" && userId) {
      await db.updateUserLastLogin(userId);
    }

    return event;
  } catch (err) {
    console.error("[LoginTracker] Failed to record login event:", err.message);
    return null;
  }
}

