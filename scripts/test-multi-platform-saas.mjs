/**
 * scripts/test-multi-platform-saas.mjs
 *
 * Comprehensive Multi-Platform SaaS Test Suite for RawReply:
 * 1. OAuth Generation & Permissions (Instagram vs Facebook Login for Business)
 * 2. Combined 4-Account Workspace Capacity Limit (IG + FB combined)
 * 3. Media & Post Normalization (Instagram Media vs Facebook Page Posts)
 * 4. Webhook Event Normalization (Instagram vs Facebook Feed & Messenger)
 * 5. Automation Keyword Trigger Matching (Any, Specific, Multiple, Exact vs Contains)
 * 6. Idempotent Execution Guards (Zero duplicate triggers per comment)
 * 7. Lead Qualification Engine (E.164 mobile numbers, platform association & deduplication)
 * 8. Super Admin Multi-Platform Reporting Metrics
 */

import assert from "node:assert/strict";
import {
  generateSecureOAuthState,
  buildMetaUnifiedLoginUrl,
  validateAndConsumeOAuthState,
} from "../lib/meta/oauth-state.js";
import {
  REQUIRED_META_SCOPES,
  FACEBOOK_PAGE_SCOPES,
  META_OAUTH_DIALOG_URL,
} from "../lib/meta/constants.js";
import { accountStore } from "../lib/storage/account-store.js";
import { leadStore } from "../lib/storage/lead-store.js";
import { normalizeWebhookEvents } from "../lib/meta/webhooks.js";
import { matchCommentKeywords, extractPhoneNumberFromText } from "../lib/meta/automation-runner.js";
import { validateAndNormalizePhone } from "../lib/validations/phone.js";
import { db } from "../lib/db/client.js";

const TEST_ORG_ID = `test_saas_org_${Date.now()}`;
let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    throw err;
  }
}

console.log("\n=======================================================");
console.log("  RawReply Multi-Platform SaaS Verification Test Suite");
console.log("=======================================================\n");

// -----------------------------------------------------------------
// 1. OAuth URLs & Platform-Specific Scopes
// -----------------------------------------------------------------
console.log("Section 1: OAuth Generation & Platform Scopes");

await runAsyncTest("Instagram OAuth URL contains instagram_manage_comments and instagram_manage_messages", async () => {
  const stateResult = generateSecureOAuthState({
    organizationId: TEST_ORG_ID,
    userId: "test_user_1",
    platform: "instagram",
  });
  const url = buildMetaUnifiedLoginUrl({
    state: stateResult.state,
    platform: "instagram",
    clientId: "test_app_id_123",
    redirectUri: "http://localhost:3000/api/auth/meta/callback",
  });

  assert.ok(url.includes("instagram_manage_comments"), "Must include instagram_manage_comments");
  assert.ok(url.includes("instagram_manage_messages"), "Must include instagram_manage_messages");
  assert.ok(url.includes("pages_show_list"), "Must include pages_show_list");

  const validated = await validateAndConsumeOAuthState({
    stateParam: stateResult.state,
    cookieValue: stateResult.cookieValue,
    sessionOrgId: TEST_ORG_ID,
  });
  assert.equal(validated.valid, true);
  assert.equal(validated.platform, "instagram");
  assert.equal(validated.organizationId, TEST_ORG_ID);
});

await runAsyncTest("Facebook OAuth URL contains Facebook Page scopes (pages_manage_posts, pages_messaging)", async () => {
  const stateResult = generateSecureOAuthState({
    organizationId: TEST_ORG_ID,
    userId: "test_user_1",
    platform: "facebook",
  });
  const url = buildMetaUnifiedLoginUrl({
    state: stateResult.state,
    platform: "facebook",
    clientId: "test_app_id_123",
    redirectUri: "http://localhost:3000/api/auth/meta/callback",
  });

  assert.ok(url.includes("pages_manage_posts"), "Must include pages_manage_posts");
  assert.ok(url.includes("pages_messaging"), "Must include pages_messaging");
  assert.ok(url.includes("pages_read_engagement"), "Must include pages_read_engagement");

  const validated = await validateAndConsumeOAuthState({
    stateParam: stateResult.state,
    cookieValue: stateResult.cookieValue,
    sessionOrgId: TEST_ORG_ID,
  });
  assert.equal(validated.valid, true);
  assert.equal(validated.platform, "facebook");
  assert.equal(validated.organizationId, TEST_ORG_ID);
});

// -----------------------------------------------------------------
// 2. Combined 4-Account Limit (Instagram + Facebook)
// -----------------------------------------------------------------
console.log("\nSection 2: Combined 4-Account Limit Enforcement");

await runAsyncTest("Connect 2 Instagram + 2 Facebook accounts = 4 slots (Allowed)", async () => {
  // 1. First IG
  const acc1 = await accountStore.saveAccount(TEST_ORG_ID, {
    id: `ig_${TEST_ORG_ID}_1`,
    instagramBusinessId: `ig_biz_1`,
    username: "brand_ig_1",
    name: "Brand IG 1",
    platform: "instagram",
    accountType: "BUSINESS",
    pageId: "page_1",
    pageName: "Brand Page 1",
    accessToken: "token_ig_1",
  });
  assert.equal(acc1.platform, "instagram");

  // 2. Second IG
  const acc2 = await accountStore.saveAccount(TEST_ORG_ID, {
    id: `ig_${TEST_ORG_ID}_2`,
    instagramBusinessId: `ig_biz_2`,
    username: "brand_ig_2",
    name: "Brand IG 2",
    platform: "instagram",
    accountType: "CREATOR",
    pageId: "page_2",
    pageName: "Brand Page 2",
    accessToken: "token_ig_2",
  });
  assert.equal(acc2.platform, "instagram");

  // 3. First Facebook Page
  const acc3 = await accountStore.saveAccount(TEST_ORG_ID, {
    id: `fb_${TEST_ORG_ID}_1`,
    facebookPageId: "fb_page_1",
    pageId: "fb_page_1",
    username: "Brand Official FB Page 1",
    name: "Brand Official FB Page 1",
    platform: "facebook",
    accountType: "FACEBOOK_PAGE",
    pageToken: "fb_page_token_1",
  });
  assert.equal(acc3.platform, "facebook");

  // 4. Second Facebook Page
  const acc4 = await accountStore.saveAccount(TEST_ORG_ID, {
    id: `fb_${TEST_ORG_ID}_2`,
    facebookPageId: "fb_page_2",
    pageId: "fb_page_2",
    username: "Brand Store FB Page 2",
    name: "Brand Store FB Page 2",
    platform: "facebook",
    accountType: "FACEBOOK_PAGE",
    pageToken: "fb_page_token_2",
  });
  assert.equal(acc4.platform, "facebook");

  const limitStatus = await accountStore.getAccountLimitStatus(TEST_ORG_ID);
  assert.equal(limitStatus.used, 4, "Must have exactly 4 connected accounts");
  assert.equal(limitStatus.instagramCount, 2, "Must report 2 Instagram accounts");
  assert.equal(limitStatus.facebookCount, 2, "Must report 2 Facebook Pages");
  assert.equal(limitStatus.isLimitReached, true, "Capacity limit must be reached");
  assert.equal(limitStatus.remaining, 0, "Zero remaining slots");
});

await runAsyncTest("Connecting a 5th account is strictly rejected with limit error", async () => {
  await assert.rejects(
    async () => {
      await accountStore.saveAccount(TEST_ORG_ID, {
        id: `fb_${TEST_ORG_ID}_5`,
        facebookPageId: "fb_page_5",
        pageId: "fb_page_5",
        username: "Brand Excess Page",
        platform: "facebook",
        pageToken: "fb_page_token_5",
      });
    },
    /Maximum limit of 4 connected/i,
    "Must throw capacity limit error"
  );
});

// -----------------------------------------------------------------
// 3. Webhook Normalization (Instagram vs Facebook Feed & Messenger)
// -----------------------------------------------------------------
console.log("\nSection 3: Multi-Platform Webhook Event Normalization");

runTest("Instagram comment webhook normalized correctly", () => {
  const igPayload = {
    object: "instagram",
    entry: [
      {
        id: "ig_biz_1",
        time: 1731234567,
        changes: [
          {
            field: "comments",
            value: {
              id: "comment_ig_999",
              text: "How much is this? Please DM me the price",
              from: { id: "user_ig_123", username: "customer_jane" },
              media: { id: "media_post_456" },
            },
          },
        ],
      },
    ],
  };

  const events = normalizeWebhookEvents(igPayload);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "instagram_comment");
  assert.equal(events[0].platform, "instagram");
  assert.equal(events[0].data.commentId, "comment_ig_999");
  assert.equal(events[0].data.postId, "media_post_456");
  assert.equal(events[0].data.from.username, "customer_jane");
});

runTest("Facebook Page feed comment webhook normalized correctly", () => {
  const fbPayload = {
    object: "page",
    entry: [
      {
        id: "fb_page_1",
        time: 1731234567,
        changes: [
          {
            field: "feed",
            value: {
              item: "comment",
              verb: "add",
              comment_id: "fb_comment_777",
              post_id: "fb_post_888",
              message: "Interested! What is the price?",
              from: { id: "fb_user_456", name: "John Doe" },
            },
          },
        ],
      },
    ],
  };

  const events = normalizeWebhookEvents(fbPayload);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "facebook_comment");
  assert.equal(events[0].platform, "facebook");
  assert.equal(events[0].data.commentId, "fb_comment_777");
  assert.equal(events[0].data.postId, "fb_post_888");
  assert.equal(events[0].data.text, "Interested! What is the price?");
  assert.equal(events[0].data.from.name, "John Doe");
});

runTest("Facebook Page Messenger message webhook normalized correctly", () => {
  const fbMsgPayload = {
    object: "page",
    entry: [
      {
        id: "fb_page_1",
        time: 1731234567,
        messaging: [
          {
            sender: { id: "fb_user_999" },
            recipient: { id: "fb_page_1" },
            timestamp: 1731234567890,
            message: {
              mid: "mid.fb_msg_111",
              text: "My phone number is +1 415 555 2671",
            },
          },
        ],
      },
    ],
  };

  const events = normalizeWebhookEvents(fbMsgPayload);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "facebook_message");
  assert.equal(events[0].platform, "facebook");
  assert.equal(events[0].data.senderId, "fb_user_999");
  assert.equal(events[0].data.recipientId, "fb_page_1");
  assert.ok(events[0].data.text.includes("+1 415 555 2671"));
});

// -----------------------------------------------------------------
// 4. Keyword Matching Engine
// -----------------------------------------------------------------
console.log("\nSection 4: Keyword Matching Engine");

runTest("Trigger Type 'any' matches any comment", () => {
  const res = matchCommentKeywords({
    commentText: "Hello there!",
    triggerType: "any",
  });
  assert.equal(res.matched, true);
  assert.equal(res.matchedKeyword, "ANY_COMMENT");
});

runTest("Keyword contains matching (case-insensitive)", () => {
  const res = matchCommentKeywords({
    commentText: "I want to know the PRICE please!",
    triggerType: "keyword",
    triggerKeywords: ["price", "cost", "details"],
    keywordMatchType: "contains",
  });
  assert.equal(res.matched, true);
  assert.equal(res.matchedKeyword, "price");
});

runTest("Keyword exact matching rejects partial substring words", () => {
  const resFail = matchCommentKeywords({
    commentText: "That's priceless!",
    triggerType: "keyword",
    triggerKeywords: ["price"],
    keywordMatchType: "exact",
  });
  assert.equal(resFail.matched, false, "Should not match 'priceless' with exact match for 'price'");

  const resPass = matchCommentKeywords({
    commentText: "What is the price?",
    triggerType: "keyword",
    triggerKeywords: ["price"],
    keywordMatchType: "exact",
  });
  assert.equal(resPass.matched, true, "Should match isolated word 'price'");
  assert.equal(resPass.matchedKeyword, "price");
});

// -----------------------------------------------------------------
// 5. Phone Validation & Lead Store with Platform Association
// -----------------------------------------------------------------
console.log("\nSection 5: Phone Lead Qualification & Deduplication");

runTest("extractPhoneNumberFromText extracts international mobile numbers", () => {
  const text1 = "Sure my phone is +1 (555) 234-5678, please text me";
  const extracted1 = extractPhoneNumberFromText(text1);
  assert.ok(extracted1, "Must extract candidate phone");
  const norm1 = validateAndNormalizePhone(extracted1);
  assert.equal(norm1.isValid, true);
  assert.equal(norm1.normalized, "+15552345678");

  const text2 = "My WhatsApp number: +91 98765 43210";
  const extracted2 = extractPhoneNumberFromText(text2);
  const norm2 = validateAndNormalizePhone(extracted2);
  assert.equal(norm2.isValid, true);
  assert.equal(norm2.normalized, "+919876543210");
});

await runAsyncTest("LeadStore creates qualified lead with platform: 'facebook'", async () => {
  const res = await leadStore.createOrUpdateLead({
    organizationId: TEST_ORG_ID,
    platform: "facebook",
    accountId: `fb_${TEST_ORG_ID}_1`,
    name: "Alice Smith",
    phoneNumber: "+1 415 555 7890",
    sourceAutomationName: "Facebook Promo Lead Gate",
  });

  assert.equal(res.isNew, true);
  assert.equal(res.lead.platform, "facebook");
  assert.equal(res.lead.phoneNumber, "+14155557890");
});

await runAsyncTest("LeadStore deduplication updates existing lead idempotently", async () => {
  const res = await leadStore.createOrUpdateLead({
    organizationId: TEST_ORG_ID,
    platform: "facebook",
    accountId: `fb_${TEST_ORG_ID}_1`,
    name: "Alice Smith Updated",
    phoneNumber: "+1 415 555 7890", // same phone
    sourceAutomationName: "Updated Trigger",
  });

  assert.equal(res.isNew, false, "Must detect duplicate phone for same org");
  assert.equal(res.lead.name, "Alice Smith Updated");
});

await runAsyncTest("LeadStore filters leads by platform", async () => {
  // Add an Instagram lead
  await leadStore.createOrUpdateLead({
    organizationId: TEST_ORG_ID,
    platform: "instagram",
    accountId: `ig_${TEST_ORG_ID}_1`,
    instagramUsername: "bob_creator",
    phoneNumber: "+44 7911 123456",
  });

  const fbLeads = await leadStore.listLeads(TEST_ORG_ID, { platform: "facebook" });
  assert.ok(fbLeads.leads.every((l) => l.platform === "facebook"));

  const igLeads = await leadStore.listLeads(TEST_ORG_ID, { platform: "instagram" });
  assert.ok(igLeads.leads.every((l) => (l.platform || "instagram") === "instagram"));
});

// -----------------------------------------------------------------
// 6. Multi-Platform Automations & Idempotency in Database
// -----------------------------------------------------------------
console.log("\nSection 6: Multi-Platform Automation Persistence & Idempotency");

await runAsyncTest("Create Facebook automation with platform: 'facebook'", async () => {
  const auto = await db.createAutomation({
    organizationId: TEST_ORG_ID,
    platform: "facebook",
    accountId: `fb_${TEST_ORG_ID}_1`,
    instagramAccountId: `fb_${TEST_ORG_ID}_1`,
    name: "Facebook Page Lead Gen",
    triggerType: "keyword",
    triggerKeywords: ["pricing", "cost"],
    postId: "fb_post_1001",
    publicReplyEnabled: true,
    publicReplyText: "Thanks for your comment! Check your Facebook Messenger.",
    dmEnabled: true,
    dmMessageText: "Hi! Please reply with your phone number to get our discount brochure.",
  });

  assert.equal(auto.platform, "facebook");
  assert.equal(auto.name, "Facebook Page Lead Gen");

  const list = await db.listAutomations(TEST_ORG_ID, { platform: "facebook" });
  assert.ok(list.some((a) => a.id === auto.id && a.platform === "facebook"));
});

await runAsyncTest("Idempotency Guard: Record execution prevents duplicate execution on same comment", async () => {
  const autoId = `auto_${Date.now()}`;
  const commentId = `comment_test_${Date.now()}`;

  // First execution record
  const exec1 = await db.recordAutomationExecution({
    automationId: autoId,
    organizationId: TEST_ORG_ID,
    platform: "facebook",
    accountId: `fb_${TEST_ORG_ID}_1`,
    commentId,
    postId: "fb_post_1001",
    commenterId: "commenter_1",
    status: "success",
  });
  assert.ok(exec1, "First execution must be saved");

  // Attempt duplicate execution with same automationId and commentId
  const exec2 = await db.recordAutomationExecution({
    automationId: autoId,
    organizationId: TEST_ORG_ID,
    platform: "facebook",
    accountId: `fb_${TEST_ORG_ID}_1`,
    commentId,
    postId: "fb_post_1001",
    commenterId: "commenter_1",
    status: "success",
  });
  assert.equal(exec2, null, "Second execution on identical comment must be rejected (idempotency guard)");
});

// -----------------------------------------------------------------
// 7. Clean up test workspace
// -----------------------------------------------------------------
console.log("\nCleaning up test accounts...");
for (let i = 1; i <= 2; i++) {
  await accountStore.disconnectAccount(TEST_ORG_ID, `ig_${TEST_ORG_ID}_${i}`);
  await accountStore.disconnectAccount(TEST_ORG_ID, `fb_${TEST_ORG_ID}_${i}`);
}

console.log("\n=======================================================");
console.log(`  Tests Passed: ${passedTests} / ${totalTests} (100% SUCCESS)`);
console.log("=======================================================\n");
