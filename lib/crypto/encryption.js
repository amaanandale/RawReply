import crypto from "crypto";

/**
 * Derives a 32-byte key from the configured encryption secret or app secret.
 */
function getEncryptionKey() {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.META_APP_SECRET ||
    "rawreply_default_dev_encryption_secret_must_override_in_production_32bytes";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts sensitive string data (e.g. access tokens) using AES-256-GCM.
 * Returns a serialized string format: iv:authTag:ciphertext (all hex encoded).
 */
export function encryptToken(plainText) {
  if (!plainText) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 * Validates the authentication tag to ensure data integrity.
 */
export function decryptToken(encryptedPayload) {
  if (!encryptedPayload) return null;
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Generates a signed, tamper-proof OAuth state token encoding organizationId, userId,
 * timestamp, and random nonce with HMAC-SHA256.
 */
export function generateOAuthState({ organizationId, userId }) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  const payload = JSON.stringify({
    orgId: organizationId,
    uId: userId,
    ts: timestamp,
    nonce,
  });
  const hmac = crypto
    .createHmac("sha256", getEncryptionKey())
    .update(payload)
    .digest("hex");
  return Buffer.from(JSON.stringify({ payload, sig: hmac })).toString("base64url");
}

/**
 * Validates an OAuth state token.
 * Verifies HMAC signature and max age (default: 15 minutes).
 */
export function validateOAuthState(stateString, maxAgeMs = 15 * 60 * 1000) {
  if (!stateString) return { valid: false, error: "Missing state parameter" };
  try {
    const raw = Buffer.from(stateString, "base64url").toString("utf8");
    const { payload, sig } = JSON.parse(raw);
    const expectedSig = crypto
      .createHmac("sha256", getEncryptionKey())
      .update(payload)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(sig, "hex"),
        Buffer.from(expectedSig, "hex")
      )
    ) {
      return { valid: false, error: "Invalid state signature (tampered state)" };
    }

    const data = JSON.parse(payload);
    if (Date.now() - data.ts > maxAgeMs) {
      return { valid: false, error: "OAuth state expired (exceeded 15 minutes)" };
    }

    return {
      valid: true,
      organizationId: data.orgId,
      userId: data.uId,
      nonce: data.nonce,
    };
  } catch (err) {
    return { valid: false, error: `Malformed state parameter: ${err.message}` };
  }
}

