import Link from "next/link";
import { MessageCircle, ArrowLeft, ArrowRight, ShieldCheck, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export function LegalLayout({
  badge = "Legal & Compliance",
  badgeIcon: BadgeIcon = ShieldCheck,
  title,
  lastUpdated = "November 13, 2026",
  description,
  children,
  tableOfContents = [],
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ─── Top Navigation ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand Logo & Wordmark */}
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity">
            <div className="flex size-7 items-center justify-center rounded-md bg-emerald-600 text-white shadow-xs">
              <MessageCircle className="size-4" />
            </div>
            <span className="text-base tracking-tight">{APP_NAME}</span>
          </Link>

          {/* Quick Legal Switcher Links */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-muted-foreground">
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/data-deletion" className="hover:text-foreground transition-colors">
              Data Deletion
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-xs">
              <Link href="/">
                <ArrowLeft className="size-3.5 mr-1" />
                Home
              </Link>
            </Button>
            <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              <Link href="/login">
                Dashboard
                <ArrowRight className="size-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content Container ───────────────────────────────────────── */}
      <main className="flex-1">
        {/* Page Header Hero */}
        <div className="border-b border-border bg-muted/20 py-10 sm:py-14">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-xs font-semibold mb-3.5">
              <BadgeIcon className="size-3.5 text-emerald-600" />
              <span>{badge}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Last updated: {lastUpdated}</span>
              <span>•</span>
              <span>Official Meta Developer & Platform Compliance Document</span>
            </div>
            {description && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Legal Body & Table of Contents */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
          {tableOfContents.length > 0 && (
            <div className="mb-10 rounded-xl border border-border bg-card p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Table of Contents
              </h2>
              <nav className="grid gap-1.5 sm:grid-cols-2 text-xs">
                {tableOfContents.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-emerald-600 py-0.5 transition-colors"
                  >
                    <span className="font-mono text-emerald-600/70">{idx + 1}.</span>
                    <span>{item.label}</span>
                  </a>
                ))}
              </nav>
            </div>
          )}

          <article className="prose prose-sm max-w-none space-y-10 text-foreground leading-relaxed">
            {children}
          </article>
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 mb-10 text-xs">
            {/* Col 1: Brand */}
            <div className="space-y-3">
              <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-foreground">
                <div className="flex size-6 items-center justify-center rounded-md bg-emerald-600 text-white">
                  <MessageCircle className="size-3.5" />
                </div>
                <span className="text-sm">{APP_NAME}</span>
              </Link>
              <p className="text-muted-foreground leading-relaxed">
                Instagram comment-to-DM automation and qualified phone lead collection SaaS platform.
              </p>
            </div>

            {/* Col 2: Legal Documents */}
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Legal & Policies</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  <Link href="/privacy-policy" className="hover:text-emerald-600 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="hover:text-emerald-600 transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/data-deletion" className="hover:text-emerald-600 transition-colors">
                    User Data Deletion
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Product Navigation */}
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Product</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><Link href="/#how-it-works" className="hover:text-foreground">How It Works</Link></li>
                <li><Link href="/#features" className="hover:text-foreground">Features</Link></li>
                <li><Link href="/#pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground">Customer Dashboard</Link></li>
              </ul>
            </div>

            {/* Col 4: Platform & Compliance */}
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Meta Compliance</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><span>Meta Graph API v21.0</span></li>
                <li><span>24-Hour Messaging Window</span></li>
                <li><span>AES-256 Token Encryption</span></li>
                <li><span>E.164 Phone Verification</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© 2026 {APP_NAME}. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link href="/privacy-policy" className="hover:text-foreground">Privacy</Link>
              <span>•</span>
              <Link href="/terms-of-service" className="hover:text-foreground">Terms</Link>
              <span>•</span>
              <Link href="/data-deletion" className="hover:text-foreground">Data Deletion</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
