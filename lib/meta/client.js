import {
  META_API_VERSION,
  META_GRAPH_BASE_URL,
  META_OAUTH_TOKEN_URL,
  META_DEFAULT_APP_ID,
  META_DEFAULT_APP_SECRET,
  WEBHOOK_SUBSCRIBED_FIELDS,
} from "./constants";

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

