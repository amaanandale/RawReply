import {
  LayoutDashboard,
  Zap,
  Users,
  Layers,
  UserCheck,
  Settings,
  Activity,
} from "lucide-react";
import { Instagram } from "@/components/shared/icons";

/**
 * Primary dashboard navigation items
 */
export const DASHBOARD_NAV_ITEMS = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Automations",
    href: "/dashboard/automations",
    icon: Zap,
    exact: false,
  },
  {
    title: "Instagram Accounts",
    href: "/dashboard/accounts",
    icon: Instagram,
    exact: false,
  },
  {
    title: "Qualified Leads",
    href: "/dashboard/leads",
    icon: Users,
    exact: false,
  },
  {
    title: "Integrations",
    href: "/dashboard/integrations",
    icon: Layers,
    exact: false,
  },
  {
    title: "Team Members",
    href: "/dashboard/team",
    icon: UserCheck,
    exact: false,
  },
  {
    title: "Activity & Issues",
    href: "/dashboard/activity",
    icon: Activity,
    exact: false,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    exact: false,
  },
];

/**
 * Public website navigation links
 */
export const PUBLIC_NAV_ITEMS = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];
