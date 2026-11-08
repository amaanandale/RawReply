"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

const AuthContext = React.createContext({
  user: null,
  organization: null,
  organizations: [],
  role: "member",
  loading: true,
  switchOrganization: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = React.useState(null);
  const [organization, setOrganization] = React.useState(null);
  const [organizations, setOrganizations] = React.useState([]);
  const [role, setRole] = React.useState("member");
  const [loading, setLoading] = React.useState(true);

  const fetchSession = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setOrganization(data.organization);
          setOrganizations(data.organizations || []);
          setRole(data.role || "member");
          return;
        }
      }
      setUser(null);
      setOrganization(null);
      setOrganizations([]);
      setRole("member");
    } catch {
      setUser(null);
      setOrganization(null);
      setOrganizations([]);
      setRole("member");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function loadInitialSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          if (data.authenticated && data.user) {
            setUser(data.user);
            setOrganization(data.organization);
            setOrganizations(data.organizations || []);
            setRole(data.role || "member");
            return;
          }
        }
        setUser(null);
        setOrganization(null);
        setOrganizations([]);
        setRole("member");
      } catch {
        if (!isMounted) return;
        setUser(null);
        setOrganization(null);
        setOrganizations([]);
        setRole("member");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitialSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const switchOrganization = React.useCallback(
    async (organizationId) => {
      try {
        const res = await fetch("/api/organizations/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId }),
        });
        if (res.ok) {
          await fetchSession();
          router.refresh();
        } else {
          const err = await res.json();
          throw new Error(err.error || "Failed to switch organization");
        }
      } catch (err) {
        console.error("switchOrganization error:", err);
        throw err;
      }
    },
    [fetchSession, router]
  );

  const logout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setOrganization(null);
      setOrganizations([]);
      setRole("member");
      router.push("/");
      router.refresh();
    }
  }, [router]);

  const contextValue = React.useMemo(
    () => ({
      user,
      organization,
      organizations,
      role,
      loading,
      switchOrganization,
      logout,
      refreshUser: fetchSession,
    }),
    [user, organization, organizations, role, loading, switchOrganization, logout, fetchSession]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
