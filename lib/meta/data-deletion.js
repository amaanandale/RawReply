import crypto from "crypto";
import fs from "fs";
import path from "path";
import { accountStore } from "../storage/account-store.js";
import { META_DEFAULT_APP_SECRET } from "./constants.js";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "data")
  : path.join(process.cwd(), "data");

const DELETIONS_FILE = path.join(DATA_DIR, "deletion_requests.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAllDeletionRequests() {
  ensureDataDir();
  if (!fs.existsSync(DELETIONS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(DELETIONS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAllDeletionRequests(records) {
  ensureDataDir();
  fs.writeFileSync(DELETIONS_FILE, JSON.stringify(records, null, 2), "utf8");
}

/**
 * Parses and cryptographically verifies Meta's signed_request payload.
 * Meta sends: encoded_sig.payload
 * Signature is HMAC-SHA256 of payload signed with Meta App Secret.
 */
export function parseAndVerifySignedRequest(signedRequest, appSecretOverride) {
  if (!signedRequest || typeof signedRequest !== "string") {
    throw new Error("Missing or invalid signed_request parameter");
  }

  const parts = signedRequest.split(".");
  if (parts.length !== 2) {
    throw new Error("Malformed signed_request: expected signature and payload");
  }

  const [encodedSig, payloadStr] = parts;
  const appSecret =
    appSecretOverride || process.env.META_APP_SECRET || META_DEFAULT_APP_SECRET;

  if (!appSecret) {
    throw new Error("META_APP_SECRET is not configured on the server");
  }

  // 1. Compute expected HMAC-SHA256 signature
  const expectedHmac = crypto
    .createHmac("sha256", appSecret)
    .update(payloadStr)
    .digest();

  // 2. Decode received signature from base64url
  let sig;
  try {
    sig = Buffer.from(encodedSig, "base64url");
  } catch (err) {
    throw new Error(`Failed to decode signed_request signature: ${err.message}`);
  }

  // 3. Constant-time timing safe comparison
  if (
    sig.length !== expectedHmac.length ||
    !crypto.timingSafeEqual(sig, expectedHmac)
  ) {
    throw new Error("Invalid signed_request signature: verification failed");
  }

  // 4. Decode and parse JSON payload
  let data;
  try {
    const decodedPayload = Buffer.from(payloadStr, "base64url").toString("utf8");
    data = JSON.parse(decodedPayload);
  } catch (err) {
    throw new Error(`Failed to parse signed_request payload JSON: ${err.message}`);
  }

  if (data.algorithm && data.algorithm.toUpperCase() !== "HMAC-SHA256") {
    throw new Error(`Unsupported algorithm: ${data.algorithm}`);
  }

  return data;
}

/**
 * Processes a Meta data deletion callback request idempotently.
 * 1. Checks if a deletion record already exists for this user_id.
 * 2. Purges any connected accounts matching user_id.
 * 3. Persists deletion receipt with confirmation code.
 * 4. Returns confirmation code and tracking URL conforming to Meta specifications.
 */
export async function processMetaDataDeletion({
  userId,
  metaIssuedAt,
  baseUrl = "https://rawreply.vercel.app",
}) {
  if (!userId) {
    throw new Error("user_id is required for data deletion processing");
  }

  const allRequests = readAllDeletionRequests();

  // Check for idempotent existing request
  const existing = allRequests.find((r) => r.userId === userId);
  if (existing) {
    const statusUrl = `${baseUrl.replace(/\/+$/, "")}/data-deletion?code=${existing.confirmationCode}`;
    return {
      confirmationCode: existing.confirmationCode,
      url: statusUrl,
      status: existing.status,
      isExisting: true,
    };
  }

  // Generate unique confirmation code (alphanumeric tracking code)
  const confirmationCode = `del_${crypto.randomBytes(6).toString("hex")}_${Date.now()}`;
  const now = new Date().toISOString();

  // Purge any connected accounts matching this user_id or page associated with user
  let affectedAccountsCount = 0;
  try {
    const accounts = await accountStore.listAllAccounts();
    for (const acc of accounts) {
      if (
        acc.id === userId ||
        acc.instagramBusinessId === userId ||
        acc.facebookPageId === userId ||
        acc.pageId === userId
      ) {
        await accountStore.disconnectAccount(acc.organizationId, acc.id);
        affectedAccountsCount++;
      }
    }
  } catch (err) {
    console.error("[DataDeletion] Error purging account records:", err.message);
  }

  const record = {
    confirmationCode,
    userId, // App-scoped Meta user ID
    metaIssuedAt: metaIssuedAt ? new Date(metaIssuedAt * 1000).toISOString() : null,
    status: "completed",
    affectedAccountsCount,
    requestedAt: now,
    completedAt: now,
    message: "All access tokens revoked and associated account records purged from RawReply.",
  };

  allRequests.push(record);
  writeAllDeletionRequests(allRequests);

  // Safe structured log (no secrets or sensitive customer info)
  console.log(
    JSON.stringify({
      level: "info",
      service: "MetaDataDeletion",
      action: "data_deletion_processed",
      confirmationCode,
      affectedAccounts: affectedAccountsCount,
      timestamp: now,
    })
  );

  const statusUrl = `${baseUrl.replace(/\/+$/, "")}/data-deletion?code=${confirmationCode}`;

  return {
    confirmationCode,
    url: statusUrl,
    status: "completed",
    isExisting: false,
  };
}

/**
 * Retrieves the status of a data deletion request by confirmation code.
 */
export function getDeletionRequestStatus(confirmationCode) {
  if (!confirmationCode) return null;
  const allRequests = readAllDeletionRequests();
  const found = allRequests.find((r) => r.confirmationCode === confirmationCode);
  if (!found) return null;

  return {
    confirmationCode: found.confirmationCode,
    status: found.status,
    requestedAt: found.requestedAt,
    completedAt: found.completedAt,
    message: found.message,
  };
}
