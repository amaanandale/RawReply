import Link from "next/link";
import { Scale } from "lucide-react";
import { LegalLayout } from "@/components/legal/legal-layout";

export const metadata = {
  title: "Terms of Service — RawReply",
  description:
    "RawReply Terms of Service. Review our service terms, acceptable use policies, Meta platform compliance obligations, and user responsibilities.",
  alternates: {
    canonical: "https://rawreply.vercel.app/terms-of-service",
  },
};

const TOC = [
  { label: "1. Acceptance of Terms", href: "#acceptance-of-terms" },
  { label: "2. Description of RawReply Service", href: "#service-description" },
  { label: "3. Account Registration & Security", href: "#account-registration" },
  { label: "4. Meta & Instagram Integration", href: "#meta-integration" },
  { label: "5. Automation Rules & Messaging Window", href: "#automation-rules" },
  { label: "6. Qualified Lead Collection", href: "#qualified-leads" },
  { label: "7. Acceptable Use & Prohibited Activities", href: "#acceptable-use" },
  { label: "8. Third-Party Services & Disclaimers", href: "#third-party-services" },
  { label: "9. Intellectual Property", href: "#intellectual-property" },
  { label: "10. Termination & Suspension", href: "#termination-suspension" },
  { label: "11. Disclaimer of Warranties", href: "#disclaimer-warranties" },
  { label: "12. Limitation of Liability", href: "#limitation-liability" },
  { label: "13. Modifications & Contact Information", href: "#modifications-contact" },
];

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      badge="Service Agreement"
      badgeIcon={Scale}
      title="Terms of Service"
      lastUpdated="November 13, 2026"
      description="These Terms of Service govern your access to and use of the RawReply website, customer dashboards, APIs, and automated comment-to-DM lead management tools. By registering an account or connecting social channels, you agree to these terms."
      tableOfContents={TOC}
    >
      {/* 1. Acceptance */}
      <section id="acceptance-of-terms" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">1. Acceptance of Terms</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          By creating an account on RawReply, accessing our web application, or connecting an Instagram Business Account or Facebook
          Page to RawReply (&quot;Service&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), you (&quot;User&quot;, &quot;Customer&quot;,
          or &quot;you&quot;) agree to be legally bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you are entering into these Terms on behalf of a company, organization, or other legal entity, you represent and warrant
          that you have the legal authority to bind that entity. If you do not agree to these Terms, you must not access or use RawReply.
        </p>
      </section>

      {/* 2. Service Description */}
      <section id="service-description" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">2. Description of RawReply Service</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RawReply provides a multi-tenant cloud SaaS platform that connects to official Meta Graph APIs to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>Monitor public comments left on authorized Instagram posts, Reels, and Facebook Page feed items.</li>
          <li>Evaluate comments against user-configured keywords using contains, exact, or open triggers.</li>
          <li>Publish automated, contextual public replies to matched comments.</li>
          <li>Send automated direct messages (DMs) to commenters to collect customer requirements and contact information.</li>
          <li>Extract voluntarily submitted mobile phone numbers, qualify leads with E.164 normalization, and export leads to Microsoft Excel workbooks.</li>
        </ul>
      </section>

      {/* 3. Account Registration & Security */}
      <section id="account-registration" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">3. Account Registration, Workspaces & Security</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To use RawReply, you must register for an account using a valid email address and secure password. You agree to:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>Provide accurate, current, and complete registration information.</li>
          <li>Verify your email address via our one-time passcode (OTP) system.</li>
          <li>Maintain the confidentiality of your account credentials and restrict unauthorized access.</li>
          <li>Accept responsibility for all activities that occur under your workspace account.</li>
          <li>Notify RawReply immediately of any known or suspected security breach or unauthorized account use.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Organization Workspaces support Role-Based Access Control (Owner, Admin, Member). Workspace Owners and Admins are
          responsible for managing member permissions and verifying that invited collaborators comply with these Terms.
        </p>
      </section>

      {/* 4. Meta & Instagram Integration */}
      <section id="meta-integration" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">4. Meta & Instagram Integration Requirements</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To enable automations, you must connect eligible social accounts using Meta&apos;s official OAuth flow. You represent and warrant that:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            You are the authorized owner or administrative manager of the Instagram Professional Account (Business or Creator)
            and the linked Facebook Page you connect.
          </li>
          <li>
            You will comply at all times with the{" "}
            <a href="https://developers.facebook.com/terms/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">
              Meta Platform Terms
            </a>
            , Developer Policies, and{" "}
            <a href="https://help.instagram.com/477434105621119" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">
              Instagram Community Guidelines
            </a>
            .
          </li>
          <li>
            You understand that each customer workspace may connect up to four (4) active social accounts (Instagram and Facebook Pages combined).
          </li>
          <li>
            You acknowledge that Meta may revoke permissions or modify API functionality at any time, and RawReply is not liable for
            disruptions resulting from Meta platform actions or policy changes.
          </li>
        </ul>
      </section>

      {/* 5. Automation Rules & Messaging Window */}
      <section id="automation-rules" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">5. Automation Rules & 24-Hour Messaging Window</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RawReply automations operate strictly within Meta&apos;s designated 24-hour customer messaging window:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>Automated direct messages may only be sent to individuals who have initiated a conversation or left a public comment on your connected post.</li>
          <li>You agree not to configure automations that send repetitive, unsolicited, or harassing messages.</li>
          <li>You must ensure that automated messages accurately identify your business and deliver value relevant to the user&apos;s comment.</li>
          <li>You may not use automation workflows to bypass or circumvent Meta&apos;s rate limits or spam detection algorithms.</li>
        </ul>
      </section>

      {/* 6. Qualified Lead Collection */}
      <section id="qualified-leads" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">6. Qualified Lead Collection & Commercial Compliance</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RawReply enforces strict lead qualification criteria:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>
            <strong>Voluntary Submission:</strong> Only commenters who voluntarily and explicitly provide a valid telephone number
            in response to your DM prompts are captured as qualified leads.
          </li>
          <li>
            <strong>Consent & Marketing Laws:</strong> You are solely responsible for ensuring that your collection and subsequent
            use of telephone numbers complies with applicable telemarketing, SMS, and data protection laws (such as TCPA, CAN-SPAM, GDPR, and CASL).
          </li>
          <li>
            <strong>No Unqualified Data Retention:</strong> Unqualified commenters who do not submit a phone number are discarded
            and never permanently stored on RawReply servers.
          </li>
          <li>
            <strong>Export Destination Responsibility:</strong> When you configure exports to Microsoft Excel or Google Sheets,
            you are responsible for securing the destination spreadsheet and controlling access to exported customer data.
          </li>
        </ul>
      </section>

      {/* 7. Acceptable Use & Prohibited Activities */}
      <section id="acceptable-use" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">7. Acceptable Use & Prohibited Activities</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You agree not to use RawReply for any unlawful or abusive purpose. Specifically, you may not:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>Send unsolicited marketing messages, bulk spam, pyramid schemes, or phishing communications.</li>
          <li>Distribute content that is defamatory, obscene, fraudulent, hateful, discriminatory, or infringing on intellectual property.</li>
          <li>Harvest, scrape, or extract personal information of Instagram or Facebook users without express authorization.</li>
          <li>Probe, scan, or test the vulnerability of RawReply servers, APIs, authentication systems, or connected networks.</li>
          <li>Reverse engineer, decompile, or disassemble any portion of the RawReply software.</li>
          <li>Interfere with or disrupt the integrity or performance of the Service or third-party APIs.</li>
          <li>Use RawReply to promote illegal goods, regulated drugs, counterfeit products, or deceptive financial schemes.</li>
        </ul>
      </section>

      {/* 8. Third-Party Services */}
      <section id="third-party-services" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">8. Third-Party Services & Independent Status</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RawReply is an independent SaaS tool and is <strong>not affiliated with, associated with, authorized by, endorsed by,
          or in any way officially connected with Meta Platforms, Inc., Instagram, or Microsoft Corporation</strong>.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The names &quot;Meta&quot;, &quot;Instagram&quot;, &quot;Facebook&quot;, and &quot;Microsoft Excel&quot; are registered trademarks of their
          respective owners. Your use of third-party platforms is subject to their independent terms and privacy policies.
        </p>
      </section>

      {/* 9. Intellectual Property */}
      <section id="intellectual-property" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">9. Intellectual Property Rights</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          RawReply retains all right, title, and interest in and to the platform, including all software, source code, designs,
          trademarks, algorithms, and documentation. You receive a limited, non-exclusive, non-transferable license to access
          and use the Service in accordance with these Terms during your active subscription.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You retain all ownership rights in the content you publish on Instagram and the qualified sales leads collected through your automations.
        </p>
      </section>

      {/* 10. Termination & Suspension */}
      <section id="termination-suspension" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">10. Account Suspension & Termination</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We reserve the right to suspend or terminate your account and access to RawReply at our sole discretion, without prior notice, if:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          <li>You breach any provision of these Terms or our Privacy Policy.</li>
          <li>Meta notifies us of policy violations or requests restriction of your connected accounts.</li>
          <li>Your account demonstrates suspicious activity, abusive automation frequency, or fraudulent engagement.</li>
          <li>Required subscription fees are unpaid or disputed.</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You may terminate your account at any time by disconnecting your accounts and submitting a data deletion request.
        </p>
      </section>

      {/* 11. Disclaimer of Warranties */}
      <section id="disclaimer-warranties" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">11. Disclaimer of Warranties</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER
          EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          NON-INFRINGEMENT, OR UNINTERRUPTED OPERATION.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We do not guarantee that automations will run without error, that Meta APIs will remain accessible without downtime,
          or that using RawReply will result in any specific volume of sales leads or revenue.
        </p>
      </section>

      {/* 12. Limitation of Liability */}
      <section id="limitation-liability" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">12. Limitation of Liability</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL RAWREPLY, ITS OFFICERS, DIRECTORS, EMPLOYEES,
          OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS,
          DATA, GOODWILL, OR BUSINESS INTERRUPTION, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED THE TOTAL AMOUNT PAID BY YOU TO RAWREPLY
          IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE INCIDENT GIVING RISE TO LIABILITY.
        </p>
      </section>

      {/* 13. Modifications & Contact */}
      <section id="modifications-contact" className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">13. Modifications & Contact Information</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We reserve the right to modify these Terms at any time. When we make material changes, we will update the &quot;Last updated&quot;
          date at the top of this page and post a notice on our website. Continued use of RawReply after updates constitutes your acceptance of the revised Terms.
        </p>
        <div className="rounded-lg border border-border bg-card p-4 space-y-1.5 text-xs">
          <div className="font-semibold text-foreground">Questions Regarding These Terms:</div>
          <p className="text-muted-foreground">
            Email:{" "}
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
        </div>
      </section>
    </LegalLayout>
  );
}
