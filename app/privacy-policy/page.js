import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata = {
  title: "Privacy Policy — RawReply",
  description:
    "RawReply Privacy Policy. Learn how we collect, process, and protect your information, Instagram data, and qualified leads in compliance with Meta Platform Policies and global data privacy standards.",
  alternates: {
    canonical: "https://rawreply.vercel.app/privacy-policy",
  },
};

const TOC = [
  { label: "1. Overview & Core Philosophy", href: "#overview" },
  { label: "2. Information We Collect", href: "#information-we-collect" },
  { label: "3. Information Accessed via Meta APIs", href: "#meta-apis-information" },
  { label: "4. Qualified Lead Collection Rules", href: "#qualified-leads-rules" },
  { label: "5. How We Use Information", href: "#how-we-use-information" },
  { label: "6. Data Storage & Security", href: "#data-storage-security" },
  { label: "7. Third-Party Services & Processors", href: "#third-party-services" },
  { label: "8. Meta Platform Integration & 24h Window", href: "#meta-platform-integration" },
  { label: "9. Data Retention & Account Deletion", href: "#data-retention-deletion" },
  { label: "10. User Rights (GDPR & CCPA)", href: "#user-rights" },
  { label: "11. Children's Privacy", href: "#childrens-privacy" },
  { label: "12. International Processing & Policy Updates", href: "#updates-and-contact" },
  { label: "13. Contact Information", href: "#contact-information" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      badge="Data Protection & Compliance"
      badgeIcon={ShieldCheck}
      title="Privacy Policy"
      lastUpdated="November 13, 2026"
      description="RawReply is dedicated to transparent, privacy-first automation. We process social media content solely for customer-configured Instagram comment-to-DM workflows and qualified lead management, in strict adherence to Meta Platform Terms."
      tableOfContents={TOC}
    >
      {/* 1. Overview */}
      <section id="overview" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">1. Overview & Core Philosophy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RawReply (&quot;RawReply&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates a Software-as-a-Service (SaaS)
          platform designed to assist businesses, creators, and marketers in turning public Instagram and Facebook
          conversations into qualified sales leads.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Our core architectural principle is <strong>data minimization</strong>. We only process comments and messages
          necessary to execute customer-defined automation triggers. Furthermore, we enforce a strict business rule:
          <em> only commenters who voluntarily provide a verified phone number qualify as leads</em>. Unqualified commenters
          are never permanently saved, and unnecessary conversation logs are never retained.
        </p>
      </section>

      {/* 2. Information We Collect */}
      <section id="information-we-collect" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">2. Information We Collect</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We collect information directly from you when you register an account, configure a team workspace, and use our platform:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Account Registration Information:</strong> Your full name, email address,
            and an encrypted password (hashed server-side using bcrypt with 10 salt rounds).
          </li>
          <li>
            <strong className="text-foreground">Organization Workspace Data:</strong> Workspace name, member invitations,
            and assigned team roles (Owner, Admin, Member).
          </li>
          <li>
            <strong className="text-foreground">Authentication & Session Data:</strong> Short-lived JSON Web Tokens (JWT)
            and cryptographic refresh tokens stored as SHA-256 hashes at rest with rotation and reuse attack detection.
          </li>
          <li>
            <strong className="text-foreground">Google Authentication Information:</strong> If you choose to authenticate
            via Google or connect Google Sheets, we access your verified Google email address, profile identifier, and authorized
            OAuth scopes solely for authentication and spreadsheet lead exports.
          </li>
        </ul>
      </section>

      {/* 3. Information Accessed via Meta APIs */}
      <section id="meta-apis-information" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">3. Information Accessed Through Meta APIs</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          When you connect an Instagram Professional Account (Business or Creator) or a Facebook Page through official Meta OAuth
          v21.0, we access only the scopes approved by Meta and granted by you:
        </p>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3 text-xs">
          <div className="font-semibold text-foreground">Official Scopes Requested & Accessed:</div>
          <ul className="grid gap-2 sm:grid-cols-2 text-muted-foreground">
            <li><code className="text-foreground font-mono">instagram_basic</code>: Account identity & handle</li>
            <li><code className="text-foreground font-mono">instagram_manage_comments</code>: Read & reply to comments</li>
            <li><code className="text-foreground font-mono">instagram_manage_messages</code>: DM qualification workflows</li>
            <li><code className="text-foreground font-mono">pages_show_list</code>: List managed business pages</li>
            <li><code className="text-foreground font-mono">pages_read_engagement</code>: Post & comment engagement</li>
            <li><code className="text-foreground font-mono">pages_manage_metadata</code>: Webhook subscriptions</li>
          </ul>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Through these permissions, RawReply accesses:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>Instagram Business/Creator Account ID, username, and public profile picture.</li>
          <li>Connected Facebook Page ID, name, and access metadata.</li>
          <li>Public posts, Reels, and captions so you can select specific media for automation rules.</li>
          <li>Public comments left on configured posts, evaluated in real-time to match your trigger keywords.</li>
          <li>Direct messages exchanged during active qualification workflows within the permitted 24-hour messaging window.</li>
        </ul>
      </section>

      {/* 4. Qualified Lead Collection Rules */}
      <section id="qualified-leads-rules" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">4. Qualified Lead Collection & Storage Rules</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RawReply adheres to explicit, irreversible business and data-protection rules regarding leads:
        </p>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2 text-xs text-foreground">
          <p className="font-bold text-emerald-700">Permanent Business Rules for RawReply:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>
              <strong>Only customers who voluntarily submit a valid phone number qualify as leads.</strong>
            </li>
            <li>Unqualified commenters who do not submit a phone number are <strong>never permanently saved</strong>.</li>
            <li>No unnecessary conversation storage or transcripts are created or stored on our servers.</li>
            <li>All phone numbers are validated and normalized to international E.164 standards upon receipt.</li>
            <li>Lead creation is strictly <strong>idempotent</strong>: identical phone numbers on the same post never create duplicate records.</li>
            <li>Exports to Microsoft Excel or Google Sheets include deduplication guards to prevent duplicate customer outreach.</li>
          </ul>
        </div>
      </section>

      {/* 5. How We Use Information */}
      <section id="how-we-use-information" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">5. How We Use Your Information</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We use information strictly to deliver RawReply&apos;s documented SaaS features:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>To match comment keywords on your posts and publish public replies on your behalf.</li>
          <li>To initiate private direct message workflows to answer customer questions and request contact details.</li>
          <li>To capture qualified leads and display them inside your authenticated workspace dashboard.</li>
          <li>To export qualified lead sheets to your connected Microsoft Excel workbooks.</li>
          <li>To monitor system health, enforce rate limits, and protect against malicious abuse.</li>
        </ul>
        <p className="text-sm font-semibold text-foreground">
          RawReply does NOT sell, rent, monetize, or trade any customer data, follower information, or qualified leads to data brokers, advertisers, or any third party.
        </p>
      </section>

      {/* 6. Data Storage & Security */}
      <section id="data-storage-security" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">6. Data Storage & Security Controls</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We implement defense-in-depth security practices across our application stack:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">AES-256-GCM Encryption at Rest:</strong> All Meta OAuth access tokens and Page tokens
            are encrypted using authenticated AES-256-GCM with unique 12-byte initialization vectors.
          </li>
          <li>
            <strong className="text-foreground">Server-Side Secret Isolation:</strong> Access tokens and decryption keys are
            strictly isolated to server runtimes. Tokens are never transmitted to client browsers or exposed in API responses.
          </li>
          <li>
            <strong className="text-foreground">HMAC-SHA256 Webhook Verification:</strong> Every incoming Meta webhook payload is
            cryptographically verified using SHA-256 HMAC signatures prior to ingestion.
          </li>
          <li>
            <strong className="text-foreground">Multi-Tenant Organization Isolation:</strong> All automations, leads, and connected
            accounts are strictly partitioned by organization workspace ID. Cross-tenant queries are blocked server-side.
          </li>
          <li>
            <strong className="text-foreground">TLS 1.3 in Transit:</strong> All data transmitted between your browser, our servers,
            and Meta&apos;s Graph API is encrypted in transit using industry-standard HTTPS / TLS.
          </li>
        </ul>
      </section>

      {/* 7. Third-Party Services & Processors */}
      <section id="third-party-services" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">7. Third-Party Services & Subprocessors</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RawReply integrates with trusted infrastructure providers and third-party APIs:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Meta Platforms, Inc. (Instagram & Facebook):</strong> For OAuth login,
            content retrieval, comment management, and direct messaging via the Meta Graph API v21.0.
          </li>
          <li>
            <strong className="text-foreground">Microsoft Corporation:</strong> For authorized Microsoft Graph API integrations
            allowing workspace admins to export leads to Microsoft Excel online workbooks.
          </li>
          <li>
            <strong className="text-foreground">Hosting & Infrastructure:</strong> Vercel and cloud database infrastructure
            for application hosting and durable data persistence.
          </li>
          <li>
            <strong className="text-foreground">Email Service Provider:</strong> Secure SMTP or transactional email providers
            for password reset verification OTPs.
          </li>
        </ul>
      </section>

      {/* 8. Meta Platform Integration & 24-Hour Messaging Window */}
      <section id="meta-platform-integration" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">8. Meta Platform Integration & Messaging Policy Compliance</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RawReply is an independent software application built to operate in complete compliance with Meta&apos;s developer terms:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">24-Hour Customer Care Window:</strong> In accordance with Meta Platform Terms,
            automated direct messages are sent exclusively in response to user actions and within the official 24-hour messaging window.
            RawReply never attempts to dispatch outbound broadcast messages or spam outside this permitted window.
          </li>
          <li>
            <strong className="text-foreground">Meta Rate Limits:</strong> All API requests respect Meta Graph API rate limits,
            with built-in backoff, concurrency controls, and idempotent execution guards.
          </li>
          <li>
            <strong className="text-foreground">Content Moderation & Safety:</strong> We do not facilitate bulk spam, harassment,
            phishing, deceptive marketing, or violation of Instagram Community Guidelines.
          </li>
        </ul>
      </section>

      {/* 9. Data Retention & Deletion */}
      <section id="data-retention-deletion" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">9. Data Retention & Account Deletion</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We retain your workspace configuration and qualified leads only for as long as your account remains active.
          When an Instagram account is disconnected, all associated OAuth tokens are immediately revoked and permanently erased
          from our database.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Users can disconnect accounts or submit complete data deletion requests at any time. For step-by-step instructions
          and our live deletion status lookup tool, visit our{" "}
          <Link href="/data-deletion" className="text-emerald-600 underline font-semibold hover:text-emerald-700">
            User Data Deletion Instructions page
          </Link>
          .
        </p>
      </section>

      {/* 10. User Rights */}
      <section id="user-rights" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">10. User Rights (GDPR & CCPA)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Depending on your jurisdiction, you hold enforceable rights regarding your personal information:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li><strong className="text-foreground">Right of Access:</strong> You can request a summary of the personal data we hold about you.</li>
          <li><strong className="text-foreground">Right to Rectification:</strong> You can update inaccurate account details in your settings.</li>
          <li><strong className="text-foreground">Right to Erasure (Right to be Forgotten):</strong> You can request complete deletion of your records.</li>
          <li><strong className="text-foreground">Right to Data Portability:</strong> You can export qualified leads to Excel or CSV at any time.</li>
          <li><strong className="text-foreground">Right to Withdraw Consent:</strong> You can disconnect your social accounts or remove RawReply permissions via Facebook settings.</li>
        </ul>
      </section>

      {/* 11. Children's Privacy */}
      <section id="childrens-privacy" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">11. Children&apos;s Privacy</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RawReply is a commercial SaaS solution for professional creators and businesses. It is not directed to, marketed to,
          or intended for children under the age of 13 (or under 16 in applicable jurisdictions). We do not knowingly collect
          personal data from children. If we become aware that a child has provided us with personal information, we will take
          immediate steps to delete such data.
        </p>
      </section>

      {/* 12. Updates and Contact */}
      <section id="updates-and-contact" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">12. International Data Processing & Policy Updates</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you access RawReply from outside the United States, please be aware that your data may be processed on servers
          located in secure cloud data centers globally. By using our service, you acknowledge and consent to this processing
          in accordance with this Privacy Policy.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We may update this Privacy Policy periodically to reflect enhancements to our features or changes in regulatory requirements.
          Material updates will be communicated through our website or via email to registered workspace owners.
        </p>
      </section>

      {/* 13. Contact Information */}
      <section id="contact-information" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">13. Contact Information</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          For any inquiries, data privacy questions, or rights requests regarding this Privacy Policy, please reach out to our team:
        </p>
        <div className="rounded-lg border border-border bg-card p-4 space-y-1.5 text-xs">
          <div className="font-semibold text-foreground">RawReply Security & Privacy Team</div>
          <p className="text-muted-foreground">
            Contact Email:{" "}
            <a href="mailto:support@rawreply.com" className="text-emerald-600 underline font-semibold">
              support@rawreply.com
            </a>
          </p>
          <p className="text-muted-foreground">
            Website:{" "}
            <a href="https://rawreply.vercel.app" className="text-emerald-600 underline">
              https://rawreply.vercel.app
            </a>
          </p>
          <p className="text-muted-foreground">
            Data Deletion Requests:{" "}
            <Link href="/data-deletion" className="text-emerald-600 underline">
              https://rawreply.vercel.app/data-deletion
            </Link>
          </p>
        </div>
      </section>
    </LegalLayout>
  );
}
