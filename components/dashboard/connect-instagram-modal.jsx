"use client";

import * as React from "react";
import {
  X,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  HelpCircle,
} from "lucide-react";
import { Instagram, Facebook } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ConnectInstagramModal({ isOpen, onClose }) {
  React.useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Close Button */}
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-xs">
                <Instagram className="size-4" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Connect Instagram Account
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose your preferred method to link your Instagram Professional account for real-time comment automation:
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* The Two Connection Options */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* OPTION A: DIRECT INSTAGRAM LOGIN (RECOMMENDED)               */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="relative flex flex-col justify-between rounded-xl border-2 border-primary-accent/40 bg-gradient-to-b from-primary-accent/5 via-card to-card p-5 shadow-xs hover:border-primary-accent transition-all group">
            {/* Recommended Badge */}
            <div className="absolute -top-3 left-4">
              <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 text-[10px] font-bold uppercase tracking-wider shadow-xs">
                <Sparkles className="size-3 mr-1" /> Recommended
              </Badge>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-xs">
                  <Instagram className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Direct Instagram Login
                  </h3>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    No Facebook Page required
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Log in directly with your Instagram username & password via Meta&apos;s official Instagram Login.
              </p>

              <ul className="space-y-1.5 text-[11px] text-muted-foreground pt-1">
                <li className="flex items-start gap-1.5 text-foreground/90 font-medium">
                  <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>No Facebook Page or Business Suite needed</span>
                </li>
                <li className="flex items-start gap-1.5 text-foreground/90 font-medium">
                  <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Works directly with Business & Creator profiles</span>
                </li>
                <li className="flex items-start gap-1.5 text-foreground/90 font-medium">
                  <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Instant comment webhooks & automated DMs</span>
                </li>
              </ul>
            </div>

            <div className="pt-5">
              <Button
                asChild
                className="w-full bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-95 text-white font-semibold shadow-xs h-10 text-xs"
              >
                <a href="/api/auth/instagram/authorize">
                  <Instagram className="size-4 mr-2" />
                  Continue with Instagram
                </a>
              </Button>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* OPTION B: FACEBOOK LOGIN FOR BUSINESS (PAGE-LINKED)          */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs hover:border-border/80 transition-all">
            <div className="absolute -top-3 left-4">
              <Badge variant="outline" className="border-border bg-muted/60 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                Facebook Linked
              </Badge>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1877F2] text-white shadow-xs">
                  <Facebook className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Facebook Login for Business
                  </h3>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    For Page-linked accounts
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Log in via Facebook if your Instagram account is linked to a Facebook Page or managed in Meta Business Suite.
              </p>

              <ul className="space-y-1.5 text-[11px] text-muted-foreground pt-1">
                <li className="flex items-start gap-1.5">
                  <Check className="size-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>Connects Instagram accounts linked to Facebook</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="size-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>Supports Facebook Page feed automations</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="size-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>Uses official Meta Business Login dialog</span>
                </li>
              </ul>
            </div>

            <div className="pt-5 space-y-2">
              <Button
                asChild
                variant="outline"
                className="w-full border-blue-200 hover:bg-blue-50 text-blue-800 dark:border-blue-900 dark:text-blue-300 font-semibold h-10 text-xs"
              >
                <a href="/api/auth/meta/authorize?platform=instagram">
                  <Facebook className="size-4 mr-2 text-[#1877F2]" />
                  Continue with Facebook
                </a>
              </Button>
              <div className="text-center">
                <a
                  href="/api/auth/meta/authorize?platform=instagram&config=off"
                  className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  title="Fallback to standard scopes without Business Configuration ID"
                >
                  Trouble with Business config? Try Standard FB Login
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Verification Guarantee Banner */}
        <div className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
          <span className="text-[11px] leading-relaxed">
            All credentials and tokens are encrypted at rest with <strong className="text-foreground">AES-256-GCM</strong>. RawReply never stores your Instagram password and strictly adheres to Meta official Graph API limits.
          </span>
        </div>
      </div>
    </div>
  );
}
