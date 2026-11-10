import { db } from "../db/client.js";
import { accountStore } from "../storage/account-store.js";
import { leadStore } from "../storage/lead-store.js";
import { validateAndNormalizePhone } from "../validations/phone.js";
import {
  replyToInstagramComment,
  sendInstagramPrivateReply,
  sendInstagramDirectMessage,
  replyToFacebookComment,
  sendFacebookPrivateReply,
  sendFacebookDirectMessage,
} from "./client.js";

/**
 * Evaluates whether a comment satisfies an automation's trigger conditions.
 * Supports:
 * - Any comment (Option A)
 * - Specific keyword (Option B)
 * - Multiple keywords (Option C) with exact or contains matching (case-insensitive)
 */
export function matchCommentKeywords({
  commentText = "",
  triggerType = "comment",
  triggerKeywords = null,
  keywordMatchType = "contains",
}) {
  const normalizedText = String(commentText || "").trim().toLowerCase();

  // If trigger type is 'any' or no keywords are specified, always matches
  if (triggerType === "any" || !triggerKeywords) {
    return { matched: true, matchedKeyword: "ANY_COMMENT" };
  }

  // Parse keywords list (supports string or array)
  const keywordsList = (Array.isArray(triggerKeywords)
    ? triggerKeywords
    : String(triggerKeywords).split(",")
  )
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  if (keywordsList.length === 0) {
    return { matched: true, matchedKeyword: "ANY_COMMENT" };
  }

  for (const kw of keywordsList) {
    if (keywordMatchType === "exact") {
      // Exact match: either exact string or isolated word boundary
      const exactRegex = new RegExp(`(^|\\s|[.,!?;])${escapeRegExp(kw)}($|\\s|[.,!?;])`, "i");
      if (exactRegex.test(normalizedText) || normalizedText === kw) {
        return { matched: true, matchedKeyword: kw };
      }
    } else {
      // Default: contains matching
      if (normalizedText.includes(kw)) {
        return { matched: true, matchedKeyword: kw };
      }
    }
  }

  return { matched: false, matchedKeyword: null };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts a candidate phone number string from freeform message or comment text.
 */
export function extractPhoneNumberFromText(text) {
  if (!text || typeof text !== "string") return null;

  // Matches international phone patterns: e.g. +1 (555) 123-4567, +91 9876543210, 0044 7911 123456, etc.
  const phoneRegex = /(?:(?:\+|00)\d{1,4}[-.\s]?)?(?:\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}\b/g;
  const matches = text.match(phoneRegex);

  if (matches && matches.length > 0) {
    for (const match of matches) {
      const cleaned = match.replace(/[^\d+]/g, "");
      if (cleaned.replace(/\D/g, "").length >= 7 && cleaned.replace(/\D/g, "").length <= 15) {
        return match.trim();
      }
    }
  }

  return null;
}

/**
 * Processes an incoming Instagram or Facebook comment webhook event:
 * 1. Finds target account (matching Instagram business ID or Facebook page ID).
 * 2. Matches active automations for the post/media and platform.
 * 3. Enforces strict idempotency (same comment never triggers same automation twice).
 * 4. Executes Public Reply and/or Private DM via platform-specific Meta API.
 * 5. Checks for volunteered phone numbers to capture qualified leads.
 */
export async function processIncomingComment({
  commentId,
  postId,
  text,
  commenterId,
  commenterUsername,
  accountId,
  platform,
}) {
  if (!commentId) return { processed: 0, reason: "missing_comment_id" };

  const allAccounts = await accountStore.listAllAccounts();
  const account = allAccounts.find(
    (a) =>
      a.id === accountId ||
      a.instagramBusinessId === accountId ||
      a.pageId === accountId ||
      (platform === "facebook" && String(a.facebookPageId || a.pageId) === String(accountId))
  );

  if (!account || !account.organizationId) {
    return { processed: 0, reason: "account_not_found" };
  }

  const effectivePlatform = platform || account.platform || "instagram";
  const organizationId = account.organizationId;
  const automations = await db.listAutomations(organizationId);

  // Filter automations active for this account, platform and post
  const eligibleAutomations = automations.filter((auto) => {
    if (auto.status !== "active") return false;

    // Check platform alignment
    if (auto.platform && auto.platform !== "all" && auto.platform !== effectivePlatform) {
      return false;
    }

    // Check account alignment if specified
    if (auto.account_id && auto.account_id !== account.id) {
      return false;
    }
    if (
      auto.instagram_account_id &&
      auto.instagram_account_id !== account.id &&
      auto.instagram_account_id !== account.instagramBusinessId
    ) {
      return false;
    }

    // Check post alignment: matches specific post ID or is configured for any post
    if (auto.post_id && postId && String(auto.post_id) !== String(postId)) {
      return false;
    }

    return true;
  });

  if (eligibleAutomations.length === 0) {
    return { processed: 0, reason: "no_matching_automations" };
  }

  let executedCount = 0;

  for (const auto of eligibleAutomations) {
    // 1. Idempotency Check
    const alreadyExecuted = await db.findAutomationExecution(auto.id, commentId);
    if (alreadyExecuted) {
      continue;
    }

    // 2. Keyword Condition Evaluation
    const keywordEvaluation = matchCommentKeywords({
      commentText: text,
      triggerType: auto.trigger_type,
      triggerKeywords: auto.trigger_keywords || auto.trigger_keyword,
      keywordMatchType: auto.keyword_match_type || "contains",
    });

    if (!keywordEvaluation.matched) {
      continue;
    }

    // 3. Decrypt Access Tokens
    let tokens = null;
    try {
      tokens = await accountStore.getDecryptedTokens(organizationId, account.id);
    } catch (err) {
      console.error("[AutomationRunner] Failed to decrypt tokens for account:", err.message);
    }

    if (!tokens || (!tokens.pageToken && !tokens.accessToken)) {
      await db.recordAutomationExecution({
        automationId: auto.id,
        organizationId,
        platform: effectivePlatform,
        accountId: account.id,
        instagramAccountId: account.id,
        commentId,
        postId,
        commenterId,
        commenterUsername,
        commentText: text,
        matchedKeyword: keywordEvaluation.matchedKeyword,
        status: "failed",
        errorMessage: "Missing or invalid Meta access tokens",
      });
      continue;
    }

    const effectiveToken = tokens.pageToken || tokens.accessToken;
    let publicReplyStatus = "skipped";
    let publicReplyId = null;
    let dmStatus = "skipped";
    let dmId = null;
    let executionError = null;

    // 4. Execute Public Comment Reply (if configured and enabled)
    if (auto.public_reply_enabled && auto.public_reply_text) {
      try {
        if (effectivePlatform === "facebook") {
          const replyRes = await replyToFacebookComment({
            commentId,
            message: auto.public_reply_text,
            pageAccessToken: effectiveToken,
          });
          publicReplyStatus = "sent";
          publicReplyId = replyRes.id || null;
        } else {
          const replyRes = await replyToInstagramComment({
            commentId,
            message: auto.public_reply_text,
            accessToken: effectiveToken,
          });
          publicReplyStatus = "sent";
          publicReplyId = replyRes.id || null;
        }
      } catch (pubErr) {
        publicReplyStatus = "failed";
        executionError = `Public reply failed: ${pubErr.message}`;
        console.error(`[AutomationRunner] [${effectivePlatform}] Public reply error:`, pubErr.message);
      }
    }

    // 5. Execute Private DM Reply (if configured and enabled)
    if (auto.dm_enabled && (auto.dm_message_text || auto.dm_text)) {
      const dmText = auto.dm_message_text || auto.dm_text;
      try {
        if (effectivePlatform === "facebook") {
          const dmRes = await sendFacebookPrivateReply({
            commentId,
            message: dmText,
            pageAccessToken: effectiveToken,
            pageId: account.pageId || account.facebookPageId || account.id,
          });
          dmStatus = "sent";
          dmId = dmRes.messageId || null;
        } else {
          const dmRes = await sendInstagramPrivateReply({
            commentId,
            message: dmText,
            accessToken: effectiveToken,
            pageId: account.pageId,
            instagramAccountId: account.instagramBusinessId,
          });
          dmStatus = "sent";
          dmId = dmRes.messageId || null;
        }
      } catch (dmErr) {
        dmStatus = "failed";
        const msg = `Private DM failed: ${dmErr.message}`;
        executionError = executionError ? `${executionError} | ${msg}` : msg;
        console.error(`[AutomationRunner] [${effectivePlatform}] Private DM error:`, dmErr.message);
      }
    }

    // 6. Record Execution Record (Idempotent Guard)
    const overallStatus =
      publicReplyStatus === "failed" && dmStatus === "failed"
        ? "failed"
        : publicReplyStatus === "failed" || dmStatus === "failed"
        ? "partial"
        : "success";

    await db.recordAutomationExecution({
      automationId: auto.id,
      organizationId,
      platform: effectivePlatform,
      accountId: account.id,
      instagramAccountId: account.id,
      commentId,
      postId,
      commenterId,
      commenterUsername,
      commentText: text,
      matchedKeyword: keywordEvaluation.matchedKeyword,
      publicReplyStatus,
      publicReplyId,
      dmStatus,
      dmId,
      status: overallStatus,
      errorMessage: executionError,
    });

    // 7. Increment execution counter
    await db.incrementAutomationExecution(auto.id);
    executedCount++;

    // 8. Lead Capture: If commenter provided phone number in the comment itself
    const candidatePhone = extractPhoneNumberFromText(text);
    if (candidatePhone) {
      const validation = validateAndNormalizePhone(candidatePhone);
      if (validation.isValid) {
        try {
          await leadStore.createOrUpdateLead({
            organizationId,
            platform: effectivePlatform,
            accountId: account.id,
            instagramAccountId: account.id,
            instagramUsername: commenterUsername || commenterId,
            name: commenterUsername || (effectivePlatform === "facebook" ? "Facebook Commenter" : "Instagram Commenter"),
            phoneNumber: validation.normalized,
            sourceAutomationId: auto.id,
            sourceAutomationName: auto.name,
            sourcePostId: postId,
            sourcePostCaption: auto.post_caption,
          });
        } catch (leadErr) {
          console.warn("[AutomationRunner] Lead creation note:", leadErr.message);
        }
      }
    }
  }

  return { processed: executedCount };
}

/**
 * Processes an incoming Direct Message webhook event (Instagram DM or Facebook Messenger):
 * Inspects message text for customer requirement submissions and voluntary phone numbers.
 * When a valid phone number is found, captures a qualified lead into leadStore and captured_leads.
 */
export async function processIncomingMessage({
  mid,
  senderId,
  recipientId,
  text,
  accountId,
  platform,
}) {
  if (!text) return { leadCaptured: false };

  const candidatePhone = extractPhoneNumberFromText(text);
  if (!candidatePhone) return { leadCaptured: false };

  const validation = validateAndNormalizePhone(candidatePhone);
  if (!validation.isValid) return { leadCaptured: false };

  const allAccounts = await accountStore.listAllAccounts();
  const account = allAccounts.find(
    (a) =>
      a.id === accountId ||
      a.instagramBusinessId === accountId ||
      a.pageId === accountId ||
      a.id === recipientId ||
      a.instagramBusinessId === recipientId ||
      (platform === "facebook" && String(a.facebookPageId || a.pageId) === String(accountId || recipientId))
  );

  if (!account || !account.organizationId) {
    return { leadCaptured: false, reason: "account_not_found" };
  }

  const effectivePlatform = platform || account.platform || "instagram";
  const organizationId = account.organizationId;

  try {
    const leadResult = await leadStore.createOrUpdateLead({
      organizationId,
      platform: effectivePlatform,
      accountId: account.id,
      instagramAccountId: account.id,
      instagramUsername: senderId,
      name: `${effectivePlatform === "facebook" ? "Facebook" : "Instagram"} User (${senderId.substring(0, 8)})`,
      phoneNumber: validation.normalized,
      conversationId: `conv_${senderId}`,
    });
    const leadRecord = leadResult?.lead || leadResult;

    console.log(
      JSON.stringify({
        level: "info",
        service: "AutomationRunner",
        action: "lead_captured_from_dm",
        organizationId,
        platform: effectivePlatform,
        leadId: leadRecord.id,
        phoneMasked: `${validation.normalized.slice(0, 4)}***${validation.normalized.slice(-2)}`,
      })
    );

    return { leadCaptured: true, leadId: leadRecord.id };
  } catch (err) {
    console.error("[AutomationRunner] Error capturing lead from DM:", err.message);
    return { leadCaptured: false, error: err.message };
  }
}
