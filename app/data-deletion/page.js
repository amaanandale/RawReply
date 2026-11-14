import { Suspense } from "react";
import Link from "next/link";
import { Trash2, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { LegalLayout } from "@/components/legal/legal-layout";
import { DataDeletionStatusChecker } from "@/components/legal/data-deletion-status";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "User Data Deletion Instructions — RawReply",
  description:
    "Instructions for requesting deletion of your RawReply account, disconnecting Instagram/Facebook integrations, and checking Meta automated data deletion callback status.",
  alternates: {
    canonical: "https://rawreply.vercel.app/data-deletion",
  },
};

const TOC = [
  { label: "1. Real-Time Status Checker", href: "#status-checker" },
  { label: "2. Disconnect Instagram via Dashboard", href: "#method-dashboard" },
  { label: "3. Remove via Facebook Settings", href: "#method-facebook" },
  { label: "4. Full Account Erasure Request", href: "#method-support" },
  { label: "5. How Requests Are Verified", href: "#verification-process" },
  { label: "6. How Requests Are Processed", href: "#processing-timeline" },
  { label: "7. Impact on Leads & Records", href: "#impact-on-leads" },
  { label: "8. Legitimate Retention Exceptions", href: "#retention-exceptions" },
  { label: "9. Contact & Support", href: "#contact-support" },
];

export default function DataDeletionPage() {
  return (
    <LegalLayout
      badge="User Rights & GDPR / CCPA Compliance"
      badgeIcon={Trash2}
      title="User Data Deletion Instructions"
      lastUpdated="November 13, 2026"
      description="RawReply respects your fundamental right to data ownership, erasure, and privacy. Below are the supported procedures to disconnect social media channels, purge integration tokens, check Meta callback status, or request complete account erasure."
      tableOfContents={TOC}
    >
      {/* 1. Live Status Checker */}
      <section id="status-checker" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">1. Meta Automated Deletion Status Checker</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you removed the RawReply app from your Facebook or Instagram settings, Meta automatically dispatched an
          authenticated deletion webhook to our servers. Enter your confirmation code below to view your real-time completion receipt:
        </p>
        <Suspense fallback={<Skeleton className="h-44 w-full rounded-xl" />}>
          <DataDeletionStatusChecker />
        </Suspense>
      </section>

      {/* 2. Method 1: Disconnect via Dashboard */}
      <section id="method-dashboard" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">2. Method 1: Disconnect via RawReply Dashboard (Instant)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you wish to remove RawReply&apos;s access to your Instagram account or Facebook Page without deleting your entire customer account:
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
          <li>
            Log in to your RawReply customer dashboard at{" "}
            <Link href="/login" className="text-emerald-600 underline font-medium">
              /login
            </Link>
            .
          </li>
          <li>
            Navigate to <strong>Dashboard &rarr; Connected Accounts</strong> (or visit{" "}
            <Link href="/dashboard/accounts" className="text-emerald-600 underline font-medium">
              /dashboard/accounts
            </Link>
            ).
          </li>
          <li>Locate the Instagram account or Facebook Page you wish to unlink.</li>
          <li>
            Click the <strong className="text-foreground">Disconnect</strong> button and confirm the action.
          </li>
        </ol>
        <div className="rounded-lg border border-border bg-card p-4 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <CheckCircle2 className="size-4" />
            <span>Immediate Technical Actions Taken:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Encrypted User Access Tokens and Page Access Tokens are immediately deleted from our database.</li>
            <li>Your Facebook Page is unsubscribed from all active Instagram and Messenger webhook events.</li>
            <li>All automated public comment replies and direct message workflows for that account cease immediately.</li>
          </ul>
        </div>
      </section>

      {/* 3. Method 2: Remove via Facebook Settings */}
      <section id="method-facebook" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">3. Method 2: Remove RawReply from Facebook / Instagram Settings</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You can revoke RawReply&apos;s API permissions directly from your Meta / Facebook account settings at any time:
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Log in to the personal Facebook account that manages your Instagram Professional business page.</li>
          <li>
            Go to <strong>Settings & Privacy &rarr; Settings &rarr; Apps and Websites</strong> (or Business Integrations).
          </li>
          <li>Find <strong>RawReply</strong> in the list of active integrations.</li>
          <li>
            Click <strong>Remove</strong>. Meta will prompt you to confirm the removal.
          </li>
          <li>
            Meta automatically sends an authenticated signed data deletion callback to our server endpoint (
            <code className="text-foreground font-mono text-xs">/api/auth/meta/data-deletion</code>), generating a unique confirmation code.
          </li>
        </ol>
      </section>

      {/* 4. Method 3: Full Account Erasure */}
      <section id="method-support" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">4. Method 3: Complete Account & Workspace Erasure Request</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you wish to permanently erase your entire RawReply account, organization workspace, user profile, lead history,
          and automation configurations:
        </p>
        <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-foreground text-sm">
            <ShieldAlert className="size-4 text-emerald-600" />
            <span>Official Deletion Request Procedure</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Send an email to our data compliance team from the registered email address associated with your RawReply account:
          </p>
          <div className="rounded-md bg-muted/60 p-3 font-mono space-y-1 text-foreground">
            <div><strong>To:</strong> support@rawreply.com</div>
            <div><strong>Subject:</strong> Data Deletion Request — [Your Registered Email]</div>
            <div><strong>Body:</strong> I hereby request the complete and permanent deletion of my RawReply user account, workspace records, and all associated personal data.</div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Because account deletion is irreversible, our compliance team confirms the identity of the requester to prevent
            malicious unauthorized deletion of business workspace assets.
          </p>
        </div>
      </section>

      {/* 5. How Requests Are Verified */}
      <section id="verification-process" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">5. How Deletion Requests Are Verified</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To protect account holders against unauthorized deletion or account tampering, RawReply verifies all incoming requests:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Meta Automated Callbacks:</strong> Verified cryptographically using HMAC-SHA256 signatures
            generated with our secret <code className="font-mono text-xs">META_APP_SECRET</code>. Unsigned or invalid requests are rejected immediately.
          </li>
          <li>
            <strong className="text-foreground">Dashboard Deletions:</strong> Protected by active JSON Web Token (JWT) session verification,
            HttpOnly security cookies, and role-based permissions (Workspace Owner or Admin).
          </li>
          <li>
            <strong className="text-foreground">Email Support Requests:</strong> Must originate from the verified owner email address
            on file. Our team may send a one-time confirmation token to the registered inbox before initiating destructive database purges.
          </li>
        </ul>
      </section>

      {/* 6. Processing Timeline */}
      <section id="processing-timeline" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">6. How Requests Are Processed & Timeline</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-lg border border-border bg-card p-4 space-y-1.5">
            <div className="font-bold text-foreground">Automated Webhooks & Disconnections</div>
            <p className="text-muted-foreground">
              <strong>Timeline: Instant (Real-Time)</strong>
            </p>
            <p className="text-muted-foreground">
              Tokens are revoked and purged immediately upon button click or receipt of Meta&apos;s signed webhook. Webhook event subscriptions are removed synchronously.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 space-y-1.5">
            <div className="font-bold text-foreground">Full Workspace Erasure</div>
            <p className="text-muted-foreground">
              <strong>Timeline: Within 48 Business Hours</strong>
            </p>
            <p className="text-muted-foreground">
              Customer profile, hashed passwords, workspace memberships, and automation workflows are permanently scrubbed from production and backup stores.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Impact on Qualified Leads */}
      <section id="impact-on-leads" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">7. What Happens to Qualified Leads & Records</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          When an account or workspace is erased:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>All qualified lead phone numbers, contact records, and export histories stored in RawReply are permanently destroyed.</li>
          <li>Existing exported spreadsheets in your external Microsoft Excel or Google Drive remain in your personal ownership and control.</li>
          <li>Commenters who did not submit a phone number were never saved to permanent storage, requiring no additional purging.</li>
          <li>Once deletion is executed, it is mathematically and technically irreversible.</li>
        </ul>
      </section>

      {/* 8. Legitimate Retention Exceptions */}
      <section id="retention-exceptions" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">8. Legitimate Retention Exceptions</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          In strict compliance with statutory commercial law and global privacy frameworks (GDPR Article 17(3)):
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Financial & Billing Records:</strong> Invoice records, transaction identifiers,
            and subscription payment history must be retained for up to 7 years to satisfy federal tax, auditing, and corporate statutory obligations.
          </li>
          <li>
            <strong className="text-foreground">Security & Audit Logs:</strong> Anonymized security logs (recording that a deletion
            confirmation code was generated and fulfilled) are retained to demonstrate regulatory compliance with Meta Developer Policies and GDPR accountability requirements.
          </li>
        </ul>
      </section>

      {/* 9. Contact & Support */}
      <section id="contact-support" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">9. Contact & Support Regarding Data Deletion</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you have questions regarding our data retention practices, encounter issues disconnecting an account, or require
          expedited verification of a pending request, please contact our security team:
        </p>
        <div className="rounded-lg border border-border bg-card p-4 space-y-1.5 text-xs">
          <div className="font-semibold text-foreground">RawReply Data Privacy Officer</div>
          <p className="text-muted-foreground">
            Email:{" "}
            <a href="mailto:support@rawreply.com" className="text-emerald-600 underline font-semibold">
              support@rawreply.com
            </a>
          </p>
          <p className="text-muted-foreground">
            Production Website:{" "}
            <a href="https://rawreply.vercel.app" className="text-emerald-600 underline">
              https://rawreply.vercel.app
            </a>
          </p>
        </div>
      </section>
    </LegalLayout>
  );
}
