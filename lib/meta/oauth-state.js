import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getEncryptionKey } from "../crypto/encryption.js";
import {
  META_OAUTH_DIALOG_URL,
  META_DEFAULT_APP_ID,
  META_DEFAULT_CONFIG_ID,
  REQUIRED_META_SCOPES,
  FACEBOOK_PAGE_SCOPES,
  getMetaRedirectUri,
} from "./constants.js";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "data")
  : path.join(process.cwd(), "data");
const OAUTH_STATE_FILE = path.join(DATA_DIR, "oauth_states.json");

export const STATE_COOKIE_NAME = "rawreply_meta_oauth_state";
export const DEFAULT_OAUTH_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory cache for fast lookup
const stateCache = new Map();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadPersistedStates() {
  try {
    ensureDataDir();
    if (fs.existsSync(OAUTH_STATE_FILE)) {
      const raw = fs.readFileSync(OAUTH_STATE_FILE, "utf8");
      const data = JSON.parse(raw);
      const now = Date.now();
      for (const [k, v] of Object.entries(data)) {
        if (v && v.expiresAt > now) {
          stateCache.set(k, v);
        }
      }
    }
  } catch (err) {
    // Non-blocking fallback to in-memory store
  }
}

// Initial load
loadPersistedStates();

function persistStates() {
  try {
    ensureDataDir();
    const now = Date.now();
    const serialized = {};
    for (const [k, v] of stateCache.entries()) {
      if (v.expiresAt > now) {
        serialized[k] = v;
      }
    }
    fs.writeFileSync(OAUTH_STATE_FILE, JSON.stringify(serialized, null, 2), "utf8");
  } catch {
    // Non-blocking in serverless/read-only environments
  }
}

/**
 * Server-side storage for active OAuth states.
 * Enforces single-use invalidation, TTL cleanup, and tamper protection.
 */
export const oauthStateStore = {
  save(record) {
    stateCache.set(record.state, record);
    persistStates();
  },
  get(state) {
    if (!state) return null;
    let record = stateCache.get(state);
    if (!record) {
      loadPersistedStates();
      record = stateCache.get(state);
    }
    return record || null;
  },
  markUsed(state) {
    const record = this.get(state);
    if (record) {
      record.used = true;
      record.usedAt = Date.now();
      stateCache.set(state, record);
      persistStates();
    }
  },
  delete(state) {
    stateCache.delete(state);
    persistStates();
  },
  clear() {
    stateCache.clear();
    try {
      if (fs.existsSync(OAUTH_STATE_FILE)) {
        fs.unlinkSync(OAUTH_STATE_FILE);
      }
    } catch {
      // ignore
    }
  },
};

/**
 * Generates a cryptographically secure random state and associated signed HTTP-only cookie.
 * - At least 32 random bytes from crypto.randomBytes() encoded as base64url.
 * - Registered in server-side state registry with 10-minute TTL.
 * - Signed with HMAC-SHA256 to prevent client-side forgery.
 */
export function generateSecureOAuthState({
  organizationId,
  userId,
  ttlMs = DEFAULT_OAUTH_TTL_MS,
  redirectUri,
  platform = "instagram",
}) {
  if (!organizationId) {
    throw new Error("organizationId is required to generate OAuth state");
  }

  // Generate at least 32 cryptographically secure random bytes
  const rawState = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = now + ttlMs;

  // Record in server-side storage
  const stateRecord = {
    state: rawState,
    organizationId,
    userId: userId || null,
    platform,
    createdAt: now,
    expiresAt,
    used: false,
  };
  oauthStateStore.save(stateRecord);

  // Generate tamper-proof signed cookie payload
  const payload = JSON.stringify({
    state: rawState,
    orgId: organizationId,
    uId: userId || null,
    platform,
    iat: now,
    exp: expiresAt,
  });

  const sig = crypto
    .createHmac("sha256", getEncryptionKey())
    .update(payload)
    .digest("hex");

  const cookieValue = Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");

  const isSecure =
    process.env.NODE_ENV === "production" ||
    (redirectUri && redirectUri.startsWith("https://"));

  return {
    state: rawState,
    platform,
    cookieName: STATE_COOKIE_NAME,
    cookieValue,
    cookieOptions: {
      httpOnly: true,
      secure: Boolean(isSecure),
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(ttlMs / 1000), // 600 seconds
    },
    expiresAt,
  };
}

/**
 * Constructs the Meta Unified Login authorization URL dynamically using URLSearchParams.
 * Incorporates Meta Configuration ID (config_id) or direct platform scopes.
 */
export function buildMetaUnifiedLoginUrl({
  state,
  req,
  clientId,
  configId,
  redirectUri,
  platform = "instagram",
}) {
  if (!state) {
    throw new Error("state is required to construct Meta Unified Login URL");
  }

  const resolvedClientId =
    clientId || process.env.META_APP_ID || META_DEFAULT_APP_ID;
  const resolvedConfigId =
    configId !== undefined
      ? configId
      : (process.env.META_CONFIG_ID !== undefined ? process.env.META_CONFIG_ID : META_DEFAULT_CONFIG_ID);
  const resolvedRedirectUri =
    redirectUri || getMetaRedirectUri(req);

  const scopes = platform === "facebook"
    ? FACEBOOK_PAGE_SCOPES.join(",")
    : REQUIRED_META_SCOPES.join(",");

  const params = new URLSearchParams({
    client_id: resolvedClientId,
    display: "popup",
    redirect_uri: resolvedRedirectUri,
    response_type: "code",
    scope: scopes,
    state,
    prompt: "login",
  });

  // If config_id is available, not empty, and not "none", include it
  if (
    resolvedConfigId &&
    resolvedConfigId !== "none" &&
    resolvedConfigId !== "disabled" &&
    String(resolvedConfigId).trim() !== "" &&
    platform === "instagram"
  ) {
    params.set("config_id", String(resolvedConfigId).trim());
    params.set("override_default_response_type", "true");
  }

  return `${META_OAUTH_DIALOG_URL}?${params.toString()}`;
}

/**
 * Validates and consumes an OAuth state from the callback request.
 * Performs constant-time comparison, cookie signature verification, expiration check,
 * server-side reuse prevention, and organization isolation verification.
 */
export async function validateAndConsumeOAuthState({
  stateParam,
  cookieValue,
  sessionOrgId,
  sessionUser,
  maxAgeMs = DEFAULT_OAUTH_TTL_MS,
}) {
  // 1. Missing callback parameter
  if (!stateParam) {
    return {
      valid: false,
      error: "Missing state parameter in Meta callback",
      code: "missing_state",
    };
  }

  // 2. Missing state cookie
  if (!cookieValue) {
    return {
      valid: false,
      error: "Missing OAuth state cookie",
      code: "missing_state_cookie",
    };
  }

  // 3. Verify cookie cryptographic signature
  let cookieData;
  try {
    const raw = Buffer.from(cookieValue, "base64url").toString("utf8");
    const { payload, sig } = JSON.parse(raw);
    const expectedSig = crypto
      .createHmac("sha256", getEncryptionKey())
      .update(payload)
      .digest("hex");

    const sigBuf = Buffer.from(sig, "hex");
    const expectedSigBuf = Buffer.from(expectedSig, "hex");

    if (
      sigBuf.length !== expectedSigBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expectedSigBuf)
    ) {
      return {
        valid: false,
        error: "Invalid state signature (tampered cookie)",
        code: "invalid_state_signature",
      };
    }

    cookieData = JSON.parse(payload);
  } catch (err) {
    return {
      valid: false,
      error: `Malformed OAuth state cookie: ${err.message}`,
      code: "malformed_state_cookie",
    };
  }

  // 4. Constant-time comparison between callback state and cookie state
  const paramBuf = Buffer.from(stateParam);
  const cookieBuf = Buffer.from(cookieData.state || "");
  if (
    paramBuf.length !== cookieBuf.length ||
    !crypto.timingSafeEqual(paramBuf, cookieBuf)
  ) {
    return {
      valid: false,
      error: "Mismatched OAuth state parameter",
      code: "mismatched_state",
    };
  }

  // 5. Check cookie expiration (10 minutes)
  const now = Date.now();
  if (now > cookieData.exp || now - cookieData.iat > maxAgeMs) {
    return {
      valid: false,
      error: "OAuth state has expired (exceeded 10 minutes)",
      code: "expired_state",
    };
  }

  // 6. Server-side store verification
  const serverRecord = oauthStateStore.get(stateParam);
  if (!serverRecord) {
    return {
      valid: false,
      error: "OAuth state not found on server or expired",
      code: "state_not_found",
    };
  }

  // 7. Prevent state reuse
  if (serverRecord.used) {
    return {
      valid: false,
      error: "OAuth state has already been used (replay attack prevented)",
      code: "reused_state",
    };
  }

  // 8. Server record expiry check
  if (now > serverRecord.expiresAt) {
    return {
      valid: false,
      error: "OAuth state has expired on server",
      code: "expired_state",
    };
  }

  // 9. Consume the state immediately to prevent reuse
  oauthStateStore.markUsed(stateParam);

  // 10. Organization isolation check
  if (sessionOrgId && sessionOrgId !== cookieData.orgId) {
    return {
      valid: false,
      error: `Organization isolation violation: current session (${sessionOrgId}) does not match authorized target (${cookieData.orgId})`,
      code: "unauthorized_organization",
    };
  }

  // 11. User identity check (if sessionUser provided)
  if (sessionUser && cookieData.uId && sessionUser.id !== cookieData.uId) {
    return {
      valid: false,
      error: `User identity mismatch: session user (${sessionUser.id}) does not match authorization initiator (${cookieData.uId})`,
      code: "unauthorized_user",
    };
  }

  return {
    valid: true,
    organizationId: cookieData.orgId,
    userId: cookieData.uId,
    platform: cookieData.platform || serverRecord?.platform || "instagram",
    state: stateParam,
  };
}

