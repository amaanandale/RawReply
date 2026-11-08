import crypto from "crypto";
import { db } from "../db/client.js";

export const ERROR_CATEGORIES = {
  AUTH: "auth",
  INSTAGRAM_OAUTH: "instagram_oauth",
  INSTAGRAM_WEBHOOK: "instagram_webhook",
  TOKEN_EXCHANGE: "token_exchange",
  COMMENT_PROCESSING: "comment_processing",
  MESSAGE_PROCESSING: "message_processing",
  LEAD_EXTRACTION: "lead_extraction",
  DATABASE: "database",
  API: "api",
  BACKGROUND_JOB: "background_job",
};

export const ERROR_SEVERITIES = {
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  CRITICAL: "critical",
};

/**
 * Computes a deterministic fingerprint for error grouping.
 */
function computeFingerprint(category, endpoint, message) {
  const normalizedMsg = (message || "unknown_error")
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, ":uuid")
    .replace(/\b\d{10,13}\b/g, ":timestamp")
    .replace(/usr_[a-zA-Z0-9_]+/g, ":user_id")
    .replace(/org_[a-zA-Z0-9_]+/g, ":org_id");

  return crypto
    .createHash("sha256")
    .update(`${category}:${endpoint || "none"}:${normalizedMsg}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Strips internal stack traces and secrets to produce a customer-safe message.
 */
export function sanitizeCustomerErrorMessage(err, category) {
  if (!err) return "An unexpected error occurred. Please try again.";
  const msg = typeof err === "string" ? err : err.message || "";

  if (msg.includes("DATABASE_URL") || msg.includes("Postgres") || msg.includes("SQL")) {
    return "A temporary database service issue occurred. Please retry shortly.";
  }
  if (msg.includes("token") || msg.includes("secret") || msg.includes("credentials")) {
    return "Authentication or integration verification issue. Please check your credentials.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Rate limit reached. Please wait a moment before trying again.";
  }
  return msg;
}

/**
 * Reusable centralized platform error logging service.
 * Enforces fingerprinting, stack trace protection, and severity tagging.
 */
export async function logSystemError({
  category = ERROR_CATEGORIES.API,
  severity = ERROR_SEVERITIES.ERROR,
  customerId,
  organizationId,
  endpoint,
  error,
  safeMessage,
  req,
  requestId,
}) {
  try {
    const rawError = error instanceof Error ? error : new Error(String(error || "Unknown Error"));
    const rawMessage = rawError.message || "An unknown error occurred";
    const stackTrace = rawError.stack || null;
    const resolvedSafeMessage = safeMessage || sanitizeCustomerErrorMessage(rawError, category);
    const resolvedEndpoint = endpoint || (req ? new URL(req.url).pathname : null);
    const resolvedRequestId = requestId || (req ? req.headers?.get?.("x-request-id") : null);

    const fingerprint = computeFingerprint(category, resolvedEndpoint, rawMessage);

    const recorded = await db.recordSystemError({
      fingerprint,
      category,
      severity,
      customerId: customerId || null,
      organizationId: organizationId || null,
      endpoint: resolvedEndpoint,
      safeMessage: resolvedSafeMessage,
      stackTrace, // Stored in database, accessible ONLY to Super Admins
      requestId: resolvedRequestId,
    });

    return recorded;
  } catch (logErr) {
    console.error("[ErrorLogger] Failed to log system error:", logErr.message);
    return null;
  }
}

