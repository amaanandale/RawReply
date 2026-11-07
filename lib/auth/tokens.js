import crypto from "crypto";
import * as jose from "jose";

const JWT_ISSUER = process.env.JWT_ISSUER || "rawreply";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "rawreply-api";
const ACCESS_TOKEN_EXPIRATION = "15m";

function getJwtSecret() {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.ENCRYPTION_SECRET;
  if (!secret) {
    // In local dev without env, provide a safe default buffer rather than throwing uncaught error
    return new TextEncoder().encode("rawreply_jwt_default_secret_key_32_bytes_len!!");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Generate a short-lived signed JWT access token.
 * Payload includes minimal claims: sub (userId), sid (sessionId), org (orgId), rol (role), adm (isSuperAdmin).
 */
export async function createAccessToken({ userId, sessionId, orgId, role, isSuperAdmin = false }) {
  const secret = getJwtSecret();

  return new jose.SignJWT({
    sid: sessionId,
    org: orgId,
    rol: role,
    adm: Boolean(isSuperAdmin),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
    .sign(secret);
}

/**
 * Verify and decode a JWT access token.
 * Validates signature, issuer, audience, and expiration.
 */
export async function verifyAccessToken(token) {
  if (!token) return null;
  try {
    const secret = getJwtSecret();
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return {
      userId: payload.sub,
      sessionId: payload.sid,
      orgId: payload.org,
      role: payload.rol,
      isSuperAdmin: Boolean(payload.adm),
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
}

/**
 * Generate a cryptographically secure random refresh token.
 */
export function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

/**
 * Hash a refresh token using SHA-256 for secure storage at rest.
 */
export function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a random invitation or password reset token.
 */
export function generateRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash an invitation or reset token with SHA-256.
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

