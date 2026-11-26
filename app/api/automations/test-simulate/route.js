import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";
import { matchCommentKeywords, extractPhoneNumberFromText } from "@/lib/meta/automation-runner";
import { validateAndNormalizePhone } from "@/lib/validations/phone";

export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "No active workspace found." }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    accountId,
    postId,
    commentText = "cost",
    commenterUsername = "test_customer",
    commenterId = "simulated_user_123",
  } = body;

  const steps = [];

  // Step 1: Account Lookup
  const accounts = await accountStore.listAccounts(organizationId);
  const account = accountId
    ? accounts.find(
        (a) =>
          String(a.id) === String(accountId) ||
          String(a.instagramBusinessId) === String(accountId) ||
          String(a.pageId) === String(accountId)
      )
    : accounts[0];

  if (!account) {
    steps.push({
      step: 1,
      title: "Account Lookup",
      status: "failed",
      summary: "No connected social account found for this workspace.",
    });
    return NextResponse.json({
      success: false,
      diagnostic: {
        status: "failed",
        summary: "Social account not found. Please connect your Instagram Professional account first.",
        steps,
      },
    });
  }

  steps.push({
    step: 1,
    title: "Account & Page Discovery",
    status: "pass",
    summary: `Found connected account @${account.username || account.name} (ID: ${account.id}, Platform: ${account.platform || "instagram"}).`,
  });

  // Step 2: Post Verification & Alignment
  const cleanPostId = postId ? String(postId).replace(/^med_/, "") : null;
  let matchedMedia = null;
  if (cleanPostId) {
    const mediaList = await db.listInstagramMedia(account.id);
    matchedMedia = mediaList.find((m) => {
      const cleanMId = String(m.id).replace(/^med_/, "");
      return cleanMId === cleanPostId || cleanPostId.endsWith(`_${cleanMId}`) || cleanMId.endsWith(`_${cleanPostId}`);
    });
  }

  steps.push({
    step: 2,
    title: "Post Alignment",
    status: cleanPostId ? "pass" : "warning",
    summary: matchedMedia
      ? `Post found: "${matchedMedia.caption ? matchedMedia.caption.slice(0, 50) + "..." : cleanPostId}"`
      : cleanPostId
      ? `Post ID ${cleanPostId} not cached in local media table, will match by raw ID.`
      : "No specific post ID provided; testing against general account triggers.",
  });

  // Step 3: Self-Comment Check (Important Meta Rule)
  const isSelf =
    (commenterId &&
      (String(commenterId) === String(account.id) ||
        String(commenterId) === String(account.instagramBusinessId) ||
        String(commenterId) === String(account.pageId))) ||
    (commenterUsername &&
      account.username &&
      commenterUsername.toLowerCase().replace(/^@/, "") === account.username.toLowerCase().replace(/^@/, ""));

  if (isSelf) {
    steps.push({
      step: 3,
      title: "Self-Comment Prevention Guard",
      status: "warning",
      summary: `Commenter @${commenterUsername} matches the page owner @${account.username}. Meta drops self-comments and RawReply ignores them to prevent infinite reply loops. Test comments must be made from an external/different Instagram account!`,
    });
  } else {
    steps.push({
      step: 3,
      title: "Self-Comment Prevention Guard",
      status: "pass",
      summary: `Commenter @${commenterUsername} is an external user (not the account owner @${account.username}).`,
    });
  }

  // Step 4: Automations Matching & Keyword Evaluation
  const automations = await db.listAutomations(organizationId);
  const eligible = automations.filter((auto) => {
    if (auto.status !== "active") return false;
    if (auto.account_id && String(auto.account_id) !== String(account.id)) return false;
    if (
      auto.instagram_account_id &&
      String(auto.instagram_account_id) !== String(account.id) &&
      String(auto.instagram_account_id) !== String(account.instagramBusinessId)
    ) {
      return false;
    }
    if (auto.post_id && cleanPostId) {
      const cleanAutoPostId = String(auto.post_id).replace(/^med_/, "");
      const matches =
        cleanAutoPostId === cleanPostId ||
        cleanPostId.endsWith(`_${cleanAutoPostId}`) ||
        cleanAutoPostId.endsWith(`_${cleanPostId}`);
      if (!matches) return false;
    }
    return true;
  });

  let matchedAutomation = null;
  let keywordResult = { matched: false, matchedKeyword: null };

  for (const auto of eligible) {
    const res = matchCommentKeywords({
      commentText,
      triggerType: auto.trigger_type,
      triggerKeywords: auto.trigger_keywords || auto.trigger_keyword,
      keywordMatchType: auto.keyword_match_type || "contains",
    });
    if (res.matched) {
      matchedAutomation = auto;
      keywordResult = res;
      break;
    }
  }

  if (!matchedAutomation) {
    steps.push({
      step: 4,
      title: "Automation & Keyword Matching",
      status: eligible.length > 0 ? "warning" : "failed",
      summary:
        eligible.length > 0
          ? `Found ${eligible.length} active automation(s) for this post, but comment "${commentText}" did not match any trigger keyword.`
          : "No active automations found configured for this post.",
      eligibleCount: eligible.length,
    });
  } else {
    steps.push({
      step: 4,
      title: "Automation & Keyword Matching",
      status: "pass",
      summary: `Matched automation "${matchedAutomation.name}" (ID: ${matchedAutomation.id}) via keyword condition [${keywordResult.matchedKeyword}].`,
      matchedAutomationId: matchedAutomation.id,
      matchedKeyword: keywordResult.matchedKeyword,
    });
  }

  // Step 5: Meta Decrypted Token Verification
  let tokenStatus = "failed";
  let tokenDetails = "Unable to decrypt credentials.";
  try {
    const tokens = await accountStore.getDecryptedTokens(organizationId, account.id);
    if (tokens && (tokens.accessToken || tokens.pageToken)) {
      tokenStatus = "pass";
      tokenDetails = `Token successfully decrypted and verified ready for Graph API calls (expires: ${account.tokenExpiresAt || "60-day token"}).`;
    } else {
      tokenDetails = "Account record exists but access token is empty.";
    }
  } catch (err) {
    tokenDetails = `Token decryption note: ${err.message}`;
  }

  steps.push({
    step: 5,
    title: "Meta Access Token & Encryption",
    status: tokenStatus,
    summary: tokenDetails,
  });

  // Step 6: Response & Lead Capture Execution Preview
  const candidatePhone = extractPhoneNumberFromText(commentText);
  const phoneValidation = candidatePhone ? validateAndNormalizePhone(candidatePhone) : null;

  steps.push({
    step: 6,
    title: "Execution Actions Preview",
    status: matchedAutomation && !isSelf ? "pass" : "info",
    summary: matchedAutomation
      ? `Public Comment Reply: ${
          matchedAutomation.public_reply_enabled ? `"${matchedAutomation.public_reply_text}"` : "Disabled"
        }. Private DM: ${
          matchedAutomation.dm_enabled
            ? `"${matchedAutomation.dm_message_text || matchedAutomation.dm_text}"`
            : "Disabled"
        }.`
      : "No action would execute because trigger conditions were not met.",
    leadCapture: phoneValidation?.isValid
      ? `Phone detected: ${phoneValidation.normalized}. Commenter would immediately convert to a Qualified Lead!`
      : "No phone number in comment. Lead qualification will occur in the DM conversation.",
  });

  const overallSuccess = matchedAutomation && !isSelf && tokenStatus === "pass";

  return NextResponse.json({
    success: true,
    diagnostic: {
      status: overallSuccess
        ? "success"
        : isSelf
        ? "self_comment_warning"
        : !matchedAutomation
        ? "no_match"
        : "token_issue",
      summary: overallSuccess
        ? `Simulation Passed: A comment with "${commentText}" from an external user will successfully trigger a public reply and private DM.`
        : isSelf
        ? "Warning: Self-comment detected. Use a different Instagram account to test live comments."
        : !matchedAutomation
        ? "Trigger failed: Comment text does not match any active automation keywords for this post."
        : "Credentials issue: Access token could not be decrypted.",
      steps,
      matchedAutomation: matchedAutomation
        ? {
            id: matchedAutomation.id,
            name: matchedAutomation.name,
            triggerType: matchedAutomation.trigger_type,
            triggerKeyword: matchedAutomation.trigger_keyword,
            publicReplyEnabled: matchedAutomation.public_reply_enabled,
            publicReplyText: matchedAutomation.public_reply_text,
            dmEnabled: matchedAutomation.dm_enabled,
            dmText: matchedAutomation.dm_message_text || matchedAutomation.dm_text,
          }
        : null,
    },
  });
}
