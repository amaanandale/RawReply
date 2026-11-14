import Link from "next/link";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      {/* Top Header */}
      <header className="flex h-16 w-full items-center justify-between px-6 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-foreground tracking-tight hover:opacity-90 transition-opacity"
        >
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
            <MessageCircle className="size-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">{APP_NAME}</span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Auth Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground space-y-2">
        <p>© 2026 {APP_NAME}. Instagram comment-to-DM automation.</p>
        <div className="flex items-center justify-center gap-4 text-[11px]">
          <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms-of-service" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/data-deletion" className="hover:text-foreground transition-colors">
            Data Deletion
          </Link>
        </div>
      </footer>
    </div>
  );
}
