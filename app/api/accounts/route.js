import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { accountStore } from "@/lib/storage/account-store";
import { unsubscribePageFromWebhooks } from "@/lib/meta/client";

async function resolveSessionContext(req) {
  try {
    const session = await getCurrentSession(req);
    return {
      organizationId: session?.organizationId || "default_org",
      role: session?.role || "owner",
    };
  } catch {
    return { organizationId: "default_org", role: "owner" };
  }
}

/**
 * GET /api/accounts
 * Lists all sanitized Instagram accounts connected to the active organization.
 */
export async function GET(req) {
  const { organizationId } = await resolveSessionContext(req);
  try {
    const accounts = await accountStore.listAccounts(organizationId);
    return NextResponse.json({ accounts });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to load accounts: ${err.message}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts/disconnect
 * Disconnects an account, unsubscribes webhooks where supported, and deletes credentials.
 */
export async function POST(req) {
  const { organizationId, role } = await resolveSessionContext(req);

  if (!hasPermission(role, PERMISSIONS.DISCONNECT_INSTAGRAM)) {
    return NextResponse.json(
      { error: "You do not have permission to disconnect Instagram accounts." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { instagramAccountId } = body;

    if (!instagramAccountId) {
      return NextResponse.json(
        { error: "instagramAccountId is required" },
        { status: 400 }
      );
    }

    // Try unsubscribing from webhooks if page token is available
    try {
      const tokens = await accountStore.getDecryptedTokens(
        organizationId,
        instagramAccountId
      );
      const account = await accountStore.getAccount(
        organizationId,
        instagramAccountId
      );
      if (account?.pageId && tokens?.pageToken) {
        await unsubscribePageFromWebhooks({
          pageId: account.pageId,
          pageAccessToken: tokens.pageToken,
        });
      }
    } catch (unsubErr) {
      console.warn(
        "[AccountManagement] Webhook unsubscribe warning on disconnect:",
        unsubErr.message
      );
    }

    const result = await accountStore.disconnectAccount(
      organizationId,
      instagramAccountId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to disconnect account" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Instagram account disconnected successfully",
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Disconnect failed: ${err.message}` },
      { status: 500 }
    );
  }
}

