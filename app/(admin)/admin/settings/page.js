"use client";

import * as React from "react";
import {
  Settings,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/shared/auth-provider";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password.");

      setSuccess("Your Super Admin password was successfully changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Platform Admin Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Super Admin credential security, platform configuration, and governance parameters.
        </p>
      </div>

      {/* Account Info Card */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="size-4 text-primary-accent" />
            Super Admin Profile
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Current administrator identity and authorization tier.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-border/60">
            <span className="text-muted-foreground">Admin Name</span>
            <span className="font-semibold text-foreground">{user?.name || "Super Admin"}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-border/60">
            <span className="text-muted-foreground">Admin Email</span>
            <span className="font-semibold text-foreground font-mono">{user?.email || "—"}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-muted-foreground">Authorization Tier</span>
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary-accent border-primary-accent/30">
              Platform Super Admin
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="size-4 text-primary-accent" />
            Change Admin Password
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Update your administrator credentials. This action will be recorded in the audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            {error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="currentPassword">
                Current Password
              </label>
              <input
                id="currentPassword"
                type={showPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[36px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="newPassword">
                New Password (min 8 characters)
              </label>
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[36px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-accent min-h-[44px] sm:min-h-[36px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                <span>{showPassword ? "Hide passwords" : "Show passwords"}</span>
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="bg-primary-accent hover:bg-primary-accent-hover text-white text-xs h-9 min-h-[44px] sm:min-h-[36px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Admin Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

