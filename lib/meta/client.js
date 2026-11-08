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
async function graphRequest(endpoint, options = {}) {
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
        const details = await fetchInstagramAccountDetails(instagramData.id, userAccessToken);
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
  if (!instagramAccountId || !accessToken) {
    throw new Error("instagramAccountId and accessToken are required to fetch media");
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

  let endpoint = `${instagramAccountId}/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(accessToken)}`;
  if (after) {
    endpoint += `&after=${encodeURIComponent(after)}`;
  }

  const res = await graphRequest(endpoint);
  const rawList = res.data || [];

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
    paging: res.paging || null,
  };
}

/**
 * Replies publicly to an Instagram comment.
 * Meta Endpoint: POST /{comment-id}/replies
 */
export async function replyToInstagramComment({ commentId, message, accessToken }) {
  if (!commentId || !message || !accessToken) {
    throw new Error("commentId, message and accessToken are required to reply to comment");
  }

  return graphRequest(`${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      message,
      access_token: accessToken,
    }).toString(),
  });
}

/**
 * Sends a private Instagram DM in response to a user's comment.
 * Meta Endpoint: POST /{page-id}/messages or /{instagram-business-account-id}/messages
 * Payload: { recipient: { comment_id: "..." }, message: { text: "..." } }
 */
export async function sendInstagramPrivateReply({ commentId, message, accessToken, pageId, instagramAccountId }) {
  if (!commentId || !message || !accessToken) {
    throw new Error("commentId, message and accessToken are required for private reply");
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
      err.message || `Private reply failed with status ${res.status}`,
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

