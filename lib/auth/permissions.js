import { ROLES } from "../constants.js";

export const PERMISSIONS = {
  MANAGE_ORGANIZATION: "manage_organization",
  MANAGE_BILLING: "manage_billing",
  INVITE_MEMBERS: "invite_members",
  REMOVE_MEMBERS: "remove_members",
  CHANGE_ROLES: "change_roles",
  CONNECT_INSTAGRAM: "connect_instagram",
  DISCONNECT_INSTAGRAM: "disconnect_instagram",
  MANAGE_AUTOMATIONS: "manage_automations",
  VIEW_LEADS: "view_leads",
  EXPORT_LEADS: "export_leads",
};

// Capabilities assigned to each role
const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: [
    PERMISSIONS.MANAGE_ORGANIZATION,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.CHANGE_ROLES,
    PERMISSIONS.CONNECT_INSTAGRAM,
    PERMISSIONS.DISCONNECT_INSTAGRAM,
    PERMISSIONS.MANAGE_AUTOMATIONS,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.EXPORT_LEADS,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.CONNECT_INSTAGRAM,
    PERMISSIONS.DISCONNECT_INSTAGRAM,
    PERMISSIONS.MANAGE_AUTOMATIONS,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.EXPORT_LEADS,
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.VIEW_LEADS,
  ],
  customer: [
    PERMISSIONS.MANAGE_ORGANIZATION,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.CHANGE_ROLES,
    PERMISSIONS.CONNECT_INSTAGRAM,
    PERMISSIONS.DISCONNECT_INSTAGRAM,
    PERMISSIONS.MANAGE_AUTOMATIONS,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.EXPORT_LEADS,
  ],
  super_admin: [
    PERMISSIONS.MANAGE_ORGANIZATION,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.CHANGE_ROLES,
    PERMISSIONS.CONNECT_INSTAGRAM,
    PERMISSIONS.DISCONNECT_INSTAGRAM,
    PERMISSIONS.MANAGE_AUTOMATIONS,
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.EXPORT_LEADS,
  ],
};

/**
 * Check if a role possesses a given permission.
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const permissions = ROLE_PERMISSIONS[role.toLowerCase()] || [];
  return permissions.includes(permission);
}

/**
 * Assert whether user role can modify another target user's role.
 * - Owner can change any member's role (except transferring ownership requires special flow).
 * - Admin cannot change any roles.
 * - Member cannot change any roles.
 */
export function canChangeRole(actorRole, targetRole, newRole) {
  if (actorRole !== ROLES.OWNER) return false;
  if (targetRole === ROLES.OWNER && newRole !== ROLES.OWNER) return false; // cannot demote owner
  return true;
}

/**
 * Assert whether user role can remove another member.
 * - Owner can remove any non-owner.
 * - Admin cannot remove owner or other admins.
 * - Member cannot remove anyone.
 */
export function canRemoveMember(actorRole, targetRole) {
  if (targetRole === ROLES.OWNER) return false; // No one can remove the owner
  if (actorRole === ROLES.OWNER) return true;
  if (actorRole === ROLES.ADMIN && targetRole === ROLES.MEMBER) return true;
  return false;
}
