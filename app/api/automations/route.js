import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";

export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "No active workspace found." }, { status: 400 });
  }

  try {
    const [automations, accounts] = await Promise.all([
      db.listAutomations(organizationId),
      accountStore.listAccounts(organizationId),
    ]);

    const enriched = automations.map((a) => {
      const acc = accounts.find(
        (accItem) =>
          accItem.id === a.instagram_account_id ||
          accItem.instagramBusinessId === a.instagram_account_id
      );

      return {
        id: a.id,
        name: a.name,
        organizationId: a.organization_id,
        instagramAccountId: a.instagram_account_id,
        instagramUsername: acc?.username || null,
        accountProfilePicture: acc?.profilePictureUrl || null,
        postId: a.post_id,
        postCaption: a.post_caption,
        postThumbnailUrl: a.post_thumbnail_url,
        postPermalink: a.post_permalink,
        triggerType: a.trigger_type,
        triggerKeyword: a.trigger_keyword,
        triggerKeywords: a.trigger_keywords ? a.trigger_keywords.split(",") : [],
        keywordMatchType: a.keyword_match_type || "contains",
        publicReplyEnabled: Boolean(a.public_reply_enabled),
        publicReplyText: a.public_reply_text,
        dmEnabled: Boolean(a.dm_enabled),
        dmMessageText: a.dm_message_text,
        status: a.status || "active",
        executionCount: a.execution_count || 0,
        lastExecutedAt: a.last_executed_at || null,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      automations: enriched,
      total: enriched.length,
    });
  } catch (err) {
    console.error("[AutomationsAPI] Error listing automations:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "No active workspace found." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      name,
      instagramAccountId,
      postId,
      postCaption = null,
      postThumbnailUrl = null,
      postPermalink = null,
      triggerType = "any",
      triggerKeywords = [],
      keywordMatchType = "contains",
      publicReplyEnabled = true,
      publicReplyText = null,
      dmEnabled = true,
      dmMessageText = null,
    } = body;

    // 1. Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Automation name is required." }, { status: 400 });
    }

    if (!instagramAccountId) {
      return NextResponse.json({ error: "Please select an Instagram account." }, { status: 400 });
    }

    if (!postId) {
      return NextResponse.json({ error: "Please select an Instagram post or video." }, { status: 400 });
    }

    // Must enable at least one action (public reply or DM)
    if (!publicReplyEnabled && !dmEnabled) {
      return NextResponse.json(
        { error: "Please enable at least one automation action: Public Comment Reply or Private DM." },
        { status: 400 }
      );
    }

    if (publicReplyEnabled && (!publicReplyText || !publicReplyText.trim())) {
      return NextResponse.json(
        { error: "Public comment reply message cannot be empty when enabled." },
        { status: 400 }
      );
    }

    if (dmEnabled && (!dmMessageText || !dmMessageText.trim())) {
      return NextResponse.json(
        { error: "Private DM message cannot be empty when enabled." },
        { status: 400 }
      );
    }

    // Keyword validation if keyword trigger selected
    if (triggerType === "keyword" && (!triggerKeywords || (Array.isArray(triggerKeywords) && triggerKeywords.length === 0))) {
      return NextResponse.json(
        { error: "Please configure at least one trigger keyword when using keyword matching." },
        { status: 400 }
      );
    }

    // 2. Validate that the chosen Instagram account belongs to user's workspace
    const accounts = await accountStore.listAccounts(organizationId);
    const account = accounts.find(
      (a) => a.id === instagramAccountId || a.instagramBusinessId === instagramAccountId
    );

    if (!account) {
      return NextResponse.json(
        { error: "Selected Instagram account is not connected to this workspace." },
        { status: 404 }
      );
    }

    // 3. Format keywords
    const formattedKeywords = Array.isArray(triggerKeywords)
      ? triggerKeywords.map((k) => k.trim()).filter(Boolean).join(",")
      : (typeof triggerKeywords === "string" ? triggerKeywords.trim() : null);

    // 4. Save Automation
    const automation = await db.createAutomation({
      userId: session.user.id,
      organizationId,
      instagramAccountId: account.id,
      name: name.trim(),
      triggerType: triggerType === "keyword" ? "keyword" : "any",
      postId: String(postId),
      postCaption: postCaption ? String(postCaption).trim() : null,
      postThumbnailUrl: postThumbnailUrl || null,
      postPermalink: postPermalink || null,
      triggerKeyword: formattedKeywords ? formattedKeywords.split(",")[0] : null,
      triggerKeywords: formattedKeywords,
      keywordMatchType: keywordMatchType === "exact" ? "exact" : "contains",
      publicReplyEnabled: Boolean(publicReplyEnabled),
      publicReplyText: publicReplyEnabled ? publicReplyText.trim() : null,
      dmEnabled: Boolean(dmEnabled),
      dmMessageText: dmEnabled ? dmMessageText.trim() : null,
      status: "active",
    });

    return NextResponse.json({
      success: true,
      automation,
      message: "Automation published successfully and is now active.",
    });
  } catch (err) {
    console.error("[AutomationsAPI] Error creating automation:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
