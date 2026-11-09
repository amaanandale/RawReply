import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy — RawReply",
  description: "RawReply Privacy Policy and data handling practices for Instagram automation.",
};

export default function PrivacyPolicyPage() {
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-accent-light text-primary-accent text-xs font-semibold">
            <ShieldCheck className="size-3.5" />
            Legal & Security
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground">Last updated: November 9, 2026</p>
        </div>

        <section className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-foreground">1. Introduction</h2>
            <p>
              RawReply (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides an automated comment-to-DM lead qualification
              platform for Instagram Business and Creator accounts. This Privacy Policy explains how we collect, use,
              and safeguard your information when you connect your Instagram account and use our services.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-foreground">2. Information We Access via Meta APIs</h2>
            <p>
              When you authenticate with Meta and connect your Instagram Professional Account, we access the following
              data strictly necessary to operate your automations:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your Instagram Business Account ID, username, and profile picture.</li>
              <li>Facebook Pages linked to your Instagram Professional Account.</li>
              <li>Public media (photos, Reels, videos) and captions to allow you to configure automations.</li>
              <li>Public comments left on your configured posts to evaluate trigger keywords.</li>
              <li>Direct messages exchanged within configured qualification flows.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-foreground">3. How We Use Your Information</h2>
            <p>We use the data accessed through Meta APIs solely to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Detect configured trigger keywords on your Instagram posts.</li>
              <li>Publish public replies and dispatch automated private qualification messages on your behalf.</li>
              <li>Extract voluntarily submitted phone numbers to qualify leads for your workspace.</li>
              <li>Export qualified leads to your connected Excel or Google Sheets destinations.</li>
            </ul>
            <p className="font-semibold text-foreground">
              We never sell, rent, or trade your personal data or your customers&apos; information to third parties.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-foreground">4. Token Storage and Security</h2>
            <p>
              All Meta OAuth access tokens and page tokens are encrypted at rest using industry-standard
              AES-256-GCM encryption with unique initialization vectors. Access tokens are never transmitted to client
              browsers and are strictly used server-side for authorized automation calls.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-foreground">5. Data Retention & Deletion</h2>
            <p>
              We retain qualified lead records only as long as your workspace account remains active. You can disconnect
              your Instagram account or request data deletion at any time by visiting our{" "}
              <Link href="/data-deletion" className="text-primary-accent underline font-semibold">
                Data Deletion Instructions
              </Link>
              .
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-bold text-foreground">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or your data, please contact our security team at{" "}
              <a href="mailto:support@rawreply.com" className="text-primary-accent underline font-semibold">
                support@rawreply.com
              </a>
              .
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
