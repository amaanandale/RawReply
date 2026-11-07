"use client";

import * as React from "react";
import { CreditCard, AlertCircle, Check, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PRICING_PLANS } from "@/config/pricing";

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Platform Subscriptions & Billing
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Billing provider integration status and planned commercial subscription tiers.
        </p>
      </div>

      {/* Gateway Unconfigured Status Notice - Strict Rule: Zero Fake Data */}
      <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-500/10 p-2 text-amber-600 shrink-0 mt-0.5">
            <AlertCircle className="size-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Payment Gateway Not Configured
              </h2>
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                Pending Integration
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No payment processor (such as Stripe or Lemon Squeezy) is currently active. In accordance with RawReply platform standards, no simulated or fabricated financial data is shown. Real customer billing and MRR tracking will activate once API credentials are configured.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
              <span>Active Subscriptions: <strong>0</strong></span>
              <span>Total Revenue: <strong>$0.00</strong></span>
              <span>Payment Gateway: <strong>Unconfigured</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Pricing Tiers */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="size-4 text-primary-accent" />
              Provisional Subscription Tiers (Reference)
            </h2>
            <p className="text-xs text-muted-foreground">
              Tier definitions loaded from system configuration.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            config/pricing.js
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <Card key={plan.id} className="border border-border bg-card shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {plan.badge}
                  </Badge>
                  {plan.popular && (
                    <span className="text-[10px] font-bold text-primary-accent uppercase">
                      Recommended
                    </span>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-2">
                  {plan.name}
                </CardTitle>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-2">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="border-t border-border/60 pt-3">
                  <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider mb-2">
                    Included Features
                  </p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="size-3.5 text-primary-accent shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

