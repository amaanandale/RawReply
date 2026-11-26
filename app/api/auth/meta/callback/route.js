import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { createAccessToken } from "@/lib/auth/tokens";
import { setAuthCookies } from "@/lib/auth/cookies";
import { getMetaRedirectUri } from "@/lib/meta/constants";
import {
  validateAndConsumeOAuthState,
  STATE_COOKIE_NAME,
} from "@/lib/meta/oauth-state";
import {
  exchangeCodeForUserToken,
  exchangeForLongLivedToken,
  fetchAllInstagramAccounts,
  fetchPagesWithInstagramAccounts,
  fetchUserFacebookPages,
  subscribePageToWebhooks,
  subscribeInstagramAccountToWebhooks,
  fetchInstagramMedia,
  graphRequest,
} from "@/lib/meta/client";
import { db } from "@/lib/db/client";
import { accountStore } from "@/lib/storage/account-store";
import { logSystemError, ERROR_CATEGORIES, ERROR_SEVERITIES } from "@/lib/monitoring/error-logger";

/**
 * GET /api/auth/meta/callback
 * Handles the Meta Instagram API with Unified Login callback:
 * 1. Safely checks for Meta authorization denials/errors.
 * 2. Strictly validates the OAuth state and HttpOnly cookie BEFORE token exchange.
 * 3. Enforces single-use state consumption to prevent replay attacks.
 * 4. Preserves organization-level account isolation.
 * 5. Exchanges the authorization code for long-lived credentials and saves the account with AES-256-GCM encryption.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
  const accountsRedirectUrl = new URL("/dashboard/accounts", appUrl);

  // Helper to clear the state cookie on any terminal redirect response
  function redirectWithClearedCookie(url) {
    const res = NextResponse.redirect(url);
    res.cookies.delete(STATE_COOKIE_NAME);
    return res;
  }

  /**
   * Returns an HTML page that posts a message to the opener window and closes itself.
   * Used when the OAuth flow was initiated in a popup window.
   */
  function popupResponse({ success, username, platform, error }) {
    const data = JSON.stringify({
      type: "META_OAUTH_COMPLETE",
      success: Boolean(success),
      username: username || null,
      platform: platform || "instagram",
      error: error || null,
    });

    const html = `<!DOCTYPE html>
<html><head><title>RawReply — Connecting...</title></head>
<body>
<p style="font-family:Inter,system-ui,sans-serif;text-align:center;padding:2rem;color:#667085;">
  ${success ? "Account connected! This window will close automatically." : "Connection failed. This window will close automatically."}
</p>
<script>
(function(){
  try {
    var msg = ${data};
    if (window.opener && typeof window.opener.postMessage === "function") {
      window.opener.postMessage(msg, window.location.origin || "${appUrl}");
    }
  } catch(e) {}
  setTimeout(function(){ window.close(); }, 500);
})();
</script>
</body></html>`;

    const res = new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    // Cannot delete cookies on a raw Response directly; the popup script handles UI refresh
    return res;
  }

  // Track whether this flow was opened in a popup (determined after state validation)
  let isPopupFlow = false;

  // 1. Handle user cancellation or Meta authorization denial safely
  if (errorParam) {
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "MetaOAuthCallback",
        action: "oauth_denied_by_user_or_meta",
        error: errorParam,
        description: errorDescription,
        timestamp: new Date().toISOString(),
      })
    );

    // Try to detect popup from cookie before state validation (best effort)
    try {
      const cv = req.cookies?.get?.(STATE_COOKIE_NAME)?.value;
      if (cv) {
        const raw = Buffer.from(cv, "base64url").toString("utf8");
        const { payload } = JSON.parse(raw);
        const parsed = JSON.parse(payload);
        if (parsed.popup) isPopupFlow = true;
      }
    } catch {}

    if (isPopupFlow) {
      return popupResponse({
        success: false,
        error: errorDescription || "Instagram authorization was cancelled or denied by Meta.",
      });
    }

    accountsRedirectUrl.searchParams.set("error", "oauth_denied");
    accountsRedirectUrl.searchParams.set(
      "message",
      errorDescription || "Instagram authorization was cancelled or denied by Meta."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  // 2. Resolve current session (if available) for organization authorization verification
  const session = await getCurrentSession(req);

  // 3. Read the HttpOnly state cookie
  const cookieValue = req.cookies?.get?.(STATE_COOKIE_NAME)?.value;

  // 4. Validate and consume OAuth state BEFORE exchanging the authorization code
  // Rejects missing, expired, mismatched, tampered, or previously used states.
  const validation = await validateAndConsumeOAuthState({
    stateParam,
    cookieValue,
    sessionOrgId: session?.organizationId,
    sessionUser: session?.user,
  });

  if (!validation.valid) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "MetaOAuthCallback",
        action: "state_validation_rejected",
        code: validation.code,
        error: validation.error,
        timestamp: new Date().toISOString(),
      })
    );
    if (validation.popup) {
      return popupResponse({
        success: false,
        error: validation.error || "OAuth state verification failed. Please try connecting again.",
      });
    }
    accountsRedirectUrl.searchParams.set("error", validation.code || "invalid_state");
    accountsRedirectUrl.searchParams.set(
      "message",
      validation.error || "OAuth state verification failed. Please try connecting again."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  // Determine if this OAuth flow was initiated in a popup window
  isPopupFlow = Boolean(validation.popup);

  // 5. Ensure authorization code is present
  if (!code) {
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "MetaOAuthCallback",
        action: "missing_authorization_code",
        timestamp: new Date().toISOString(),
      })
    );

    if (isPopupFlow) {
      return popupResponse({ success: false, error: "Missing authorization code from Meta callback." });
    }

    accountsRedirectUrl.searchParams.set("error", "missing_code");
    accountsRedirectUrl.searchParams.set(
      "message",
      "Missing authorization code from Meta callback."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }

  const { organizationId, platform = "instagram" } = validation;
  const redirectUri = getMetaRedirectUri(req);

  try {
    console.log(
      JSON.stringify({
        level: "info",
        service: "MetaOAuthCallback",
        action: "exchanging_code_for_token",
        organizationId,
        platform,
        redirectUri,
        timestamp: new Date().toISOString(),
      })
    );

    // 6. Exchange authorization code for short-lived token
    const tokenResponse = await exchangeCodeForUserToken({
      code,
      redirectUri,
    });
    const shortLivedToken = tokenResponse.access_token;

    // 7. Exchange for 60-day long-lived User token
    const longLivedResponse = await exchangeForLongLivedToken(shortLivedToken);
    const longLivedUserToken = longLivedResponse.access_token;
    const expiresInSeconds = longLivedResponse.expires_in || 60 * 24 * 60 * 60;
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const isPlatform = organizationId === "org_platform_super_admin";

    // ─────────────────────────────────────────────────────────────
    // BRANCH A: FACEBOOK PAGE CONNECTION FLOW
    // ─────────────────────────────────────────────────────────────
    if (platform === "facebook") {
      const facebookPages = await fetchUserFacebookPages(longLivedUserToken);

      if (!facebookPages || facebookPages.length === 0) {
        if (isPopupFlow) {
          return popupResponse({
            success: false,
            error: "No Facebook Pages were found for your account. Please ensure you are an Administrator of at least one Facebook Page.",
          });
        }
        accountsRedirectUrl.searchParams.set("error", "no_facebook_pages");
        accountsRedirectUrl.searchParams.set(
          "message",
          "No Facebook Pages were found for your account. Please ensure you are an Administrator of at least one Facebook Page."
        );
        return redirectWithClearedCookie(accountsRedirectUrl.toString());
      }

      // Enforce 4-account limit for customer workspaces before saving
      if (!isPlatform) {
        const existingAccounts = await accountStore.listAccounts(organizationId);
        const isAlreadyConnected = existingAccounts.some(
          (a) => a.id === facebookPages[0].pageId || a.pageId === facebookPages[0].pageId
        );
        if (!isAlreadyConnected && existingAccounts.length >= 4) {
          if (isPopupFlow) {
            return popupResponse({
              success: false,
              error: "Maximum limit of 4 connected accounts reached. Please disconnect an existing account first.",
            });
          }
          accountsRedirectUrl.searchParams.set("error", "account_limit_reached");
          accountsRedirectUrl.searchParams.set(
            "message",
            "Maximum limit of 4 connected accounts reached. Please disconnect an existing account first."
          );
          return redirectWithClearedCookie(accountsRedirectUrl.toString());
        }
      }

      const primaryPage = facebookPages[0];

      // Subscribe the Facebook Page's feed & messages webhooks
      try {
        await subscribePageToWebhooks({
          pageId: primaryPage.pageId,
          pageAccessToken: primaryPage.pageToken,
        });
      } catch (webhookErr) {
        console.warn(
          JSON.stringify({
            level: "warn",
            service: "MetaOAuthCallback",
            action: "facebook_webhook_subscription_warning",
            pageId: primaryPage.pageId,
            error: webhookErr.message,
          })
        );
      }

      // Save Facebook Page in AccountStore
      await accountStore.saveAccount({
        organizationId,
        platform: "facebook",
        instagramBusinessId: primaryPage.pageId,
        pageId: primaryPage.pageId,
        pageName: primaryPage.pageName,
        username: primaryPage.pageName,
        name: primaryPage.pageName,
        profilePictureUrl: primaryPage.profilePictureUrl,
        accountType: "PAGE",
        accessToken: longLivedUserToken,
        pageToken: primaryPage.pageToken,
        tokenExpiresAt,
      });

      console.log(
        JSON.stringify({
          level: "info",
          service: "MetaOAuthCallback",
          action: "facebook_page_connected_successfully",
          organizationId,
          pageId: primaryPage.pageId,
          pageName: primaryPage.pageName,
        })
      );

      const destinationUrl = isPlatform
        ? new URL("/admin/integrations", appUrl)
        : accountsRedirectUrl;

      destinationUrl.searchParams.set("success", "connected");
      destinationUrl.searchParams.set("platform", "facebook");
      destinationUrl.searchParams.set("username", primaryPage.pageName);

      if (isPopupFlow) {
        return popupResponse({ success: true, username: primaryPage.pageName, platform: "facebook" });
      }

      return redirectWithClearedCookie(destinationUrl.toString());
    }

    // ─────────────────────────────────────────────────────────────
    // BRANCH B: INSTAGRAM PROFESSIONAL ACCOUNT CONNECTION FLOW
    // 1. First query /me/assigned_instagram_accounts for standalone Instagram Professional accounts
    // 2. If assigned_instagram_accounts is empty, query /me/accounts for Facebook-linked accounts
    // 3. Fallback to comprehensive discovery (businesses, assigned_pages)
    // ─────────────────────────────────────────────────────────────
    let availableInstagramAccounts = [];

    // 1. Standalone Instagram Accounts via /me/assigned_instagram_accounts (Meta Unified Login)
    try {
      const assignedRes = await graphRequest(
        `me/assigned_instagram_accounts?fields=id,username,name,profile_picture_url,followers_count&access_token=${encodeURIComponent(longLivedUserToken)}`
      );
      const assignedList = assignedRes.data || [];
      for (const item of assignedList) {
        if (!item.id) continue;
        availableInstagramAccounts.push({
          instagram: {
            id: item.id,
            username: item.username || `ig_${item.id}`,
            name: item.name || item.username || "Instagram Account",
            profilePictureUrl: item.profile_picture_url || null,
            followersCount: item.followers_count || 0,
            accountType: "BUSINESS",
          },
          pageId: null,
          pageName: null,
          pageToken: longLivedUserToken,
          isUnifiedLogin: true,
          isStandalone: true,
        });
      }
    } catch (assignedErr) {
      console.warn("[MetaOAuthCallback] /me/assigned_instagram_accounts check note:", assignedErr.message);
    }

    // 2. If empty, fall back to Facebook Pages via /me/accounts for Facebook-linked accounts
    if (availableInstagramAccounts.length === 0) {
      try {
        const pagesRes = await graphRequest(
          `me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${encodeURIComponent(longLivedUserToken)}`
        );
        const pagesList = pagesRes.data || [];
        for (const page of pagesList) {
          if (!page.instagram_business_account?.id) continue;
          const ig = page.instagram_business_account;
          availableInstagramAccounts.push({
            instagram: {
              id: ig.id,
              username: ig.username || `ig_${ig.id}`,
              name: ig.name || ig.username || page.name,
              profilePictureUrl: ig.profile_picture_url || null,
              followersCount: ig.followers_count || 0,
              accountType: "BUSINESS",
            },
            pageId: page.id,
            pageName: page.name,
            pageToken: page.access_token,
            isUnifiedLogin: false,
            isStandalone: false,
          });
        }
      } catch (pagesErr) {
        console.warn("[MetaOAuthCallback] /me/accounts check note:", pagesErr.message);
      }
    }

    // 3. Fallback to comprehensive discovery if both direct queries were empty
    if (availableInstagramAccounts.length === 0) {
      try {
        availableInstagramAccounts = await fetchAllInstagramAccounts(longLivedUserToken);
      } catch (fallbackErr) {
        console.warn("[MetaOAuthCallback] fetchAllInstagramAccounts fallback note:", fallbackErr.message);
      }
    }

    if (availableInstagramAccounts.length === 0) {
      // Diagnostic check: check if user has any Facebook Pages without Instagram linked
      let detectedPageName = null;
      try {
        const userPages = await fetchUserFacebookPages(longLivedUserToken);
        if (userPages && userPages.length > 0) {
          detectedPageName = userPages[0].pageName;
        }
      } catch (pageErr) {
        // Non-critical diagnostic check
      }

      const noIgMsg = detectedPageName
        ? `We detected your Facebook Page "${detectedPageName}", but no Instagram Professional account was assigned or linked. Please make sure your Instagram account is Professional and selected during Meta login.`
        : "No Instagram Professional (Business or Creator) account was found assigned or connected. Please make sure your Instagram account is Professional and selected during Meta login.";

      if (isPopupFlow) {
        return popupResponse({ success: false, error: noIgMsg });
      }

      accountsRedirectUrl.searchParams.set("error", "no_instagram_business_account");
      if (detectedPageName) {
        accountsRedirectUrl.searchParams.set("page_name", detectedPageName);
        accountsRedirectUrl.searchParams.set("message", noIgMsg);
      } else {
        accountsRedirectUrl.searchParams.set("message", noIgMsg);
      }
      return redirectWithClearedCookie(accountsRedirectUrl.toString());
    }

    // Connect the primary Instagram Professional account
    const primaryTarget = availableInstagramAccounts[0];

    // 1. If a Facebook Page is attached, subscribe the page webhooks
    if (primaryTarget.pageId && primaryTarget.pageToken) {
      try {
        await subscribePageToWebhooks({
          pageId: primaryTarget.pageId,
          pageAccessToken: primaryTarget.pageToken,
        });
      } catch (webhookErr) {
        console.warn(
          JSON.stringify({
            level: "warn",
            service: "MetaOAuthCallback",
            action: "page_webhook_subscription_warning",
            pageId: primaryTarget.pageId,
            error: webhookErr.message,
          })
        );
      }
    }

    // 2. Subscribe direct Instagram Account webhooks (Unified Login requirement)
    try {
      await subscribeInstagramAccountToWebhooks({
        instagramBusinessId: primaryTarget.instagram.id,
        accessToken: longLivedUserToken,
      });
    } catch (igWebhookErr) {
      console.warn(
        JSON.stringify({
          level: "warn",
          service: "MetaOAuthCallback",
          action: "ig_webhook_subscription_warning",
          instagramId: primaryTarget.instagram.id,
          error: igWebhookErr.message,
        })
      );
    }

    // Enforce 4-account limit for customer workspaces before saving
    if (!isPlatform) {
      const existingAccounts = await accountStore.listAccounts(organizationId);
      const isAlreadyConnected = existingAccounts.some(
        (a) => a.instagramBusinessId === primaryTarget.instagram.id || a.id === primaryTarget.instagram.id
      );
      if (!isAlreadyConnected && existingAccounts.length >= 4) {
        if (isPopupFlow) {
          return popupResponse({
            success: false,
            error: "Maximum limit of 4 connected accounts reached. Please disconnect an existing account first.",
          });
        }
        accountsRedirectUrl.searchParams.set("error", "account_limit_reached");
        accountsRedirectUrl.searchParams.set(
          "message",
          "Maximum limit of 4 connected accounts reached. Please disconnect an existing account first."
        );
        return redirectWithClearedCookie(accountsRedirectUrl.toString());
      }
    }

    // Durably save the account in AccountStore with AES-256-GCM encrypted tokens
    await accountStore.saveAccount({
      organizationId,
      platform: "instagram",
      id: primaryTarget.instagram.id,
      instagramBusinessId: primaryTarget.instagram.id,
      username: primaryTarget.instagram.username,
      name: primaryTarget.instagram.name,
      profilePictureUrl: primaryTarget.instagram.profilePictureUrl,
      accountType: primaryTarget.instagram.accountType || "BUSINESS",
      pageId: primaryTarget.pageId || primaryTarget.instagram.id,
      pageName: primaryTarget.pageName || primaryTarget.instagram.name || primaryTarget.instagram.username,
      accessToken: longLivedUserToken,
      pageToken: primaryTarget.pageToken || longLivedUserToken,
      tokenExpiresAt,
    });

    // Immediately fetch and cache recent Instagram media into database
    try {
      const effectiveMediaToken = primaryTarget.pageToken || longLivedUserToken;
      const mediaResult = await fetchInstagramMedia({
        instagramAccountId: primaryTarget.instagram.id,
        accessToken: effectiveMediaToken,
        limit: 24,
      });
      if (mediaResult && mediaResult.data && mediaResult.data.length > 0) {
        await db.saveInstagramMedia(mediaResult.data, organizationId, primaryTarget.instagram.id);
        console.log(
          JSON.stringify({
            level: "info",
            service: "MetaOAuthCallback",
            action: "initial_media_sync_completed",
            organizationId,
            instagramBusinessId: primaryTarget.instagram.id,
            count: mediaResult.data.length,
          })
        );
      }
    } catch (mediaSyncErr) {
      console.warn(
        JSON.stringify({
          level: "warn",
          service: "MetaOAuthCallback",
          action: "initial_media_sync_warning",
          error: mediaSyncErr.message,
        })
      );
    }

    console.log(
      JSON.stringify({
        level: "info",
        service: "MetaOAuthCallback",
        action: "account_connected_successfully",
        organizationId,
        instagramBusinessId: primaryTarget.instagram.id,
        username: primaryTarget.instagram.username,
      })
    );

    const returnPath = validation.returnTo || (platform === "facebook" ? "/dashboard/accounts" : "/dashboard");
    const destinationUrl = isPlatform
      ? new URL("/admin/integrations", appUrl)
      : new URL(returnPath, appUrl);

    destinationUrl.searchParams.set("success", "connected");
    destinationUrl.searchParams.set("platform", "instagram");
    destinationUrl.searchParams.set("username", primaryTarget.instagram.username);

    if (isPopupFlow) {
      return popupResponse({ success: true, username: primaryTarget.instagram.username, platform: "instagram" });
    }

    const redirectResponse = redirectWithClearedCookie(destinationUrl.toString());

    // Synchronize user session cookie so the browser lands in the exact workspace organization
    const activeUserId = session?.user?.id || validation.userId;
    if (activeUserId) {
      try {
        const freshAccessToken = await createAccessToken({
          userId: activeUserId,
          sessionId: session?.sessionId || `ses_${Date.now()}`,
          orgId: organizationId,
          role: session?.role || "owner",
          isSuperAdmin: Boolean(session?.isSuperAdmin),
        });
        setAuthCookies(redirectResponse, { accessToken: freshAccessToken });
      } catch (tokenErr) {
        console.warn("[MetaOAuthCallback] Session token sync note:", tokenErr.message);
      }
    }

    return redirectResponse;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "MetaOAuthCallback",
        action: "oauth_flow_exception",
        error: err.message,
        status: err.status,
        code: err.code,
      })
    );

    if (isPopupFlow) {
      return popupResponse({ success: false, error: err.message || "Failed to complete Instagram account connection." });
    }

    accountsRedirectUrl.searchParams.set("error", "connection_failed");
    accountsRedirectUrl.searchParams.set(
      "message",
      err.message || "Failed to complete Instagram account connection."
    );
    return redirectWithClearedCookie(accountsRedirectUrl.toString());
  }
}
