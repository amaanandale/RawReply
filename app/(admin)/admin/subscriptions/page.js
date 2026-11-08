"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, CheckCircle2, Check, Sparkles, Loader2, Users, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "@/config/pricing";

export default function AdminSubscriptionsPage() {
  const [metrics, setMetrics] = React.useState(null);
  const [customers, setCustomers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [metricsRes, customersRes] = await Promise.all([
          fetch("/api/admin/metrics"),
          fetch("/api/admin/customers?limit=10"),
        ]);
        if (metricsRes.ok) {
          const m = await metricsRes.json();
          setMetrics(m.metrics || null);
        }
        if (customersRes.ok) {
          const c = await customersRes.json();
          setCustomers(c.customers || []);
        }
      } catch (err) {
        console.error("Failed to load subscription metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalFreeSubscriptions = metrics?.freeSubscriptions ?? metrics?.totalCustomers ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Platform Subscriptions & Billing
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Launch-phase unrestricted product access and prospective commercial subscription tiers.
        </p>
      </div>

      {/* Free Launch Access Announcement Banner */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-700 shrink-0 mt-0.5">
            <Sparkles className="size-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-emerald-900">
                Launch Phase: 100% Free Full Product Access Active
              </h2>
              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-500/30 uppercase font-bold">
                No Payment Gates
              </Badge>
            </div>
            <p className="text-xs text-emerald-800/90 leading-relaxed">
              During the initial launch period, all registered customer accounts are granted full, unrestricted access to RawReply at $0/month. Each customer enjoys up to 4 Instagram Business/Creator connections, unlimited comment-to-DM automations, and qualified lead exports with zero payment barriers.
            </p>
            <div className="pt-2 flex flex-wrap gap-5 text-xs text-emerald-900 font-mono">
              <span>Total Active Free Subscriptions: <strong className="font-bold text-foreground text-sm">{totalFreeSubscriptions}</strong></span>
              <span>Price per Customer: <strong>$0.00 / month</strong></span>
              <span>Instagram Limit: <strong>4 Accounts / Customer</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Customers on Free Launch Plan */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="size-4 text-primary-accent" />
              Customer Subscriptions ({totalFreeSubscriptions} Active)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Customer accounts actively provisioned on the Free Launch Plan.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-xs h-8">
            <Link href="/admin/customers" className="flex items-center gap-1">
              <span>View all customers</span>
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary-accent mb-1" />
              <span>Loading customer subscriptions...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No registered customer subscriptions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="p-3 pl-4">Customer</th>
                    <th className="p-3">Current Plan</th>
                    <th className="p-3">Billing Status</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Account Quota</th>
                    <th className="p-3 pr-4 text-right">Enrolled Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="font-semibold text-foreground">{c.name || "Customer"}</div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">{c.email}</div>
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        Free Launch Plan
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-500/10 border-emerald-500/20">
                          Active
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">
                        $0 / month
                      </td>
                      <td className="p-3 text-muted-foreground">
                        Up to 4 IG Accounts
                      </td>
                      <td className="p-3 pr-4 text-right text-muted-foreground font-mono text-[11px]">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : "Active"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prospective Post-Launch Tiers (Reference Only) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="size-4 text-primary-accent" />
              Prospective Post-Launch Pricing Tiers (Reference Only)
            </h2>
            <p className="text-xs text-muted-foreground">
              Planned commercial tiers for future paid phases. Currently inactive.
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
