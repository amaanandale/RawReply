import {
  META_API_VERSION,
  META_GRAPH_BASE_URL,
  META_OAUTH_TOKEN_URL,
  META_DEFAULT_APP_ID,
  META_DEFAULT_APP_SECRET,
  WEBHOOK_SUBSCRIBED_FIELDS,
} from "./constants.js";

/**
 * Standardized Meta Graph API error wrapper.
 */
export class MetaGraphError extends Error {
  constructor(message, status, code, subcode, type) {
    super(message);
    this.name = "MetaGraphError";
    this.status = status;
    this.code = code;
    this.subcode = subcode;
    this.type = type;
  }
}

/**
 * Helper to execute Meta Graph API fetch requests and normalize error responses.
 */
export async function graphRequest(endpoint, options = {}) {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${META_GRAPH_BASE_URL}/${endpoint.replace(/^\//, "")}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    const err = data.error || {};
    throw new MetaGraphError(
      err.message || `Meta API request failed with status ${res.status}`,
      res.status,
      err.code,
      err.error_subcode,
      err.type
    );
  }

  return data;
}

/**
 * Exchanges OAuth authorization code for a short-lived User Access Token.
 */
export async function exchangeCodeForUserToken({ code, redirectUri }) {
  const appId = process.env.META_APP_ID || META_DEFAULT_APP_ID;
  const appSecret = process.env.META_APP_SECRET || META_DEFAULT_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Missing META_APP_ID or META_APP_SECRET configuration");
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  return graphRequest(`oauth/access_token?${params.toString()}`);
}

/**
 * Exchanges a short-lived User Access Token for a 60-day Long-Lived Token.
 */
export async function exchangeForLongLivedToken(shortLivedToken) {
  const appId = process.env.META_APP_ID || META_DEFAULT_APP_ID;
  const appSecret = process.env.META_APP_SECRET || META_DEFAULT_APP_SECRET;

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  return graphRequest(`oauth/access_token?${params.toString()}`);
}

/**
 * Subscribes an Instagram Business/Creator Account directly to webhooks (Unified Login flow).
 * Endpoint: POST /{instagram-account-id}/subscribed_apps
 */
export async function subscribeInstagramAccountToWebhooks({ instagramBusinessId, accessToken }) {
  if (!instagramBusinessId || !accessToken) return null;
  const subscribedFields = ["messages", "comments", "mentions"].join(",");
  try {
    return await graphRequest(`${instagramBusinessId}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        subscribed_fields: subscribedFields,
        access_token: accessToken,
      }).toString(),
    });
  } catch (err) {
    console.warn(
      `[MetaClient] Subscribing IG account ${instagramBusinessId} to webhooks note: ${err.message}`
    );
    return null;
  }
}

/**
 * Retrieves all accessible Instagram Business/Creator Accounts for the user,
 * comprehensively checking:
 * 1. Meta Instagram API with Unified Login (/me/assigned_instagram_accounts) - Standalone IG accounts
 * 2. Traditional Facebook Pages (/me/accounts -> page.instagram_business_account) - Facebook-linked IG accounts
 * 3. Meta Business Portfolios (/me/businesses -> instagram_accounts)
 * 4. Assigned Pages (/me/assigned_pages)
 */
export async function fetchAllInstagramAccounts(userAccessToken) {
  if (!userAccessToken) {
    throw new Error("userAccessToken is required to fetch Instagram accounts");
  }

  const accountsMap = new Map();

  // 1. Primary Discovery: Standalone Instagram Accounts via /me/assigned_instagram_accounts (Meta Unified Login)
  try {
    const assignedRes = await graphRequest(
      `me/assigned_instagram_accounts?fields=id,username,name,profile_picture_url,followers_count&access_token=${encodeURIComponent(userAccessToken)}`
    );
    const assignedList = assignedRes.data || [];
    for (const item of assignedList) {
      if (!item.id || accountsMap.has(item.id)) continue;
      let accountData = {
        id: item.id,
        username: item.username || `ig_${item.id}`,
        name: item.name || item.username || "Instagram Account",
        profilePictureUrl: item.profile_picture_url || null,
        followersCount: item.followers_count || 0,
        accountType: "BUSINESS",
      };

      if (!accountData.username || !accountData.profilePictureUrl) {
        try {
          const details = await fetchInstagramAccountDetails(item.id, userAccessToken);
          accountData = {
            ...accountData,
            ...details,
            name: details.name || accountData.name,
            username: details.username || accountData.username,
            profilePictureUrl: details.profile_picture_url || accountData.profilePictureUrl,
          };
        } catch {
          // retain base
        }
      }

      accountsMap.set(item.id, {
        instagram: accountData,
        pageId: null,
        pageName: null,
        pageToken: userAccessToken,
        isUnifiedLogin: true,
        isStandalone: true,
      });
    }
  } catch (assignedErr) {
    console.warn(`[MetaClient] /me/assigned_instagram_accounts check note:`, assignedErr.message);
  }

  // 2. Secondary Discovery: Facebook Pages via /me/accounts for linked instagram_business_account
  try {
    const pagesWithIg = await fetchPagesWithInstagramAccounts(userAccessToken);
    for (const p of pagesWithIg) {
      if (!p.instagram?.id || accountsMap.has(p.instagram.id)) continue;
      accountsMap.set(p.instagram.id, {
        instagram: p.instagram,
        pageId: p.pageId,
        pageName: p.pageName,
        pageToken: p.pageToken,
        isUnifiedLogin: false,
        isStandalone: false,
      });
    }
  } catch (pagesErr) {
    console.warn(`[MetaClient] /me/accounts check note:`, pagesErr.message);
  }

  // 3. Fallback Discovery: Check /me/assigned_pages
  try {
    const assignedPagesRes = await graphRequest(
      `me/assigned_pages?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${encodeURIComponent(userAccessToken)}`
    );
    const assignedPages = assignedPagesRes.data || [];
    for (const p of assignedPages) {
      if (!p.instagram_business_account?.id || accountsMap.has(p.instagram_business_account.id)) continue;
      let igData = p.instagram_business_account;
      if (!igData.username) {
        try {
          const details = await fetchInstagramAccountDetails(igData.id, p.access_token || userAccessToken);
          igData = { ...igData, ...details };
        } catch {}
      }
      accountsMap.set(igData.id, {
        instagram: {
          id: igData.id,
          username: igData.username || `ig_${igData.id}`,
          name: igData.name || igData.username || p.name,
          profilePictureUrl: igData.profile_picture_url || null,
          followersCount: igData.followers_count || 0,
          accountType: "BUSINESS",
        },
        pageId: p.id,
        pageName: p.name,
        pageToken: p.access_token,
        isUnifiedLogin: true,
        isStandalone: false,
      });
    }
  } catch (assignedPagesErr) {
    // Non-critical fallback
  }

  // 4. Fallback Discovery: Meta Business Portfolios /me/businesses (owned_instagram_accounts & instagram_accounts)
  try {
    const businessesRes = await graphRequest(
      `me/businesses?fields=id,name,owned_instagram_accounts{id,username,name,profile_picture_url,followers_count},instagram_accounts{id,username,name,profile_picture_url,followers_count}&access_token=${encodeURIComponent(userAccessToken)}`
    );
    const businesses = businessesRes.data || [];
    for (const biz of businesses) {
      const igAccounts = [
        ...(biz.owned_instagram_accounts?.data || []),
        ...(biz.instagram_accounts?.data || []),
      ];
      for (const ig of igAccounts) {
        if (!ig.id || accountsMap.has(ig.id)) continue;

        let igData = {
          id: ig.id,
          username: ig.username || `ig_${ig.id}`,
          name: ig.name || ig.username || biz.name,
          profilePictureUrl: ig.profile_picture_url || null,
          followersCount: ig.followers_count || 0,
          accountType: "BUSINESS",
        };

        if (!igData.username || !igData.profilePictureUrl) {
          try {
            const details = await fetchInstagramAccountDetails(ig.id, userAccessToken);
            igData = { ...igData, ...details };
          } catch {
            // retain base
          }
        }

        accountsMap.set(ig.id, {
          instagram: igData,
          pageId: null,
          pageName: biz.name || null,
          pageToken: userAccessToken,
          isUnifiedLogin: true,
          isStandalone: true,
        });
      }
    }
  } catch (bizErr) {
    // Non-critical, ignore
  }

  return Array.from(accountsMap.values());
}

/**
 * Retrieves Facebook Pages managed by the user that have a linked Instagram Business/Creator Account.
 */
export async function fetchPagesWithInstagramAccounts(userAccessToken) {
  const fields = [
    "id",
    "name",
    "access_token",
    "instagram_business_account{id,username,name,profile_picture_url}",
  ].join(",");

  const res = await graphRequest(`me/accounts?fields=${fields}&access_token=${userAccessToken}`);
  const pages = res.data || [];

  // Filter and normalize pages that have an active instagram_business_account
  const connected = [];
  for (const p of pages) {
    if (!p.instagram_business_account?.id) continue;

    let instagramData = p.instagram_business_account;
    if (!instagramData.username) {
      try {
        const details = await fetchInstagramAccountDetails(instagramData.id, p.access_token || userAccessToken);
        instagramData = { ...instagramData, ...details };
      } catch {
        // Fallback to minimal data if details fetch is restricted
      }
    }

    connected.push({
      pageId: p.id,
      pageName: p.name,
      pageToken: p.access_token,
      instagram: {
        id: instagramData.id,
        username: instagramData.username || `ig_${instagramData.id}`,
        name: instagramData.name || instagramData.username || p.name,
        profilePictureUrl: instagramData.profile_picture_url || null,
        accountType: "BUSINESS",
      },
    });
  }

  return connected;
}

/**
 * Subscribes a Facebook Page's webhooks to the RawReply Meta application.
 */
export async function subscribePageToWebhooks({ pageId, pageAccessToken }) {
  const subscribedFields = WEBHOOK_SUBSCRIBED_FIELDS.join(",");
  return graphRequest(`${pageId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      subscribed_fields: subscribedFields,
      access_token: pageAccessToken,
    }).toString(),
  });
}

/**
 * Unsubscribes a Facebook Page from webhook updates.
 */
export async function unsubscribePageFromWebhooks({ pageId, pageAccessToken }) {
  return graphRequest(`${pageId}/subscribed_apps`, {
    method: "DELETE",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: pageAccessToken,
    }).toString(),
  });
}

/**
 * Fetches updated Instagram account details.
 */
export async function fetchInstagramAccountDetails(instagramBusinessId, accessToken) {
  const fields = "id,username,name,profile_picture_url,followers_count";
  return graphRequest(`${instagramBusinessId}?fields=${fields}&access_token=${accessToken}`);
}

/**
 * Fetches actual Instagram media (Reels, videos, images, carousel posts) from an authorized account.
 */
export async function fetchInstagramMedia({ instagramAccountId, accessToken, after = null, limit = 24 }) {
  if (!instagramAccountId && !accessToken) {
    throw new Error("instagramAccountId and accessToken are required to fetch media");
  }
  if (!accessToken) {
    throw new Error("accessToken is required to fetch media");
  }

  const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "thumbnail_url",
    "permalink",
    "timestamp",
    "like_count",
    "comments_count",
  ].join(",");

  const targetPath = instagramAccountId ? `${instagramAccountId}/media` : "me/media";
  let endpoint = `${META_GRAPH_BASE_URL}/${targetPath}?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(accessToken)}`;
  if (after) {
    endpoint += `&after=${encodeURIComponent(after)}`;
  }

  const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.error) {
    const err = json.error || {};
    throw new MetaGraphError(
      err.message || `Fetch media failed with status ${res.status}`,
      res.status,
      err.code,
      err.error_subcode,
      err.type
    );
  }

  const rawList = json.data || [];
  const media = rawList.map((item) => ({
    id: item.id,
    mediaType: item.media_type || "IMAGE",
    caption: item.caption || "",
    thumbnailUrl: item.thumbnail_url || item.media_url || null,
    mediaUrl: item.media_url || null,
    permalink: item.permalink || `https://www.instagram.com/p/${item.id}`,
    publishedAt: item.timestamp || null,
    likeCount: item.like_count || 0,
    commentsCount: item.comments_count || 0,
  }));

  return {
    data: media,
    paging: json.paging || null,
  };
}

/**
 * Replies publicly to an Instagram comment.
 * Meta Endpoint: POST https://graph.facebook.com/{version}/{comment-id}/replies
 */
export async function replyToInstagramComment({ commentId, message, accessToken }) {
  if (!commentId || !message || !accessToken) {
    throw new Error("commentId, message and accessToken are required to reply to comment");
  }

  const url = `${META_GRAPH_BASE_URL}/${commentId}/replies`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      message,
      access_token: accessToken,
    }).toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = data.error || {};
    throw new MetaGraphError(
      err.message || `Reply to Instagram comment failed with status ${res.status}`,
      res.status,
      err.code,
      err.error_subcode,
      err.type
    );
  }

  return data;
}

/**
 * Sends a private Instagram DM in response to a user's comment.
 * Meta Endpoint: POST https://graph.facebook.com/{version}/{target-id}/messages
 * Payload: { recipient: { comment_id: "..." }, message: { text: "..." } }
 */
export async function sendInstagramPrivateReply({ commentId, message, accessToken, pageId, instagramAccountId }) {
  if (!commentId || !message || !accessToken) {
    throw new Error("commentId, message and accessToken are required for private reply");
  }

  const targetId = instagramAccountId || pageId || "me";
  const url = `${META_GRAPH_BASE_URL}/${targetId}/messages?access_token=${encodeURIComponent(accessToken)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient: {
        comment_id: commentId,
      },
      message: {
        text: message,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    // If target was instagramAccountId and it failed, retry with pageId if available (for Facebook Unified Login)
    if (pageId && targetId !== pageId) {
      try {
        const fallbackUrl = `${META_GRAPH_BASE_URL}/${pageId}/messages?access_token=${encodeURIComponent(accessToken)}`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            recipient: {
              comment_id: commentId,
            },
            message: {
              text: message,
            },
          }),
        });
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        if (fallbackRes.ok && !fallbackData.error) {
          return {
            recipientId: fallbackData.recipient_id,
            messageId: fallbackData.message_id || fallbackData.id,
          };
        }
      } catch {
        // Fall through to original error
      }
    }

    const err = data.error || {};
    throw new MetaGraphError(
      err.message || `Private reply failed with status ${res.status}`,
      res.status,
      err.code,
      err.error_subcode,
      err.type
    );
  }

  return {
    recipientId: data.recipient_id,
    messageId: data.message_id || data.id,
  };
}

/**
 * Sends a direct message to an Instagram user thread.
 * Meta Endpoint: POST /{page-id}/messages with recipient: { id: "..." }
 */
export async function sendInstagramDirectMessage({ recipientId, message, accessToken, pageId, instagramAccountId }) {
  if (!recipientId || !message || !accessToken) {
    throw new Error("recipientId, message and accessToken are required for direct message");
  }

  const targetId = pageId || instagramAccountId || "me";
  const url = `${META_GRAPH_BASE_URL}/${targetId}/messages?access_token=${encodeURIComponent(accessToken)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient: {
        id: recipientId,
      },
      message: {
        text: message,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = data.error || {};
    throw new MetaGraphError(
      err.message || `Direct message failed with status ${res.status}`,
      res.status,
      err.code,
      err.error_subcode,
      err.type
    );
  }

  return {
    recipientId: data.recipient_id,
    messageId: data.message_id,
  };
}

/**
 * Retrieves all Facebook Pages managed by the authorized user.
 * Meta Endpoint: GET /me/accounts?fields=id,name,access_token,category,tasks,picture{url},fan_count,link
 */
export async function fetchUserFacebookPages(userAccessToken) {
  if (!userAccessToken) {
    throw new Error("userAccessToken is required to fetch Facebook Pages");
  }

  const fields = [
    "id",
    "name",
    "access_token",
    "category",
    "tasks",
    "picture{url}",
    "fan_count",
    "link",
  ].join(",");

  const res = await graphRequest(`me/accounts?fields=${fields}&access_token=${encodeURIComponent(userAccessToken)}`);
  const rawPages = res.data || [];

  return rawPages.map((p) => ({
    pageId: p.id,
    pageName: p.name,
    pageToken: p.access_token,
    category: p.category || "Facebook Page",
    profilePictureUrl: p.picture?.data?.url || null,
    fanCount: p.fan_count || 0,
    link: p.link || `https://www.facebook.com/${p.id}`,
    tasks: p.tasks || [],
  }));
}

/**
 * Fetches real published posts from a Facebook Page.
 * Meta Endpoint: GET /{page-id}/published_posts or /{page-id}/feed
 */
export async function fetchFacebookPagePosts({ pageId, pageAccessToken, after = null, limit = 24 }) {
  if (!pageId || !pageAccessToken) {
    throw new Error("pageId and pageAccessToken are required to fetch Facebook posts");
  }

  const fields = [
    "id",
    "message",
    "story",
    "created_time",
    "permalink_url",
    "full_picture",
    "shares",
  ].join(",");

  let endpoint = `${pageId}/published_posts?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(pageAccessToken)}`;
  if (after) {
    endpoint += `&after=${encodeURIComponent(after)}`;
  }

  let res;
  try {
    res = await graphRequest(endpoint);
  } catch {
    // Fallback to feed if published_posts is restricted
    endpoint = `${pageId}/feed?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(pageAccessToken)}`;
    if (after) endpoint += `&after=${encodeURIComponent(after)}`;
    res = await graphRequest(endpoint);
  }

  const rawList = res.data || [];
  const posts = rawList.map((item) => ({
    id: item.id,
    mediaType: "POST",
    caption: item.message || item.story || "Facebook Post",
    thumbnailUrl: item.full_picture || null,
    mediaUrl: item.full_picture || null,
    permalink: item.permalink_url || `https://www.facebook.com/${item.id}`,
    publishedAt: item.created_time || null,
    likeCount: item.shares?.count || 0,
    commentsCount: 0,
  }));

  return {
    data: posts,
    paging: res.paging || null,
  };
}

/**
 * Replies publicly to a Facebook Page comment.
 * Meta Endpoint: POST /{comment-id}/comments
 */
export async function replyToFacebookComment({ commentId, message, pageAccessToken }) {
  if (!commentId || !message || !pageAccessToken) {
    throw new Error("commentId, message and pageAccessToken are required to reply to Facebook comment");
  }

  return graphRequest(`${commentId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      message,
      access_token: pageAccessToken,
    }).toString(),
  });
}

/**
 * Sends a private Facebook Messenger reply to a Page comment.
 * Meta Endpoint: POST /{page-id}/messages
 * Payload: { recipient: { comment_id: "..." }, message: { text: "..." } }
 */
export async function sendFacebookPrivateReply({ commentId, message, pageAccessToken, pageId }) {
  if (!commentId || !message || !pageAccessToken) {
    throw new Error("commentId, message and pageAccessToken are required for Facebook private reply");
  }

  const targetId = pageId || "me";
  const url = `${META_GRAPH_BASE_URL}/${targetId}/messages?access_token=${encodeURIComponent(pageAccessToken)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient: {
        comment_id: commentId,
      },
      message: {
        text: message,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = data.error || {};
    throw new MetaGraphError(
      err.message || `Facebook private reply failed with status ${res.status}`,
      res.status,
      err.code,
      err.error_subcode,
      err.type
    );
  }

  return {
    recipientId: data.recipient_id,
    messageId: data.message_id,
  };
}

/**
 * Sends a direct Facebook Messenger message to a user.
 * Meta Endpoint: POST /{page-id}/messages with recipient: { id: "..." }
 */
export async function sendFacebookDirectMessage({ recipientId, message, pageAccessToken, pageId }) {
  if (!recipientId || !message || !pageAccessToken) {
    throw new Error("recipientId, message and pageAccessToken are required for Facebook direct message");
  }

  const targetId = pageId || "me";
  const url = `${META_GRAPH_BASE_URL}/${targetId}/messages?access_token=${encodeURIComponent(pageAccessToken)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient: {
        id: recipientId,
      },
      message: {
        text: message,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = data.error || {};
    throw new MetaGraphError(
      err.message || `Facebook direct message failed with status ${res.status}`,
      res.status,
      err.code,
      err.error_subcode,
      err.type
    );
  }

  return {
    recipientId: data.recipient_id,
    messageId: data.message_id,
  };
}

