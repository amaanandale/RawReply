"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/shared/auth-provider";
import { ROLES } from "@/lib/constants";

export function TeamClient() {
  const { organization, role: currentRole, user } = useAuth();

  const [members, setMembers] = React.useState([]);
  const [invitations, setInvitations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [actionError, setActionError] = React.useState("");
  const [actionSuccess, setActionSuccess] = React.useState("");

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("member");
  const [inviting, setInviting] = React.useState(false);

  const isOwner = currentRole === ROLES.OWNER;
  const isAdmin = currentRole === ROLES.ADMIN;
  const canManageTeam = isOwner || isAdmin;

  const loadData = React.useCallback(async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch("/api/organizations/members"),
        fetch("/api/organizations/invitations"),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }
      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error("Failed to load team data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;

    async function fetchTeamData() {
      try {
        const [membersRes, invitesRes] = await Promise.all([
          fetch("/api/organizations/members"),
          fetch("/api/organizations/invitations"),
        ]);

        if (!active) return;

        if (membersRes.ok) {
          const data = await membersRes.json();
          if (active) setMembers(data.members || []);
        }
        if (invitesRes.ok) {
          const data = await invitesRes.json();
          if (active) setInvitations(data.invitations || []);
        }
      } catch (err) {
        console.error("Failed to load team data:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchTeamData();

    return () => {
      active = false;
    };
  }, []);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");
    setInviting(true);

    try {
      const res = await fetch("/api/organizations/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation.");
      }

      setActionSuccess(`Invitation dispatched to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("member");
      setInviteModalOpen(false);
      await loadData();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch("/api/organizations/members/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role");
      }
      setActionSuccess("Member role updated");
      await loadData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleRemoveMember = async (targetUserId, targetName) => {
    if (!confirm(`Are you sure you want to remove ${targetName} from this organization?`)) {
      return;
    }
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch("/api/organizations/members/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member");
      }
      setActionSuccess(`${targetName} removed from organization`);
      await loadData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleCancelInvite = async (invitationId) => {
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch("/api/organizations/invitations/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel invitation");
      }
      setActionSuccess("Invitation cancelled");
      await loadData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Members Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary-accent" />
              <CardTitle className="text-base font-semibold">Active Members</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Workspace members for {organization?.name || "your organization"}.
            </CardDescription>
          </div>

          {canManageTeam && (
            <Button
              onClick={() => setInviteModalOpen(true)}
              size="sm"
              className="bg-primary-accent hover:bg-primary-accent-hover text-white text-xs font-medium self-start sm:self-auto"
            >
              <UserPlus className="mr-1.5 size-3.5" />
              Invite Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
              <Loader2 className="size-4 animate-spin mr-2" />
              Loading team members...
            </div>
          ) : members.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No active members found.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const memberIsOwner = member.role === ROLES.OWNER;
                return (
                  <div
                    key={member.membership_id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-9 rounded-full bg-primary-accent/10 text-primary-accent font-semibold text-xs shrink-0">
                        {getInitials(member.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            {member.name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {/* Role selection or badge */}
                      {isOwner && !isCurrentUser ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                          className="text-xs rounded border border-input bg-background px-2 py-1 focus:ring-1 focus:ring-primary-accent"
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      ) : (
                        <Badge
                          variant={memberIsOwner ? "default" : "outline"}
                          className={`text-[10px] uppercase tracking-wider ${
                            memberIsOwner ? "bg-primary-accent text-white" : ""
                          }`}
                        >
                          {typeof member.role === "object" ? member.role?.name || "member" : String(member.role || "member")}
                        </Badge>
                      )}

                      {/* Remove member button */}
                      {canManageTeam && !isCurrentUser && !memberIsOwner && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveMember(member.user_id, member.name)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Remove member"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Card */}
      {canManageTeam && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Pending Invitations</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Colleagues who have been invited but have not yet registered or joined.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No pending invitations for this workspace.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 gap-2"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{inv.email}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Invited as <span className="font-semibold uppercase">{typeof inv.role === "object" ? inv.role?.name || "member" : String(inv.role || "member")}</span> by{" "}
                        {inv.invited_by_name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvite(inv.id)}
                        className="text-destructive hover:text-destructive text-xs h-7 px-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Invite Team Member</h3>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground" htmlFor="inviteEmail">
                  Colleague Email Address
                </label>
                <input
                  id="inviteEmail"
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground" htmlFor="inviteRole">
                  Workspace Role
                </label>
                <select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent"
                >
                  <option value="member">Member — View leads & assigned automations</option>
                  <option value="admin">Admin — Manage automations & leads</option>
                  {isOwner && <option value="owner">Owner — Full workspace & billing access</option>}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInviteModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inviting}
                  size="sm"
                  className="bg-primary-accent hover:bg-primary-accent-hover text-white text-xs font-medium"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
