/**
 * Provisional pricing plans for RawReply.
 * Clearly marked as provisional / indicative until billing is finalized.
 */
export const PRICING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    badge: "Provisional Plan",
    price: "$29",
    period: "/month",
    description: "For creators and solo entrepreneurs getting started with comment automation.",
    features: [
      "1 Connected Instagram account",
      "Up to 5 active comment automations",
      "Standard DM workflow sequences",
      "Phone number qualification gate",
      "Manual CSV lead export",
      "Standard Meta 24h compliance engine",
      "Community & email support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    id: "growth",
    name: "Growth",
    badge: "Most Popular",
    price: "$79",
    period: "/month",
    description: "For growing businesses scaling lead generation and sales conversations.",
    features: [
      "3 Connected Instagram accounts",
      "Unlimited active automations",
      "Multi-step requirement questionnaires",
      "Phone number qualification gate",
      "Direct Microsoft Excel integration (Coming Soon)",
      "Direct Google Sheets sync (Coming Soon)",
      "Team collaboration (up to 3 seats)",
      "Priority webhook processing",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    id: "scale",
    name: "Scale",
    badge: "Enterprise Ready",
    price: "$199",
    period: "/month",
    description: "For marketing agencies and multi-brand businesses requiring advanced scale.",
    features: [
      "10 Connected Instagram accounts",
      "Unlimited active automations",
      "Advanced custom qualification logic",
      "Phone number qualification gate",
      "Multi-workbook Excel dispatching",
      "Multi-tenant workspace team management",
      "Audit logging & role-based permissions",
      "Dedicated integration support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

