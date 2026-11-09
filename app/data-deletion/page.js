import Link from "next/link";
import { Trash2, ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Data Deletion Instructions — RawReply",
  description: "Instructions for deleting your account and associated Meta data from RawReply.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur-xs sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-sm text-foreground">
            <span className="size-6 rounded-md bg-primary-accent flex items-center justify-center text-white text-xs font-black">
              R
            </span>
            RawReply
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="flex items-center gap-1.5 text-xs">
              <ArrowLeft className="size-3.5" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
            <Trash2 className="size-3.5" />
            User Rights & Compliance
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">User Data Deletion Instructions</h1>
          <p className="text-xs text-muted-foreground">In accordance with Meta Platform Terms and GDPR / CCPA standards.</p>
        </div>

        <section className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-foreground">Overview</h2>
            <p>
              RawReply respects your right to control your personal data. If you have connected your Instagram or Facebook
              account to RawReply and wish to delete your data or remove our access, you can do so immediately using any
              of the methods below.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-bold text-foreground">Method 1: Disconnect via RawReply Dashboard (Instant)</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Log in to your RawReply account at <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-xs">/login</code>.</li>
              <li>Navigate to <strong>Dashboard → Instagram Accounts</strong>.</li>
              <li>Find the connected Instagram account and click <strong>Disconnect</strong>.</li>
              <li>
                This immediately unlinks your account, revokes and deletes all encrypted access tokens from our database,
                and unsubscribes your page from all webhooks.
              </li>
            </ol>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-bold text-foreground">Method 2: Remove RawReply from Facebook / Instagram Settings</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Log in to your Facebook account associated with your Instagram business page.</li>
              <li>Go to <strong>Settings & Privacy → Settings → Security and Login → Business Integrations</strong> (or Apps and Websites).</li>
              <li>Find <strong>RawReply</strong> in the list of active integrations.</li>
              <li>Click <strong>Remove</strong> and confirm.</li>
              <li>Meta will immediately revoke all access tokens issued to RawReply.</li>
            </ol>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-bold text-foreground">Method 3: Submit a Full Account Deletion Request</h2>
            <p>
              To permanently erase your entire workspace, lead history, conversation logs, and profile records from our
              servers:
            </p>
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground text-xs">
                <ShieldAlert className="size-4 text-primary-accent" />
                Data Deletion Support
              </div>
              <p className="text-xs">
                Send an email to{" "}
                <a href="mailto:support@rawreply.com" className="text-primary-accent underline font-semibold">
                  support@rawreply.com
                </a>{" "}
                with the subject line <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-foreground">Data Deletion Request</code> from
                the email address associated with your RawReply account.
              </p>
              <p className="text-xs text-muted-foreground">
                Our security team will process your deletion request and purge all database records within 48 business hours.
                A confirmation receipt with a confirmation tracking code will be emailed back to you.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
