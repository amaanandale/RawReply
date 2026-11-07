import { getCurrentSession } from "../auth/session.js";

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

  if (!session.user.isSuperAdmin) {
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
