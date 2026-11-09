import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";

export async function GET(req, { params }) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Automation ID is required." }, { status: 400 });
  }

  try {
    const automation = await db.findAutomationById(id);
    if (!automation) {
      return NextResponse.json({ error: "Automation not found." }, { status: 404 });
    }

    // Organization-level boundary check
    if (automation.organization_id !== session.organizationId && !session.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: You do not own this automation." }, { status: 403 });
    }

    const [executions, accounts] = await Promise.all([
      db.listAutomationExecutions(id, { limit: 50 }),
      accountStore.listAccounts(automation.organization_id),
    ]);

    const account = accounts.find(
      (a) =>
        a.id === automation.instagram_account_id ||
        a.instagramBusinessId === automation.instagram_account_id
    );

    return NextResponse.json({
      success: true,
      automation: {
        id: automation.id,
        name: automation.name,
        organizationId: automation.organization_id,
        instagramAccountId: automation.instagram_account_id,
        instagramUsername: account?.username || null,
        accountProfilePicture: account?.profilePictureUrl || null,
        postId: automation.post_id,
        postCaption: automation.post_caption,
        postThumbnailUrl: automation.post_thumbnail_url,
        postPermalink: automation.post_permalink,
        triggerType: automation.trigger_type,
        triggerKeywords: automation.trigger_keywords ? automation.trigger_keywords.split(",") : [],
        keywordMatchType: automation.keyword_match_type || "contains",
        publicReplyEnabled: Boolean(automation.public_reply_enabled),
        publicReplyText: automation.public_reply_text,
        dmEnabled: Boolean(automation.dm_enabled),
        dmMessageText: automation.dm_message_text,
        status: automation.status || "active",
        executionCount: automation.execution_count || 0,
        lastExecutedAt: automation.last_executed_at || null,
        createdAt: automation.created_at,
        updatedAt: automation.updated_at,
      },
      executions,
    });
  } catch (err) {
    console.error("[AutomationsDetailAPI] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Automation ID is required." }, { status: 400 });
  }

  try {
    const existing = await db.findAutomationById(id);
    if (!existing) {
      return NextResponse.json({ error: "Automation not found." }, { status: 404 });
    }

    if (existing.organization_id !== session.organizationId && !session.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: You do not own this automation." }, { status: 403 });
    }

    const body = await req.json();
    const updates = {};

    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.status !== undefined) updates.status = body.status === "active" ? "active" : "paused";
    if (body.publicReplyEnabled !== undefined) updates.public_reply_enabled = Boolean(body.publicReplyEnabled);
    if (body.publicReplyText !== undefined) updates.public_reply_text = String(body.publicReplyText).trim();
    if (body.dmEnabled !== undefined) updates.dm_enabled = Boolean(body.dmEnabled);
    if (body.dmMessageText !== undefined) updates.dm_message_text = String(body.dmMessageText).trim();
    if (body.triggerType !== undefined) updates.trigger_type = body.triggerType;
    if (body.keywordMatchType !== undefined) updates.keyword_match_type = body.keywordMatchType;

    if (body.triggerKeywords !== undefined) {
      updates.trigger_keywords = Array.isArray(body.triggerKeywords)
        ? body.triggerKeywords.map((k) => k.trim()).filter(Boolean).join(",")
        : String(body.triggerKeywords).trim();
    }

    const updated = await db.updateAutomation(id, updates);

    return NextResponse.json({
      success: true,
      automation: updated,
      message: "Automation updated successfully.",
    });
  } catch (err) {
    console.error("[AutomationsUpdateAPI] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Automation ID is required." }, { status: 400 });
  }

  try {
    const existing = await db.findAutomationById(id);
    if (!existing) {
      return NextResponse.json({ error: "Automation not found." }, { status: 404 });
    }

    if (existing.organization_id !== session.organizationId && !session.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: You do not own this automation." }, { status: 403 });
    }

    await db.deleteAutomation(id);

    return NextResponse.json({
      success: true,
      message: "Automation deleted successfully.",
    });
  } catch (err) {
    console.error("[AutomationsDeleteAPI] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

