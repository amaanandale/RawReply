import { Suspense } from "react";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import {
  Settings,
  Shield,
  Webhook,
  Key,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { accountStore } from "@/lib/storage/account-store";
import {
  META_API_VERSION,
  REQUIRED_META_SCOPES,
  WEBHOOK_SUBSCRIBED_FIELDS,
} from "@/lib/meta/constants";

export const metadata = {
  title: "Settings — RawReply",
  description: "Manage RawReply platform settings, Meta webhook configurations, and security preferences.",
};

async function SettingsDataWrapper() {
  let organizationId = "default_org";
  try {
    const cookieStore = await cookies();
    const session = await getCurrentSession({ cookies: cookieStore });
    if (session?.organizationId) {
      organizationId = session.organizationId;
    }
  } catch {
    // Local dev
  }

  const accounts = await accountStore.listAccounts(organizationId);
  const isMetaConfigured = Boolean(
    process.env.META_APP_ID && process.env.META_APP_SECRET
  );
  const isWebhookConfigured = Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com";
  const webhookCallbackUrl = `${appUrl}/api/webhooks/meta`;
  const oauthRedirectUri = `${appUrl}/api/auth/meta/callback`;

  return (
    <div className="space-y-8">
      {/* Integration Status Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Meta Application
            </span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                Graph API {META_API_VERSION}
              </span>
              <StatusBadge
                status={isMetaConfigured ? "connected" : "not_connected"}
                label={isMetaConfigured ? "Ready" : "Missing Keys"}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isMetaConfigured
                ? "META_APP_ID & SECRET loaded"
                : "Configure in .env.local"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Webhook Listener
            </span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                HMAC-SHA256
              </span>
              <StatusBadge
                status={isWebhookConfigured ? "connected" : "not_connected"}
                label={isWebhookConfigured ? "Active" : "Verify Token Missing"}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {isWebhookConfigured
                ? "HMAC signature verification enabled"
                : "Set META_WEBHOOK_VERIFY_TOKEN"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Connected Accounts
            </span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                {accounts.length} Active
              </span>
              <StatusBadge
                status={accounts.length > 0 ? "active" : "not_connected"}
                label={accounts.length > 0 ? "Linked" : "None Linked"}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {accounts.length > 0
                ? `@${accounts[0].username} receiving events`
                : "Connect via Instagram Accounts"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        {/* Meta Webhook Configuration Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Meta Webhook Endpoints</CardTitle>
                <CardDescription>
                  Configure these URLs inside the Meta App Dashboard under <strong>Instagram → Webhooks</strong>.
                </CardDescription>
              </div>
              <Badge variant="outline">Meta Graph API {META_API_VERSION}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Webhook Callback URL (POST & GET)
              </label>
              <Input
                defaultValue={webhookCallbackUrl}
                readOnly
                className="font-mono text-xs bg-muted/40 min-h-[44px] sm:min-h-[36px]"
              />
              <p className="text-[11px] text-muted-foreground">
                Receives comment triggers and direct messaging webhook notifications.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                OAuth Redirect URI
              </label>
              <Input
                defaultValue={oauthRedirectUri}
                readOnly
                className="font-mono text-xs bg-muted/40 min-h-[44px] sm:min-h-[36px]"
              />
              <p className="text-[11px] text-muted-foreground">
                Add to your Meta App settings under <strong>Facebook Login → Valid OAuth Redirect URIs</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Verification Token (hub.verify_token)
              </label>
              <Input
                defaultValue={
                  isWebhookConfigured
                    ? "•••••••••••••••••••• (Configured in server environment)"
                    : "Not set — Add META_WEBHOOK_VERIFY_TOKEN to .env.local"
                }
                readOnly
                className="font-mono text-xs bg-muted/40 min-h-[44px] sm:min-h-[36px]"
              />
              <p className="text-[11px] text-muted-foreground">
                Secret string shared between Meta and RawReply to verify challenge handshakes.
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-border">
              <span className="text-xs font-semibold text-foreground">
                Subscribed Webhook Fields:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {WEBHOOK_SUBSCRIBED_FIELDS.map((field) => (
                  <Badge key={field} variant="secondary" className="font-mono text-[11px]">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Required Meta Scopes / Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Required Meta Permissions</CardTitle>
            <CardDescription>
              Permissions requested during OAuth and required for production comment-to-DM workflows:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              {REQUIRED_META_SCOPES.map((scope) => (
                <div
                  key={scope}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/20 p-2.5"
                >
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span className="font-mono text-[11px] font-medium text-foreground">
                    {scope}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Settings"
        description="Manage workspace preferences, Meta Graph API connection status, and webhook configurations."
      />

      {/* Dynamic Data wrapped in Suspense for Next.js 16 partial prerendering */}
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        }
      >
        <SettingsDataWrapper />
      </Suspense>
    </div>
  );
}
