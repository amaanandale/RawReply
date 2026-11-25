/**
 * Meta Graph API centralized constants and configuration.
 */

export const META_API_VERSION = process.env.META_API_VERSION || "v21.0";
export const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
export const META_OAUTH_DIALOG_URL = "https://www.facebook.com/dialog/oauth";
export const META_OAUTH_TOKEN_URL = `${META_GRAPH_BASE_URL}/oauth/access_token`;

// Instagram API with Instagram Login endpoints (Direct Business Login)
export const INSTAGRAM_OAUTH_DIALOG_URL = "https://www.instagram.com/oauth/authorize";
export const INSTAGRAM_OAUTH_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
export const INSTAGRAM_GRAPH_BASE_URL = "https://graph.instagram.com";
export const INSTAGRAM_PRODUCTION_REDIRECT_URI =
  "https://rawreply.vercel.app/api/auth/instagram/callback";

export const META_DEFAULT_APP_ID = "1531237922145783";
export const META_DEFAULT_CONFIG_ID = "1106955532119603";
export const META_DEFAULT_APP_SECRET = process.env.META_APP_SECRET || "d5a2708a6a9c6d5f9cab1490ea21581c";
export const META_PRODUCTION_REDIRECT_URI =
  "https://rawreply.vercel.app/api/auth/meta/callback";

/**
 * Derives and normalizes the Instagram Direct OAuth redirect URI.
 * - In local development (localhost / 127.0.0.1), returns local callback URI (e.g. http://localhost:3000/api/auth/instagram/callback).
 * - In production, respects INSTAGRAM_REDIRECT_URI if set, otherwise falls back to NEXT_PUBLIC_APP_URL or request host.
 */
export function getInstagramRedirectUri(req) {
  if (req) {
    const host = req.headers?.get?.("host") || "";
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      const proto = req.headers?.get?.("x-forwarded-proto") || "http";
      return `${proto}://${host}/api/auth/instagram/callback`;
    }
  }

  if (process.env.INSTAGRAM_REDIRECT_URI) {
    return process.env.INSTAGRAM_REDIRECT_URI.trim();
  }

  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl && req) {
    const proto = req.headers?.get?.("x-forwarded-proto") || "https";
    const host = req.headers?.get?.("host") || "localhost:3000";
    baseUrl = `${proto}://${host}`;
  }

  if (!baseUrl) {
    baseUrl = "http://localhost:3000";
  }

  return `${baseUrl.replace(/\/+$/, "")}/api/auth/instagram/callback`;
}

/**
 * Derives and normalizes the Meta OAuth redirect URI without trailing slash discrepancies.
 * - In local development (localhost / 127.0.0.1), dynamically returns the local callback URI
 *   (e.g. http://localhost:3000/api/auth/meta/callback) so local testing stays on localhost.
 * - In production, respects META_REDIRECT_URI if set, otherwise falls back to
 *   NEXT_PUBLIC_APP_URL or derives from request host.
 */
export function getMetaRedirectUri(req) {
  // If an active request is running locally (localhost / 127.0.0.1),
  // prioritize the local host callback so local development never redirects to production Vercel
  if (req) {
    const host = req.headers?.get?.("host") || "";
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      const proto = req.headers?.get?.("x-forwarded-proto") || "http";
      return `${proto}://${host}/api/auth/meta/callback`;
    }
  }

  // Precedence for explicit environment override (in production)
  if (process.env.META_REDIRECT_URI) {
    return process.env.META_REDIRECT_URI.trim();
  }

  // Derive baseUrl from NEXT_PUBLIC_APP_URL or active request host
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl && req) {
    const proto = req.headers?.get?.("x-forwarded-proto") || "https";
    const host = req.headers?.get?.("host") || "localhost:3000";
    baseUrl = `${proto}://${host}`;
  }

  if (!baseUrl) {
    baseUrl = "http://localhost:3000";
  }

  return `${baseUrl.replace(/\/+$/, "")}/api/auth/meta/callback`;
}

/**
 * Permissions for Meta's "Instagram API with Instagram Login" (Direct Business Login).
 * These allow direct username/password login without needing a Facebook Page.
 */
export const INSTAGRAM_DIRECT_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
];

/**
 * Required permissions for RawReply Instagram Comment-to-DM automation.
 * These match Meta's Instagram Business Login permissions.
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
 * Required permissions for RawReply Facebook Page Comment-to-DM automation.
 * These match Meta's Facebook Login for Business permissions for Pages.
 */
export const FACEBOOK_PAGE_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_manage_metadata",
  "pages_messaging",
  "pages_read_user_content",
];

/**
 * Supported platforms in RawReply.
 */
export const SUPPORTED_PLATFORMS = {
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
};

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
