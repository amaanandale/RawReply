/**
 * Meta Graph API centralized constants and configuration.
 */

export const META_API_VERSION = process.env.META_API_VERSION || "v21.0";
export const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
export const META_OAUTH_DIALOG_URL = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`;
export const META_OAUTH_TOKEN_URL = `${META_GRAPH_BASE_URL}/oauth/access_token`;

/**
 * Derives and normalizes the Meta OAuth redirect URI without trailing slash discrepancies.
 * Respects META_REDIRECT_URI if set, otherwise falls back to {NEXT_PUBLIC_APP_URL}/api/auth/meta/callback.
 */
export function getMetaRedirectUri(req) {
  if (process.env.META_REDIRECT_URI) {
    return process.env.META_REDIRECT_URI.trim();
  }

  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl && req) {
    const proto = req.headers?.get?.("x-forwarded-proto") || "http";
    const host = req.headers?.get?.("host") || "localhost:3000";
    baseUrl = `${proto}://${host}`;
  }

  if (!baseUrl) {
    baseUrl = "http://localhost:3000";
  }

  return `${baseUrl.replace(/\/+$/, "")}/api/auth/meta/callback`;
}

/**
 * Required permissions for RawReply Instagram Comment-to-DM automation.
 * These match current Meta Graph API v21.0 documentation for Instagram Business Login.
 */
export const REQUIRED_META_SCOPES = [
  "instagram_basic",
  "instagram_manage_comments",
  "instagram_manage_messages",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
];

/**
 * Supported Instagram professional account types.
 */
export const SUPPORTED_ACCOUNT_TYPES = {
  BUSINESS: "BUSINESS",
  CREATOR: "CREATOR",
};

/**
 * Subscribed webhook fields for connected Instagram business pages.
 */
export const WEBHOOK_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
  "feed",
];


