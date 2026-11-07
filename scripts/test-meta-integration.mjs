import assert from "assert";
import crypto from "crypto";
import {
  encryptToken,
  decryptToken,
  generateOAuthState,
  validateOAuthState,
} from "../lib/crypto/encryption.js";
import {
  verifyWebhookSignature,
  normalizeWebhookEvents,
} from "../lib/meta/webhooks.js";
import { durableEventStore } from "../lib/events/durable-store.js";
import { accountStore, sanitizeAccount } from "../lib/storage/account-store.js";

async function runTests() {
  console.log("=================================================");
  console.log("RawReply Meta Integration & Webhook Test Suite");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${err.message}`);
      failed++;
    }
  }

  // ─── 1. Crypto & Token Encryption ─────────────────────────────
  test("AES-256-GCM Token Encryption round-trip", () => {
    const originalToken = "EAABwzLixnjYBAK76ZCZCZCZCZCZCZCZC";
    const encrypted = encryptToken(originalToken);
    assert.notStrictEqual(encrypted, originalToken);
    assert.strictEqual(encrypted.includes(originalToken), false);
    const decrypted = decryptToken(encrypted);
    assert.strictEqual(decrypted, originalToken);
  });

  test("AES-256-GCM rejects tampered ciphertext", () => {
    const encrypted = encryptToken("secret_token_123");
    const parts = encrypted.split(":");
    // Tamper with the ciphertext
    parts[2] = parts[2].slice(0, -2) + "ff";
    const tampered = parts.join(":");
    assert.throws(() => decryptToken(tampered));
  });

  // ─── 2. OAuth State Security ─────────────────────────────────
  test("OAuth State generation and verification with valid HMAC", () => {
    const state = generateOAuthState({
      organizationId: "org_12345",
      userId: "user_67890",
    });
    const result = validateOAuthState(state);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.organizationId, "org_12345");
    assert.strictEqual(result.userId, "user_67890");
    assert.ok(result.nonce);
  });

  test("OAuth State rejects tampered state", () => {
    const state = generateOAuthState({
      organizationId: "org_12345",
      userId: "user_67890",
    });
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    decoded.payload = decoded.payload.replace("org_12345", "org_hacked");
    const tamperedState = Buffer.from(JSON.stringify(decoded)).toString("base64url");
    const result = validateOAuthState(tamperedState);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes("signature"));
  });

  test("OAuth State rejects expired state", () => {
    const state = generateOAuthState({
      organizationId: "org_12345",
      userId: "user_67890",
    });
    // Validate with maxAge of -1ms to simulate expiration
    const result = validateOAuthState(state, -1);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error.includes("expired"));
  });

  // ─── 3. Webhook Signature Verification ────────────────────────
  test("Webhook HMAC-SHA256 signature accepts valid signature", () => {
    const appSecret = "test_meta_app_secret_12345";
    const rawBody = JSON.stringify({ object: "instagram", entry: [] });
    const signature = crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");
    const header = `sha256=${signature}`;

    const isValid = verifyWebhookSignature({
      rawBody,
      signatureHeader: header,
      appSecret,
    });
    assert.strictEqual(isValid, true);
  });

  test("Webhook HMAC-SHA256 signature rejects invalid signature", () => {
    const appSecret = "test_meta_app_secret_12345";
    const rawBody = JSON.stringify({ object: "instagram", entry: [] });
    const header = "sha256=invalid_hex_signature_00000000000000000000000000000000";

    const isValid = verifyWebhookSignature({
      rawBody,
      signatureHeader: header,
      appSecret,
    });
    assert.strictEqual(isValid, false);
  });

  test("Webhook HMAC-SHA256 signature rejects mismatched secret", () => {
    const rawBody = JSON.stringify({ object: "instagram" });
    const signature = crypto
      .createHmac("sha256", "wrong_secret")
      .update(rawBody)
      .digest("hex");

    const isValid = verifyWebhookSignature({
      rawBody,
      signatureHeader: `sha256=${signature}`,
      appSecret: "correct_secret",
    });
    assert.strictEqual(isValid, false);
  });

  // ─── 4. Webhook Payload Normalization ─────────────────────────
  test("Webhook normalizes Instagram comment events", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "page_123",
          time: 1700000000000,
          changes: [
            {
              field: "comments",
              value: {
                comment_id: "comment_999",
                media: { id: "media_555" },
                text: "Interested in this! Please send info",
                from: { id: "user_888", username: "alex_buyer" },
              },
            },
          ],
        },
      ],
    };

    const events = normalizeWebhookEvents(payload);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].type, "instagram_comment");
    assert.strictEqual(events[0].dedupKey, "comment_999");
    assert.strictEqual(events[0].data.text, "Interested in this! Please send info");
    assert.strictEqual(events[0].data.from.username, "alex_buyer");
  });

  test("Webhook normalizes Instagram messaging events", () => {
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "account_123",
          time: 1700000000000,
          messaging: [
            {
              sender: { id: "sender_user_1" },
              recipient: { id: "account_123" },
              timestamp: 1700000000100,
              message: {
                mid: "mid.1457764197618:bb846a44c3",
                text: "My phone number is +15551234567",
              },
            },
          ],
        },
      ],
    };

    const events = normalizeWebhookEvents(payload);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].type, "instagram_message");
    assert.strictEqual(events[0].data.senderId, "sender_user_1");
    assert.strictEqual(events[0].data.text, "My phone number is +15551234567");
  });

  // ─── 5. Durable Event Ingestion & Deduplication ───────────────
  await asyncTest("Durable Event Ingestion detects and skips duplicates", async () => {
    const testDedupKey = `test_dedup_${Date.now()}`;
    const event = {
      id: `evt_${Date.now()}`,
      dedupKey: testDedupKey,
      type: "instagram_comment",
      timestamp: Date.now(),
      data: { text: "Hello" },
    };

    // First ingestion should be accepted
    const firstResult = await durableEventStore.ingestEvent(event);
    assert.strictEqual(firstResult.accepted, true);
    assert.strictEqual(firstResult.duplicate, false);

    // Immediate duplicate ingestion should be flagged as duplicate
    const secondResult = await durableEventStore.ingestEvent(event);
    assert.strictEqual(secondResult.accepted, true);
    assert.strictEqual(secondResult.duplicate, true);
  });

  // ─── 6. Multi-Tenant Account Store & Isolation ────────────────
  await asyncTest("AccountStore enforces strict organization isolation", async () => {
    const orgA = `test_org_A_${Date.now()}`;
    const orgB = `test_org_B_${Date.now()}`;

    // Connect account for Org A
    await accountStore.saveAccount({
      organizationId: orgA,
      instagramBusinessId: "ig_acc_A",
      username: "brand_A",
      name: "Brand A Official",
      accessToken: "token_for_A",
      pageToken: "page_token_A",
      pageId: "page_A",
    });

    // Connect account for Org B
    await accountStore.saveAccount({
      organizationId: orgB,
      instagramBusinessId: "ig_acc_B",
      username: "brand_B",
      name: "Brand B Official",
      accessToken: "token_for_B",
      pageToken: "page_token_B",
      pageId: "page_B",
    });

    // Verify Org A only sees Org A's account
    const accountsA = await accountStore.listAccounts(orgA);
    assert.strictEqual(accountsA.length, 1);
    assert.strictEqual(accountsA[0].username, "brand_A");
    assert.strictEqual(accountsA[0].encryptedAccessToken, undefined); // Tokens must be stripped

    // Verify Org B only sees Org B's account
    const accountsB = await accountStore.listAccounts(orgB);
    assert.strictEqual(accountsB.length, 1);
    assert.strictEqual(accountsB[0].username, "brand_B");

    // Disconnect Org A's account
    const disconnectResult = await accountStore.disconnectAccount(orgA, "ig_acc_A");
    assert.strictEqual(disconnectResult.success, true);

    // Verify Org A now has 0 accounts, while Org B is intact
    const remainingA = await accountStore.listAccounts(orgA);
    assert.strictEqual(remainingA.length, 0);

    const remainingB = await accountStore.listAccounts(orgB);
    assert.strictEqual(remainingB.length, 1);
    assert.strictEqual(remainingB[0].username, "brand_B");

    // Clean up Org B
    await accountStore.disconnectAccount(orgB, "ig_acc_B");
  });

  // ─── 7. Meta Redirect URI & OAuth Endpoint Guards ──────────────
  const {
    getMetaRedirectUri,
    META_API_VERSION,
    REQUIRED_META_SCOPES,
    META_OAUTH_DIALOG_URL,
  } = await import("../lib/meta/constants.js");

  test("getMetaRedirectUri derivation and trailing slash normalization", () => {
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    const originalMetaRedirect = process.env.META_REDIRECT_URI;

    try {
      // 1. Default fallback
      delete process.env.META_REDIRECT_URI;
      delete process.env.NEXT_PUBLIC_APP_URL;
      const defaultUri = getMetaRedirectUri();
      assert.strictEqual(defaultUri, "http://localhost:3000/api/auth/meta/callback");

      // 2. Trailing slash normalization in APP_URL
      process.env.NEXT_PUBLIC_APP_URL = "https://app.rawreply.io///";
      const cleanedUri = getMetaRedirectUri();
      assert.strictEqual(cleanedUri, "https://app.rawreply.io/api/auth/meta/callback");

      // 3. Explicit META_REDIRECT_URI precedence
      process.env.META_REDIRECT_URI = "https://custom.rawreply.io/api/auth/meta/callback";
      const customUri = getMetaRedirectUri();
      assert.strictEqual(customUri, "https://custom.rawreply.io/api/auth/meta/callback");
    } finally {
      if (originalAppUrl) process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
      else delete process.env.NEXT_PUBLIC_APP_URL;
      if (originalMetaRedirect) process.env.META_REDIRECT_URI = originalMetaRedirect;
      else delete process.env.META_REDIRECT_URI;
    }
  });

  test("Meta OAuth URL and required scopes compliance", () => {
    const appId = "123456789012345";
    const redirectUri = "http://localhost:3000/api/auth/meta/callback";
    const state = generateOAuthState({ organizationId: "org_abc", userId: "usr_xyz" });

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: REQUIRED_META_SCOPES.join(","),
      response_type: "code",
    });

    const fullAuthUrl = `${META_OAUTH_DIALOG_URL}?${params.toString()}`;
    assert.ok(fullAuthUrl.startsWith("https://www.facebook.com/v21.0/dialog/oauth"));
    assert.ok(fullAuthUrl.includes("client_id=123456789012345"));
    assert.ok(fullAuthUrl.includes("response_type=code"));
    assert.ok(fullAuthUrl.includes("instagram_manage_comments"));
    assert.ok(fullAuthUrl.includes("instagram_manage_messages"));
    assert.ok(fullAuthUrl.includes("pages_show_list"));
    assert.ok(fullAuthUrl.includes("pages_manage_metadata"));
  });

  test("Missing credentials detection logic", () => {
    const isConfigured = (appId, appSecret) => Boolean(appId && appSecret);
    assert.strictEqual(isConfigured(undefined, undefined), false);
    assert.strictEqual(isConfigured("app_id", undefined), false);
    assert.strictEqual(isConfigured(undefined, "app_secret"), false);
    assert.strictEqual(isConfigured("app_id", "app_secret"), true);
  });


  console.log("\n=================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

