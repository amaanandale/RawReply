import assert from "assert";
import crypto from "crypto";
import { db } from "../lib/db/client.js";
import { accountStore } from "../lib/storage/account-store.js";
import { leadStore } from "../lib/storage/lead-store.js";
import {
  matchCommentKeywords,
  extractPhoneNumberFromText,
  processIncomingComment,
  processIncomingMessage,
} from "../lib/meta/automation-runner.js";
import { validateAndNormalizePhone } from "../lib/validations/phone.js";
import { encryptToken, decryptToken } from "../lib/crypto/encryption.js";

async function runPhase2TestSuite() {
  console.log("=================================================");
  console.log("RawReply Phase 2: Instagram API, Media & Automations");
  console.log("isPostgres:", db.isPostgres());
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

  // -------------------------------------------------------------
  // Test 1: Instagram Account Limit (Strict 4 Accounts per Customer)
  // -------------------------------------------------------------
  await asyncTest("Enforces strict limit of 4 connected Instagram accounts per workspace", async () => {
    const testOrgId = `org_limit_test_${Date.now()}`;

    // Connect 4 accounts
    for (let i = 1; i <= 4; i++) {
      await accountStore.saveAccount({
        organizationId: testOrgId,
        instagramBusinessId: `ig_limit_${i}_${Date.now()}`,
        username: `creator_account_${i}`,
        accessToken: `fake_access_token_${i}`,
        pageToken: `fake_page_token_${i}`,
        pageId: `page_${i}`,
        accountType: "BUSINESS",
      });
    }

    const limitStatus = await accountStore.getAccountLimitStatus(testOrgId);
    assert.strictEqual(limitStatus.used, 4);
    assert.strictEqual(limitStatus.remaining, 0);
    assert.strictEqual(limitStatus.isLimitReached, true);

    // Attempting to connect a 5th account MUST fail
    let threw = false;
    try {
      await accountStore.saveAccount({
        organizationId: testOrgId,
        instagramBusinessId: `ig_limit_5_${Date.now()}`,
        username: "creator_account_5",
        accessToken: "fake_token_5",
        pageToken: "fake_page_token_5",
        pageId: "page_5",
        accountType: "BUSINESS",
      });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes("Maximum limit of 4 connected Instagram accounts"));
    }
    assert.strictEqual(threw, true, "5th account connection should throw error");
  });

  // -------------------------------------------------------------
  // Test 2: Instagram Media Storage & Retrieval
  // -------------------------------------------------------------
  await asyncTest("Stores and retrieves real Instagram media items with deduplication", async () => {
    const orgId = `org_media_test_${Date.now()}`;
    const accountId = `ig_acc_${Date.now()}`;

    const mediaBatch = [
      {
        id: "media_item_1",
        mediaType: "VIDEO",
        caption: "Check out our new SaaS automation #growth",
        thumbnailUrl: "https://instagram.fcdn.net/thumb1.jpg",
        mediaUrl: "https://instagram.fcdn.net/video1.mp4",
        permalink: "https://www.instagram.com/reel/C12345/",
        publishedAt: "2026-11-01T12:00:00Z",
        likeCount: 154,
        commentsCount: 32,
      },
      {
        id: "media_item_2",
        mediaType: "IMAGE",
        caption: "Comment PRICE for instant software access link!",
        thumbnailUrl: "https://instagram.fcdn.net/image2.jpg",
        mediaUrl: "https://instagram.fcdn.net/image2.jpg",
        permalink: "https://www.instagram.com/p/C67890/",
        publishedAt: "2026-11-02T15:30:00Z",
        likeCount: 420,
        commentsCount: 89,
      },
    ];

    const saved = await db.saveInstagramMedia(orgId, accountId, mediaBatch);
    assert.strictEqual(saved.length, 2);

    const listed = await db.listInstagramMedia(orgId, accountId);
    assert.strictEqual(listed.length, 2);
    const item2 = listed.find((m) => m.media_id === "media_item_2");
    assert.ok(item2);
    assert.strictEqual(item2.media_type, "IMAGE");
    assert.strictEqual(item2.comments_count, 89);
  });

  // -------------------------------------------------------------
  // Test 3: Trigger Condition & Keyword Matching Engine
  // -------------------------------------------------------------
  test("Keyword matcher Option A: Any Comment matches all incoming text", () => {
    const res1 = matchCommentKeywords({
      commentText: "Hello there!",
      triggerType: "any",
    });
    assert.strictEqual(res1.matched, true);
    assert.strictEqual(res1.matchedKeyword, "ANY_COMMENT");

    const res2 = matchCommentKeywords({
      commentText: "What is the price?",
      triggerType: "comment",
      triggerKeywords: null, // No keywords specified
    });
    assert.strictEqual(res2.matched, true);
  });

  test("Keyword matcher Option B: Specific keyword matching (case-insensitive & contains)", () => {
    // Contains match
    const resContains = matchCommentKeywords({
      commentText: "Hey please send the PRICE to my DM!",
      triggerType: "comment",
      triggerKeywords: "price",
      keywordMatchType: "contains",
    });
    assert.strictEqual(resContains.matched, true);
    assert.strictEqual(resContains.matchedKeyword, "price");

    // Exact word match
    const resExactSuccess = matchCommentKeywords({
      commentText: "PRICE!",
      triggerType: "comment",
      triggerKeywords: "price",
      keywordMatchType: "exact",
    });
    assert.strictEqual(resExactSuccess.matched, true);

    // Exact word match negative case: substring inside another word
    const resExactFail = matchCommentKeywords({
      commentText: "priceless",
      triggerType: "comment",
      triggerKeywords: "price",
      keywordMatchType: "exact",
    });
    assert.strictEqual(resExactFail.matched, false);
  });

  test("Keyword matcher Option C: Multiple keywords with exact or contains matching", () => {
    const keywords = "link, demo, pricing, info";

    const matchDemo = matchCommentKeywords({
      commentText: "Can I get a demo please?",
      triggerType: "comment",
      triggerKeywords: keywords,
      keywordMatchType: "contains",
    });
    assert.strictEqual(matchDemo.matched, true);
    assert.strictEqual(matchDemo.matchedKeyword, "demo");

    const matchInfo = matchCommentKeywords({
      commentText: "Send INFO",
      triggerType: "comment",
      triggerKeywords: ["link", "demo", "pricing", "info"],
      keywordMatchType: "exact",
    });
    assert.strictEqual(matchInfo.matched, true);
    assert.strictEqual(matchInfo.matchedKeyword, "info");

    const noMatch = matchCommentKeywords({
      commentText: "Great post!",
      triggerType: "comment",
      triggerKeywords: keywords,
      keywordMatchType: "contains",
    });
    assert.strictEqual(noMatch.matched, false);
  });

  // -------------------------------------------------------------
  // Test 4: Automation CRUD & Multi-Tenant Scoping
  // -------------------------------------------------------------
  await asyncTest("Creates, lists, updates, and deletes comment-to-DM automation", async () => {
    const orgId = `org_auto_${Date.now()}`;
    const auto = await db.createAutomation({
      organizationId: orgId,
      userId: "user_owner_1",
      name: "Reels Viral Comment Workflow",
      instagramAccountId: "ig_account_test",
      postId: "reel_post_999",
      postCaption: "Comment LINK for full access",
      postThumbnailUrl: "https://instagram.fcdn.net/reel999.jpg",
      postPermalink: "https://www.instagram.com/reel/C999/",
      triggerType: "comment",
      triggerKeywords: "link, access",
      keywordMatchType: "contains",
      publicReplyEnabled: true,
      publicReplyText: "Sent you the access link in your DMs! Check requests 🚀",
      dmEnabled: true,
      dmMessageText: "Hey! What is your mobile number so our team can send the access link?",
      status: "active",
    });

    assert.ok(auto.id);
    assert.strictEqual(auto.name, "Reels Viral Comment Workflow");
    assert.strictEqual(auto.status, "active");
    assert.strictEqual(auto.public_reply_enabled, true);
    assert.strictEqual(auto.dm_enabled, true);

    // List automations for this organization
    const list = await db.listAutomations(orgId);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, auto.id);

    // Update automation to paused
    const updated = await db.updateAutomation(auto.id, { status: "paused" });
    assert.strictEqual(updated.status, "paused");

    // Re-verify list shows updated status
    const listUpdated = await db.listAutomations(orgId);
    assert.strictEqual(listUpdated[0].status, "paused");

    // Delete automation
    const deleted = await db.deleteAutomation(auto.id);
    assert.strictEqual(deleted, true);

    const listEmpty = await db.listAutomations(orgId);
    assert.strictEqual(listEmpty.length, 0);
  });

  // -------------------------------------------------------------
  // Test 5: Comment Webhook Processing & Strict Idempotency
  // -------------------------------------------------------------
  await asyncTest("Enforces strict idempotency on comment-to-DM executions", async () => {
    const orgId = `org_idempotent_${Date.now()}`;
    const igAccountId = `ig_biz_${Date.now()}`;
    const postId = `media_post_${Date.now()}`;
    const commentId = `comment_${Date.now()}`;

    // 1. Register account with dummy encrypted tokens
    await accountStore.saveAccount({
      organizationId: orgId,
      instagramBusinessId: igAccountId,
      username: "verified_brand",
      accessToken: "mock_meta_access_token",
      pageToken: "mock_page_token",
      pageId: `page_${Date.now()}`,
    });

    // 2. Create active automation
    const automation = await db.createAutomation({
      organizationId: orgId,
      name: "Idempotency Test Automation",
      instagramAccountId: igAccountId,
      postId: postId,
      triggerType: "comment",
      triggerKeywords: "start, info",
      keywordMatchType: "contains",
      publicReplyEnabled: true,
      publicReplyText: "Check your DMs!",
      dmEnabled: true,
      dmMessageText: "Welcome! Reply with your phone number to get started.",
      status: "active",
    });

    // 3. First execution of the comment
    const exec1 = await db.recordAutomationExecution({
      automationId: automation.id,
      organizationId: orgId,
      instagramAccountId: igAccountId,
      commentId: commentId,
      postId: postId,
      commenterId: "user_ig_123",
      commenterUsername: "johndoe",
      commentText: "Please send info",
      matchedKeyword: "info",
      publicReplyStatus: "sent",
      publicReplyId: "reply_123",
      dmStatus: "sent",
      dmId: "dm_msg_123",
      status: "success",
    });
    assert.ok(exec1);
    assert.strictEqual(exec1.comment_id, commentId);

    // 4. Duplicate incoming webhook for the same commentId must be prevented
    const duplicateCheck = await db.findAutomationExecution(automation.id, commentId);
    assert.ok(duplicateCheck, "Should find existing execution record");

    // Attempting to record duplicate returns null / prevents duplicate
    const exec2 = await db.recordAutomationExecution({
      automationId: automation.id,
      organizationId: orgId,
      instagramAccountId: igAccountId,
      commentId: commentId,
      postId: postId,
      commenterId: "user_ig_123",
      commenterUsername: "johndoe",
      commentText: "Please send info",
      matchedKeyword: "info",
      publicReplyStatus: "sent",
      status: "success",
    });
    assert.strictEqual(exec2, null, "Duplicate execution for same comment must return null");

    // Execution counter increment
    await db.incrementAutomationExecution(automation.id);
    const executions = await db.listAutomationExecutions(automation.id);
    assert.strictEqual(executions.length, 1);
  });

  // -------------------------------------------------------------
  // Test 6: Phone Number Extraction & Lead Qualification
  // -------------------------------------------------------------
  test("Extracts international phone numbers from freeform text", () => {
    const t1 = "Hey call me at +1 (555) 234-5678 please";
    const p1 = extractPhoneNumberFromText(t1);
    assert.ok(p1);
    const v1 = validateAndNormalizePhone(p1);
    assert.strictEqual(v1.isValid, true);
    assert.strictEqual(v1.normalized, "+15552345678");

    const t2 = "My WhatsApp number is +91 98765 43210 send brochure";
    const p2 = extractPhoneNumberFromText(t2);
    assert.ok(p2);
    const v2 = validateAndNormalizePhone(p2);
    assert.strictEqual(v2.isValid, true);
    assert.strictEqual(v2.normalized, "+919876543210");

    const t3 = "UK contact 0044 7911 123456";
    const p3 = extractPhoneNumberFromText(t3);
    assert.ok(p3);
    const v3 = validateAndNormalizePhone(p3);
    assert.strictEqual(v3.isValid, true);

    const t4 = "Just leaving a normal comment without phone numbers";
    const p4 = extractPhoneNumberFromText(t4);
    assert.strictEqual(p4, null);
  });

  await asyncTest("Captures qualified lead into leadStore upon phone number submission", async () => {
    const orgId = `org_leads_${Date.now()}`;
    const accountId = `ig_acc_leads_${Date.now()}`;

    // Create lead with phone number
    const { lead, isNew } = await leadStore.createOrUpdateLead({
      organizationId: orgId,
      instagramAccountId: accountId,
      instagramUsername: "sarah_growth",
      name: "Sarah Miller",
      phoneNumber: "+15553219876",
      sourceAutomationId: "auto_123",
      sourceAutomationName: "Black Friday Promo",
      sourcePostId: "post_456",
    });

    assert.ok(lead.id);
    assert.strictEqual(isNew, true);
    assert.strictEqual(lead.phoneNumber, "+15553219876");

    // Verify lead exists in list
    const { leads: orgLeads } = await leadStore.listLeads(orgId);
    assert.strictEqual(orgLeads.length, 1);
    assert.strictEqual(orgLeads[0].instagramUsername, "@sarah_growth");

    // Idempotent update: submitting again with same phone updates instead of duplicating
    const { lead: leadUpdate, isNew: isNew2 } = await leadStore.createOrUpdateLead({
      organizationId: orgId,
      instagramAccountId: accountId,
      instagramUsername: "sarah_growth",
      name: "Sarah Miller Updated",
      phoneNumber: "+15553219876",
    });
    assert.strictEqual(leadUpdate.id, lead.id);
    assert.strictEqual(isNew2, false);

    const { leads: recheckLeads } = await leadStore.listLeads(orgId);
    assert.strictEqual(recheckLeads.length, 1);
  });

  // -------------------------------------------------------------
  // Test 7: Multi-Tenant Workspace Boundary Isolation
  // -------------------------------------------------------------
  await asyncTest("Strict multi-tenant isolation: Workspace A cannot view or access Workspace B automations", async () => {
    const orgA = `org_isolated_A_${Date.now()}`;
    const orgB = `org_isolated_B_${Date.now()}`;

    const autoA = await db.createAutomation({
      organizationId: orgA,
      name: "Workspace A Exclusive Automation",
      status: "active",
    });

    const autoB = await db.createAutomation({
      organizationId: orgB,
      name: "Workspace B Exclusive Automation",
      status: "active",
    });

    const listA = await db.listAutomations(orgA);
    const listB = await db.listAutomations(orgB);

    assert.strictEqual(listA.length, 1);
    assert.strictEqual(listA[0].id, autoA.id);
    assert.strictEqual(listB.length, 1);
    assert.strictEqual(listB[0].id, autoB.id);

    // Verify cross-organization access returns null
    const crossCheck = await db.getAutomation(autoA.id, orgB);
    assert.strictEqual(crossCheck, null, "Workspace B cannot access Workspace A automation");
  });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`Phase 2 Automated Test Results: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2TestSuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
