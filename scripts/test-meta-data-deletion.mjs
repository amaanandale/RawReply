import assert from "node:assert/strict";
import crypto from "crypto";
import {
  parseAndVerifySignedRequest,
  processMetaDataDeletion,
  getDeletionRequestStatus,
} from "../lib/meta/data-deletion.js";

const TEST_SECRET = "test_meta_app_secret_32_bytes_len!";

function createSignedRequest(payloadObj, secret = TEST_SECRET) {
  const payloadStr = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payloadStr)
    .digest("base64url");
  return `${sig}.${payloadStr}`;
}

console.log("\n=================================================");
console.log("  RawReply Meta Data Deletion Test Suite");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}:`, err.message);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}:`, err.message);
    failed++;
  }
}

// 1. Valid signed request parsing
test("Valid signed_request parses and validates successfully", () => {
  const payload = {
    algorithm: "HMAC-SHA256",
    issued_at: Math.floor(Date.now() / 1000),
    user_id: "meta_user_123456789",
  };

  const signedRequest = createSignedRequest(payload, TEST_SECRET);
  const result = parseAndVerifySignedRequest(signedRequest, TEST_SECRET);

  assert.strictEqual(result.user_id, "meta_user_123456789");
  assert.strictEqual(result.algorithm, "HMAC-SHA256");
});

// 2. Reject tampered signature
test("Signed request with mismatched/tampered signature is rejected", () => {
  const payload = {
    algorithm: "HMAC-SHA256",
    issued_at: Math.floor(Date.now() / 1000),
    user_id: "meta_user_123456789",
  };

  const signedRequest = createSignedRequest(payload, "wrong_secret");

  assert.throws(
    () => parseAndVerifySignedRequest(signedRequest, TEST_SECRET),
    /verification failed/
  );
});

// 3. Reject malformed signed request
test("Malformed signed_request is rejected", () => {
  assert.throws(
    () => parseAndVerifySignedRequest("invalid_format_without_dot", TEST_SECRET),
    /Malformed signed_request/
  );
  assert.throws(
    () => parseAndVerifySignedRequest("", TEST_SECRET),
    /Missing or invalid signed_request/
  );
});

// 4. Process deletion request creates valid Meta response
await asyncTest("Process deletion request returns valid Meta format with tracking URL", async () => {
  const testUserId = `meta_user_test_${Date.now()}`;
  const result = await processMetaDataDeletion({
    userId: testUserId,
    metaIssuedAt: Math.floor(Date.now() / 1000),
    baseUrl: "https://rawreply.vercel.app",
  });

  assert.ok(result.confirmationCode.startsWith("del_"));
  assert.ok(result.url.includes("https://rawreply.vercel.app/data-deletion?code="));
  assert.ok(result.url.includes(result.confirmationCode));
  assert.strictEqual(result.status, "completed");

  // Query status by confirmation code
  const statusRecord = getDeletionRequestStatus(result.confirmationCode);
  assert.ok(statusRecord);
  assert.strictEqual(statusRecord.confirmationCode, result.confirmationCode);
  assert.strictEqual(statusRecord.status, "completed");
});

// 5. Idempotent deletion handling
await asyncTest("Idempotent repeated deletion request returns same confirmation code", async () => {
  const testUserId = `meta_user_idempotent_${Date.now()}`;
  const first = await processMetaDataDeletion({
    userId: testUserId,
    baseUrl: "https://rawreply.vercel.app",
  });

  const second = await processMetaDataDeletion({
    userId: testUserId,
    baseUrl: "https://rawreply.vercel.app",
  });

  assert.strictEqual(second.confirmationCode, first.confirmationCode);
  assert.strictEqual(second.url, first.url);
  assert.strictEqual(second.isExisting, true);
});

console.log("\n=================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=================================================\n");

if (failed > 0) process.exit(1);
