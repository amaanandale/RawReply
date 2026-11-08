import { getCurrentSession } from "../auth/session.js";
import { DEFAULT_SUPER_ADMIN_EMAIL } from "../constants.js";

/**
 * Resolves the single designated Super Admin email address from configuration.
 */
export function getDesignatedSuperAdminEmail() {
  return (process.env.SUPER_ADMIN_EMAIL || DEFAULT_SUPER_ADMIN_EMAIL).toLowerCase().trim();
}

/**
 * Validates whether an email matches the single designated Super Admin email.
 */
export function isDesignatedSuperAdmin(email) {
  if (!email) return false;
  return email.toLowerCase().trim() === getDesignatedSuperAdminEmail();
}

/**
 * Super Admin authorization guard for Route Handlers.
 * Returns { authorized: true, session, user } or a 401/403 Response.
 */
export async function requireSuperAdmin(req) {
  const session = await getCurrentSession(req);

  if (!session || !session.user) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  const designatedEmail = getDesignatedSuperAdminEmail();
  const isSuper =
    Boolean(session.user.isSuperAdmin) &&
    session.user.email?.toLowerCase().trim() === designatedEmail;

  if (!isSuper) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Access denied. Super Admin privileges required." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    session,
    user: session.user,
  };
}
