import {
  INSTAGRAM_OAUTH_DIALOG_URL,
  INSTAGRAM_OAUTH_TOKEN_URL,
  INSTAGRAM_GRAPH_BASE_URL,
  INSTAGRAM_DIRECT_SCOPES,
  META_DEFAULT_APP_ID,
  META_DEFAULT_APP_SECRET,
  getInstagramRedirectUri,
} from "./constants.js";
import { MetaGraphError } from "./client.js";

/**
 * Resolves Instagram Direct App Credentials.
 * Uses INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET if provided, otherwise falls back to
 * META_APP_ID/META_APP_SECRET (unified Meta app configuration).
 */
export function getInstagramDirectCredentials() {
  const appId =
    process.env.INSTAGRAM_APP_ID ||
    process.env.META_APP_ID ||
    META_DEFAULT_APP_ID;
  const appSecret =
    process.env.INSTAGRAM_APP_SECRET ||
    process.env.META_APP_SECRET ||
    META_DEFAULT_APP_SECRET;
  return { appId, appSecret };
}

/**
 * Builds the Meta "Instagram API with Instagram Login" OAuth authorization URL.
 * Prompts direct Instagram username/password login without requiring a Facebook Page.
 */
export function buildInstagramDirectAuthorizeUrl({
  state,
  req,
  clientId,
  redirectUri,
}) {
  if (!state) {
    throw new Error("state is required to construct Instagram Direct OAuth URL");
  }

  const { appId } = getInstagramDirectCredentials();
  const resolvedClientId = clientId || appId;
  const resolvedRedirectUri = redirectUri || getInstagramRedirectUri(req);

  const params = new URLSearchParams({
    client_id: resolvedClientId,
    redirect_uri: resolvedRedirectUri,
    response_type: "code",
    scope: INSTAGRAM_DIRECT_SCOPES.join(","),
    state,
    enable_fb_login: "0",
    force_authentication: "1",
  });

  return `${INSTAGRAM_OAUTH_DIALOG_URL}?${params.toString()}`;
}

/**
 * Exchanges the Instagram authorization code for a short-lived Instagram User Access Token.
 * Endpoint: POST https://api.instagram.com/oauth/access_token
 */
export async function exchangeInstagramDirectCode({
  code,
  redirectUri,
  appId: overrideAppId,
  appSecret: overrideAppSecret,
}) {
  const { appId, appSecret } = getInstagramDirectCredentials();
  const effectiveAppId = overrideAppId || appId;
  const effectiveAppSecret = overrideAppSecret || appSecret;

  if (!effectiveAppId || !effectiveAppSecret) {
    throw new Error("Missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET configuration");
  }

  const body = new URLSearchParams({
    client_id: effectiveAppId,
    client_secret: effectiveAppSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(INSTAGRAM_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error_type || data.error_message || data.error) {
    const message =
      data.error_message ||
      data.error?.message ||
      data.error_description ||
      `Instagram token exchange failed with status ${res.status}`;
    throw new MetaGraphError(
      message,
      res.status,
      data.code || data.error?.code,
      data.error_subcode || data.error?.error_subcode,
      data.error_type || data.error?.type || "OAuthException"
    );
  }

  return {
    accessToken: data.access_token,
    userId: String(data.user_id || ""),
    permissions: data.permissions || [],
  };
}

/**
 * Exchanges a short-lived Instagram User Token for a 60-day Long-Lived Token.
 * Endpoint: GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token
 */
export async function exchangeInstagramDirectLongLivedToken({
  shortLivedToken,
  appSecret: overrideAppSecret,
}) {
  const { appSecret } = getInstagramDirectCredentials();
  const effectiveAppSecret = overrideAppSecret || appSecret;

  if (!effectiveAppSecret) {
    throw new Error("Missing INSTAGRAM_APP_SECRET configuration for long-lived token exchange");
  }

  const url = `${INSTAGRAM_GRAPH_BASE_URL}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(
    effectiveAppSecret
  )}&access_token=${encodeURIComponent(shortLivedToken)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const err = data.error || {};
    throw new MetaGraphError(
      err.message || `Instagram long-lived token exchange failed with status ${res.status}`,
      res.status,
      err.code,
      err.error_subcode,
      err.type
    );
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || "bearer",
    expiresIn: data.expires_in || 60 * 24 * 60 * 60, // default: 60 days
  };
}

/**
 * Fetches profile details for the authorized Instagram account directly from graph.instagram.com.
 * Endpoint: GET /v21.0/me or /me
 */
export async function fetchInstagramDirectProfile({ accessToken }) {
  if (!accessToken) {
    throw new Error("accessToken is required to fetch Instagram Direct profile");
  }

  const fields = "id,user_id,username,name,account_type,profile_picture_url,followers_count";
  let url = `${INSTAGRAM_GRAPH_BASE_URL}/v21.0/me?fields=${fields}&access_token=${encodeURIComponent(
    accessToken
  )}`;

  let res = await fetch(url, { headers: { Accept: "application/json" } });
  let data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    // Fallback to unversioned /me endpoint
    url = `${INSTAGRAM_GRAPH_BASE_URL}/me?fields=user_id,username,name,account_type,profile_picture_url&access_token=${encodeURIComponent(
      accessToken
    )}`;
    res = await fetch(url, { headers: { Accept: "application/json" } });
    data = await res.json().catch(() => ({}));
  }

  if (!res.ok || data.error) {
    const err = data.error || {};
    throw new MetaGraphError(
      err.message || `Failed to fetch Instagram profile with status ${res.status}`,
      res.status,
      err.code,
      err.error_subcode,
      err.type
    );
  }

  const resolvedId = String(data.user_id || data.id || "");
  return {
    id: resolvedId,
    userId: resolvedId,
    username: data.username || `ig_${resolvedId}`,
    name: data.name || data.username || "Instagram Account",
    accountType: (data.account_type || "BUSINESS").toUpperCase(),
    profilePictureUrl: data.profile_picture_url || null,
    followersCount: data.followers_count || 0,
  };
}

/**
 * Fetches recent media directly from graph.instagram.com/me/media.
 */
export async function fetchInstagramDirectMedia({ accessToken, limit = 25, after = null }) {
  if (!accessToken) {
    throw new Error("accessToken is required to fetch Instagram Direct media");
  }

  const primaryFields = [
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

  const basicFields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "permalink",
    "timestamp",
  ].join(",");

  let endpoint = `${INSTAGRAM_GRAPH_BASE_URL}/v21.0/me/media?fields=${primaryFields}&limit=${limit}&access_token=${encodeURIComponent(
    accessToken
  )}`;
  if (after) endpoint += `&after=${encodeURIComponent(after)}`;

  let res = await fetch(endpoint, { headers: { Accept: "application/json" } });
  let data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    // Retry with basic fields
    endpoint = `${INSTAGRAM_GRAPH_BASE_URL}/v21.0/me/media?fields=${basicFields}&limit=${limit}&access_token=${encodeURIComponent(
      accessToken
    )}`;
    if (after) endpoint += `&after=${encodeURIComponent(after)}`;
    res = await fetch(endpoint, { headers: { Accept: "application/json" } });
    data = await res.json().catch(() => ({}));
  }

  if (!res.ok || data.error) {
    const err = data.error || {};
    throw new MetaGraphError(
      err.message || `Failed to fetch Instagram media with status ${res.status}`,
      res.status,
      err.code,
      err.error_subcode,
      err.type
    );
  }

  const rawList = data.data || [];
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
    paging: data.paging || null,
  };
}

/**
 * Subscribes the Direct Instagram Account to webhook events.
 */
export async function subscribeInstagramDirectWebhooks({ accessToken, userId }) {
  if (!accessToken) return null;
  const subscribedFields = ["messages", "comments", "mentions"].join(",");

  // Attempt 1: graph.instagram.com/v21.0/me/subscribed_apps
  try {
    const res = await fetch(`${INSTAGRAM_GRAPH_BASE_URL}/v21.0/me/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        subscribed_fields: subscribedFields,
        access_token: accessToken,
      }).toString(),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    // Fallback below
  }

  // Attempt 2: graph.facebook.com/v21.0/{userId}/subscribed_apps
  if (userId) {
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${userId}/subscribed_apps`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          subscribed_fields: subscribedFields,
          access_token: accessToken,
        }).toString(),
      });
      if (res.ok) return await res.json();
    } catch {
      // Non-critical subscription note
    }
  }

  return null;
}
