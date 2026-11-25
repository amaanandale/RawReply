import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { accountStore } from "@/lib/storage/account-store";
import {
  subscribeInstagramAccountToWebhooks,
  subscribePageToWebhooks,
} from "@/lib/meta/client";

export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Organization context missing" }, { status: 400 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    // optional body
  }

  const accountId = body.accountId;
  try {
    const accounts = await accountStore.listAccounts(organizationId);
    const targetAccount = accountId
      ? accounts.find(
          (a) =>
            String(a.id) === String(accountId) ||
            String(a.instagramBusinessId) === String(accountId)
        )
      : accounts[0];

    if (!targetAccount) {
      return NextResponse.json(
        { error: "No connected account found to subscribe." },
        { status: 404 }
      );
    }

    const tokens = await accountStore.getDecryptedTokens(organizationId, targetAccount.id);
    if (!tokens || (!tokens.pageToken && !tokens.accessToken)) {
      return NextResponse.json(
        { error: "No access tokens available. Please reconnect the account." },
        { status: 400 }
      );
    }

    const results = [];
    const isFacebook = targetAccount.platform === "facebook";

    if (isFacebook) {
      const pageId = targetAccount.pageId || targetAccount.id;
      const pageToken = tokens.pageToken || tokens.accessToken;
      if (pageId && pageToken) {
        const pageRes = await subscribePageToWebhooks({
          pageId,
          pageAccessToken: pageToken,
        });
        results.push({ target: "facebook_page", status: pageRes ? "subscribed" : "failed" });
      }
    } else {
      // Instagram Professional account
      const igBusinessId = targetAccount.instagramBusinessId || targetAccount.id;
      const effectiveToken = tokens.accessToken || tokens.pageToken;

      if (igBusinessId && effectiveToken) {
        const igRes = await subscribeInstagramAccountToWebhooks({
          instagramBusinessId: igBusinessId,
          accessToken: effectiveToken,
        });
        results.push({ target: "instagram_account", status: igRes ? "subscribed" : "failed" });
      }

      // If attached to a Facebook Page, also subscribe page webhooks
      if (targetAccount.pageId && tokens.pageToken) {
        try {
          const pageRes = await subscribePageToWebhooks({
            pageId: targetAccount.pageId,
            pageAccessToken: tokens.pageToken,
          });
          results.push({ target: "attached_facebook_page", status: pageRes ? "subscribed" : "failed" });
        } catch {
          // non-critical
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook subscriptions verified successfully with Meta Graph API.",
      account: {
        id: targetAccount.id,
        username: targetAccount.username,
        platform: targetAccount.platform,
      },
      results,
    });
  } catch (err) {
    console.error("[SubscribeWebhooksAPI] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
