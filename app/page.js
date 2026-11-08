import Link from "next/link";
import {
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  FileSpreadsheet,
  Zap,
  Phone,
  HelpCircle,
  Sparkles,
  Layers,
  ChevronDown,
  Check,
  Lock,
} from "lucide-react";
import { Instagram } from "@/components/shared/icons";
import { ProductDemoVideo } from "@/components/landing/product-demo-video";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { PUBLIC_NAV_ITEMS } from "@/config/navigation";
import { PRICING_PLANS } from "@/config/pricing";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export const metadata = {
  title: "RawReply — Turn Instagram Conversations Into Qualified Leads",
  description:
    "Automate Instagram conversations, collect customer requirements, and capture verified mobile phone leads without manually managing every interaction.",
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ─── 1. Navigation ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Logo & Wordmark */}
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
              <MessageCircle className="size-4" />
            </div>
            <span className="text-base tracking-tight">{APP_NAME}</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            {PUBLIC_NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login" className="text-xs">
                Log in
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup" className="text-xs">
                Get Started
                <ArrowRight className="size-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ─── 2. Hero Section ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="mx-auto max-w-6xl px-6 text-center">
            {/* Meta Compliance Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3.5 py-1 text-xs text-muted-foreground mb-6">
              <span className="flex size-1.5 rounded-full bg-emerald-500" />
              <span className="font-medium text-foreground">Official Meta Graph API</span>
              <span className="text-muted-foreground/60">•</span>
              <span>24h Messaging Compliant</span>
            </div>

            {/* Headline */}
            <h1 className="mx-auto max-w-4xl text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl leading-[1.15]">
              Turn Instagram Conversations Into{" "}
              <span className="text-primary-accent">Qualified Leads.</span>
            </h1>

            {/* Supporting Text */}
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg">
              Automate Instagram conversations, collect customer requirements and capture verified mobile phone leads without manually managing every interaction.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Button size="lg" asChild className="w-full sm:w-auto h-11 px-6 font-semibold">
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full sm:w-auto h-11 px-6 font-medium">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>

            {/* Core Principle Callout */}
            <p className="mt-4 text-xs text-muted-foreground">
              Zero noise guarantee: Commenters only qualify as leads when they provide a valid mobile number.
            </p>

            {/* ─── Hero Product Dashboard Mockup ────────────────────────────── */}
            <div id="product" className="mt-14 overflow-hidden rounded-xl border border-border bg-card shadow-lg text-left">
              {/* Fake Browser Top Chrome */}
              <div className="flex h-10 items-center justify-between border-b border-border bg-muted/50 px-4">
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-full bg-border" />
                  <div className="size-2.5 rounded-full bg-border" />
                  <div className="size-2.5 rounded-full bg-border" />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  rawreply.com/dashboard/leads
                </span>
                <div className="w-8" />
              </div>

              {/* Realistic Dashboard Preview */}
              <div className="p-4 sm:p-6 bg-background space-y-6">
                {/* Metric Strip */}
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-border bg-card p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Qualified Leads
                    </span>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                      142
                    </p>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      Phone verified
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Active Automations
                    </span>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                      4
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      Across 3 post campaigns
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Connected Account
                    </span>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                      1
                    </p>
                    <span className="text-[10px] text-primary-accent font-medium">
                      @business.official
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3.5">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Leads Today
                    </span>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                      18
                    </p>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      Ready for Excel sync
                    </span>
                  </div>
                </div>

                {/* Workflow Simulation Row */}
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3">
                    <span className="text-xs font-semibold text-foreground">
                      Live Lead Qualification Flow: Comment → DM Questionnaire → Phone Number Gate
                    </span>
                    <Badge variant="success" className="text-[10px]">
                      100% Qualified Only
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 text-xs">
                    <div className="rounded-md border border-border bg-card p-3">
                      <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1 text-[11px]">
                        <MessageCircle className="size-3 text-primary-accent" />
                        1. Post Comment
                      </span>
                      <p className="text-muted-foreground font-mono text-[11px]">
                        @sara_design: &ldquo;Send me details about pricing!&rdquo;
                      </p>
                    </div>

                    <div className="rounded-md border border-border bg-card p-3">
                      <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1 text-[11px]">
                        <Zap className="size-3 text-primary-accent" />
                        2. Automated Questionnaire
                      </span>
                      <p className="text-muted-foreground text-[11px]">
                        Collected: Team size (5-10), Implementation date (ASAP).
                      </p>
                    </div>

                    <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
                      <span className="font-semibold text-emerald-800 flex items-center gap-1.5 mb-1 text-[11px]">
                        <Phone className="size-3 text-emerald-600" />
                        3. Phone Number Verified
                      </span>
                      <p className="text-emerald-700 font-mono text-[11px]">
                        +1 (555) 019-2834 → <strong className="text-emerald-900">Lead Qualified & Saved</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. How It Works (Product Demo Video) ────────────────────────── */}
        <section id="how-it-works" className="border-t border-border bg-muted/30 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-6">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                HOW IT WORKS
              </span>
              <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl leading-tight">
                From Instagram Comment to Automated Conversation.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed sm:text-base">
                Connect your Instagram account, choose a post, configure your replies and let RawReply automate your conversations.
              </p>
            </div>

            {/* Primary Visual Element: 10-Second Product Demonstration Video */}
            <ProductDemoVideo />

            {/* Supporting Three-Step Information Below Video */}
            <div className="mt-12 sm:mt-16 pt-10 border-t border-border/80 grid gap-8 sm:grid-cols-2 md:grid-cols-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-mono text-xs font-bold border border-emerald-500/20">
                  01
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-foreground">
                    CONNECT INSTAGRAM
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Securely connect your Instagram Business or Creator account through Meta authorization.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-mono text-xs font-bold border border-emerald-500/20">
                  02
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-foreground">
                    CONFIGURE AUTOMATION
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose your Instagram post, select the comment trigger and configure public replies and private DMs.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3.5 sm:col-span-2 md:col-span-1">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-mono text-xs font-bold border border-emerald-500/20">
                  03
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-foreground">
                    ACTIVATE AND COLLECT
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Publish your automation and let RawReply handle incoming comment-triggered conversations and lead capture.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. Features Section ────────────────────────────────────────── */}
        <section id="features" className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-accent">
                Engineered For B2B Conversion
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Everything You Need To Automate Lead Capture
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Purpose-built features designed around one goal: capturing verified customer phone numbers.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={MessageCircle}
                title="Comment Automation"
                description="Trigger private DM replies automatically when visitors comment specific keywords or any phrase on your reels and posts."
              />
              <FeatureCard
                icon={Zap}
                title="Interactive DM Sequences"
                description="Guide commenters through conversational questionnaires that collect requirement details before asking for contact info."
              />
              <FeatureCard
                icon={Phone}
                title="Phone Number Gating"
                description="Only commenters who submit a valid international mobile number enter your pipeline. Eliminates tire-kickers and bots."
              />
              <FeatureCard
                icon={Users}
                title="Qualified Lead Pipeline"
                description="A dedicated table containing only verified contacts with requirement answers, source post ID, and capture timestamps."
              />
              <FeatureCard
                icon={FileSpreadsheet}
                title="Excel Integration"
                badge="Coming Soon"
                description="Direct automated dispatching to your Microsoft Excel workbooks with strict deduplication to prevent repeated exports."
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Meta 24h Policy Engine"
                description="Built from the ground up to respect Instagram's 24-hour messaging window and rate limits to safeguard your business account."
              />
            </div>
          </div>
        </section>

        {/* ─── 5. Core Philosophy Comparison ──────────────────────────────── */}
        <section className="border-t border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-accent">
                The RawReply Advantage
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Commenters vs. Qualified Leads
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Why generic DM automation clutters your CRM, and how RawReply solves it.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base text-muted-foreground">
                    Generic DM Tools
                  </CardTitle>
                  <CardDescription>
                    Saves every single commenter into your storage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs text-muted-foreground">
                  <ComparisonItem negative text="Stores hundreds of casual commenters who only replied with emojis" />
                  <ComparisonItem negative text="Fills your CRM with unqualified, unverified social profiles" />
                  <ComparisonItem negative text="Manual sales follow-up required to extract phone numbers" />
                  <ComparisonItem negative text="Creates duplicate spreadsheet entries every time a user comments" />
                </CardContent>
              </Card>

              <Card className="border-primary-accent/40 bg-card shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-primary-accent">
                      RawReply Architecture
                    </CardTitle>
                    <Badge variant="accent">Qualified Only</Badge>
                  </div>
                  <CardDescription>
                    Saves only customers who submit a verified mobile number
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs text-foreground">
                  <ComparisonItem text="Never stores commenters who do not provide their phone number" />
                  <ComparisonItem text="Collects buyer requirements before capturing contact details" />
                  <ComparisonItem text="Strict idempotent deduplication per post and phone number" />
                  <ComparisonItem text="Ready-to-call leads exported directly to your Excel workbook" />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── 6. Pricing Section ─────────────────────────────────────────── */}
        <section id="pricing" className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-accent">
                Transparent Pricing
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Provisional Subscription Plans
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Start with a 14-day trial. All plans include the core phone number qualification engine.
              </p>
            </div>

            {/* Provisional Plans Notice */}
            <div className="mx-auto max-w-md text-center mb-12">
              <span className="inline-block rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
                Notice: Plans and pricing below are provisional and subject to final confirmation.
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {PRICING_PLANS.map((plan) => (
                <Card
                  key={plan.id}
                  className={
                    plan.popular
                      ? "border-primary-accent shadow-md relative"
                      : "border-border"
                  }
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-accent px-3 py-0.5 text-[11px] font-semibold text-white">
                      {plan.badge}
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {!plan.popular && (
                        <Badge variant="outline" className="text-[10px]">
                          {plan.badge}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-1">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold tracking-tight text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {plan.period}
                      </span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-muted-foreground border-t border-border pt-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="size-3.5 text-primary-accent shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="border-t border-border pt-4">
                    <Button
                      variant={plan.popular ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link href="/signup">{plan.cta}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 7. FAQ Section ─────────────────────────────────────────────── */}
        <section id="faq" className="border-t border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-accent">
                Frequently Asked Questions
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Got Questions? We Have Answers.
              </h2>
            </div>

            <div className="space-y-4">
              <FaqItem
                question="What type of Instagram account is required?"
                answer="Meta requires an Instagram Professional account (either Business or Creator) linked to an authorized Facebook Page. Personal accounts do not have access to the Meta Graph API webhook infrastructure."
              />
              <FaqItem
                question="What happens if a commenter never submits their phone number?"
                answer="Per RawReply's core architectural business rule, that commenter is never permanently stored as a lead. They will not enter your qualified leads table and will not be exported to Excel. This keeps your pipeline 100% clean."
              />
              <FaqItem
                question="How does RawReply comply with Meta's 24-hour messaging window?"
                answer="When someone comments, RawReply responds with a private DM reply. Once the user replies in DM, a standard 24-hour messaging window opens. All interactive questions and phone number collection take place safely within this window."
              />
              <FaqItem
                question="How are duplicate leads handled?"
                answer="Qualified lead creation is strictly idempotent. If the same user submits the same phone number multiple times on the same post, RawReply recognizes the existing lead and avoids duplicate database records or spreadsheet rows."
              />
              <FaqItem
                question="How is team access managed?"
                answer="RawReply features built-in multi-tenant organization workspaces, allowing owners to invite colleagues as Admins or Members with strict role-based access control."
              />
            </div>
          </div>
        </section>

        {/* ─── 8. Bottom CTA Banner ──────────────────────────────────────── */}
        <section className="py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="rounded-2xl border border-border bg-card p-8 md:p-12 text-center shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Ready To Automate Your Instagram Lead Collection?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground leading-relaxed">
                Connect your account, configure your qualifying questions, and turn every comment into a verified phone number for your sales team.
              </p>
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button size="lg" asChild className="h-10 px-6 font-semibold">
                  <Link href="/signup">
                    Get Started Free
                    <ArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="h-10 px-6 font-medium">
                  <Link href="/login">Log In</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── 9. Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 mb-10">
            {/* Col 1: Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <MessageCircle className="size-3.5" />
                </div>
                <span className="text-sm font-bold tracking-tight">{APP_NAME}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Instagram comment-to-DM automation and qualified phone number lead collection SaaS.
              </p>
            </div>

            {/* Col 2: Product */}
            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-foreground">Product</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><a href="#how-it-works" className="hover:text-foreground">How It Works</a></li>
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing Plans</a></li>
                <li><Link href="/dashboard" className="hover:text-foreground">Application Dashboard</Link></li>
              </ul>
            </div>

            {/* Col 3: Integrations */}
            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-foreground">Integrations</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><span className="text-foreground">Instagram Graph API</span></li>
                <li><span className="text-muted-foreground">Microsoft Excel (Coming Soon)</span></li>
                <li><span className="text-muted-foreground">Google Sheets (Coming Soon)</span></li>
                <li><span className="text-muted-foreground">Team Workspaces & RBAC</span></li>
              </ul>
            </div>

            {/* Col 4: Platform & Security */}
            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-foreground">Security & Compliance</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><span>Meta 24h Messaging Window</span></li>
                <li><span>E.164 Phone Verification</span></li>
                <li><span>HMAC-SHA256 Webhook Auth</span></li>
                <li><span>Idempotent Deduplication</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© 2026 {APP_NAME}. All rights reserved.</span>
            <span>Independent SaaS application built with Next.js & Meta Graph API.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, badge }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-border/80">
      <div className="flex items-center justify-between mb-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-muted text-foreground">
          <Icon className="size-4" />
        </div>
        {badge && (
          <Badge variant="accent" className="text-[10px]">
            {badge}
          </Badge>
        )}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function ComparisonItem({ text, negative }) {
  return (
    <div className="flex items-start gap-2">
      {negative ? (
        <span className="text-red-500 font-bold shrink-0 mt-0.5">✕</span>
      ) : (
        <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
      )}
      <span className={negative ? "text-muted-foreground" : "text-foreground"}>
        {text}
      </span>
    </div>
  );
}

function FaqItem({ question, answer }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-xs font-semibold text-foreground sm:text-sm">{question}</h3>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed sm:text-[13px]">
        {answer}
      </p>
    </div>
  );
}
