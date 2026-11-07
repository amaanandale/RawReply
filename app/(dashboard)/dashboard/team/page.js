import {
  UserCheck,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamClient } from "@/components/dashboard/team-client";

export const metadata = {
  title: "Team Members — RawReply",
  description: "Manage team collaboration, member invitations, and role-based permissions.",
};

export default function TeamManagementPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Team Members & Organizations"
        description="Collaborate with your marketing and sales team using role-based access control."
      />

      {/* Roles & Permissions Reference Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <RoleCard
          title="Owner"
          badge="Full Access"
          description="Full organization access, workspace settings, team invitations, and integration credentials."
          permissions={[
            "Manage organization settings",
            "Invite and remove team members",
            "Connect/disconnect Instagram accounts",
            "Full access to qualified leads & exports",
          ]}
        />
        <RoleCard
          title="Admin"
          badge="Management"
          description="Operational management of automations, post comment monitors, and integration workflows."
          permissions={[
            "Create & edit comment-to-DM automations",
            "Manage questionnaire sequences",
            "View and export qualified leads",
            "Invite standard members where permitted",
          ]}
        />
        <RoleCard
          title="Member"
          badge="Read & Execute"
          description="Operational access to monitor active automations and view qualified leads."
          permissions={[
            "View assigned comment automations",
            "View qualified leads table",
            "Monitor DM response performance",
            "No access to settings or integrations",
          ]}
        />
      </div>

      {/* Interactive Team Management Interface */}
      <TeamClient />
    </div>
  );
}

function RoleCard({ title, badge, description, permissions }) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Badge variant="outline" className="text-[11px]">
            {badge}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-[11px] text-muted-foreground border-t border-border pt-3">
          {permissions.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-primary-accent font-bold mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
