import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { accountStore } from "@/lib/storage/account-store";
import { db } from "@/lib/db/client";
import { fetchInstagramMedia, fetchFacebookPagePosts, MetaGraphError } from "@/lib/meta/client";

export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const afterCursor = searchParams.get("after") || null;
  const forceRefresh = searchParams.get("refresh") === "true";
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));

  const organizationId = session.organizationId;
  if (!organizationId && !session.isSuperAdmin) {
    return NextResponse.json({ error: "No active workspace found." }, { status: 400 });
  }

  try {
    // 1. Find account belonging to user's workspace
    const accounts = await accountStore.listAccounts(organizationId);
    let account = accounts.find(
      (a) => a.id === accountId || a.instagramBusinessId === accountId
    );

    // If super admin and not found in org, allow super admin inspection
    if (!account && session.isSuperAdmin && accountId) {
      const allAccounts = await accountStore.listAllAccounts();
      account = allAccounts.find(
        (a) => a.id === accountId || a.instagramBusinessId === accountId
      );
    }

    if (!account) {
      return NextResponse.json(
        { error: "Instagram account not found in current workspace." },
        { status: 404 }
      );
    }

    const effectiveOrgId = account.organizationId || organizationId;
    const targetInstagramBusinessId = account.instagramBusinessId || account.id;

    // 2. If not forcing refresh and no cursor, check cached media in database
    if (!forceRefresh && !afterCursor) {
      const cached = await db.listInstagramMedia(account.id, { limit, offset: 0 });
      if (cached && cached.length > 0) {
        return NextResponse.json({
          success: true,
          fromCache: true,
          media: cached.map((m) => ({
            id: m.media_id,
            mediaType: m.media_type,
            caption: m.caption,
            thumbnailUrl: m.thumbnail_url,
            mediaUrl: m.media_url,
            permalink: m.permalink,
            publishedAt: m.published_at,
          })),
          account: {
            id: account.id,
            username: account.username,
            name: account.name,
            profilePictureUrl: account.profilePictureUrl,
            status: account.status,
          },
          paging: null,
        });
      }
    }

    // 3. Decrypt tokens to query Meta Graph API
    const tokens = await accountStore.getDecryptedTokens(effectiveOrgId, account.id);
    if (!tokens || (!tokens.pageToken && !tokens.accessToken)) {
      return NextResponse.json(
        { error: `${account.platform === "facebook" ? "Facebook Page" : "Instagram"} access tokens are missing or invalid. Please reconnect the account.` },
        { status: 400 }
      );
    }

    const effectiveToken = tokens.pageToken || tokens.accessToken;
    const isFacebook = account.platform === "facebook";

    // 4. Fetch actual media from Meta Graph API (Instagram media or Facebook Page posts)
    const result = isFacebook
      ? await fetchFacebookPagePosts({
          pageId: account.pageId || account.id,
          pageAccessToken: effectiveToken,
          after: afterCursor,
          limit,
        })
      : await fetchInstagramMedia({
          instagramAccountId: targetInstagramBusinessId,
          accessToken: effectiveToken,
          after: afterCursor,
          limit,
        });

    // 5. Cache media records in database
    if (result.data && result.data.length > 0) {
      await db.saveInstagramMedia(result.data, effectiveOrgId, account.id);
    }

    return NextResponse.json({
      success: true,
      fromCache: false,
      media: result.data,
      paging: result.paging,
      account: {
        id: account.id,
        platform: account.platform || "instagram",
        username: account.username,
        name: account.name,
        profilePictureUrl: account.profilePictureUrl,
        status: account.status,
      },
    });
  } catch (err) {
    console.error("[InstagramMediaAPI] Error:", err.message);

    // If Meta token expired or permission revoked
    if (err instanceof MetaGraphError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          subcode: err.subcode,
          isMetaError: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

