import crypto from "crypto";
import { db } from "../lib/db/client.js";
import { ROLES } from "../lib/constants.js";
import {
  PERMISSIONS,
  hasPermission,
  canChangeRole,
  canRemoveMember,
} from "../lib/auth/permissions.js";
import { generateRandomToken, hashToken } from "../lib/auth/tokens.js";
import { sendEmail } from "../lib/email/client.js";

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .substring(0, 40);
}

export const organizationService = {
  /**
   * Create a new organization. The creator automatically becomes the Owner.
   */
  async createOrganization({ userId, name }) {
    if (!name || name.trim().length === 0) {
      throw new Error("Organization name is required.");
    }

    const orgId = generateId("org");
    const baseSlug = slugify(name) || "workspace";
    const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;

    const org = await db.createOrganization({
      id: orgId,
      name: name.trim(),
      slug,
    });

    await db.addOrganizationMember({
      id: generateId("mem"),
      organizationId: org.id,
      userId,
      role: ROLES.OWNER,
    });

    return org;
  },

  async getUserOrganizations(userId) {
    return db.listUserOrganizations(userId);
  },

  async getOrganization(orgId) {
    return db.findOrganizationById(orgId);
  },

  async updateOrganization({ orgId, name, actorUserId }) {
    const actorMember = await db.findMember(orgId, actorUserId);
    if (!actorMember || !hasPermission(actorMember.role, PERMISSIONS.MANAGE_ORGANIZATION)) {
      throw new Error("You do not have permission to modify organization settings.");
    }

    const trimmedName = name.trim();
    const slug = slugify(trimmedName);
    return db.updateOrganization(orgId, { name: trimmedName, slug });
  },

  async listMembers(orgId) {
    return db.listOrganizationMembers(orgId);
  },

  async listInvitations(orgId) {
    return db.listPendingInvitations(orgId);
  },

  /**
   * Invite a new team member by email.
   */
  async inviteMember({ orgId, actorUserId, email, role = "member", appUrl = "" }) {
    const actorMember = await db.findMember(orgId, actorUserId);
    if (!actorMember || !hasPermission(actorMember.role, PERMISSIONS.INVITE_MEMBERS)) {
      throw new Error("You do not have permission to invite team members.");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if target user is already a member
    const existingUser = await db.findUserByEmail(normalizedEmail);
    if (existingUser) {
      const alreadyMember = await db.findMember(orgId, existingUser.id);
      if (alreadyMember) {
        throw new Error("This user is already a member of this organization.");
      }
    }

    const rawToken = generateRandomToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const invite = await db.createInvitation({
      id: generateId("inv"),
      organizationId: orgId,
      email: normalizedEmail,
      role,
      tokenHash,
      expiresAt,
      invitedBy: actorUserId,
    });

    const org = await db.findOrganizationById(orgId);
    const inviteUrl = `${appUrl}/signup?invitation=${rawToken}`;

    await sendEmail({
      to: normalizedEmail,
      subject: `You have been invited to join ${org?.name || "a workspace"} on RawReply`,
      text: `You have been invited to collaborate on ${org?.name || "RawReply"} as ${role}.\n\nClick the link below to accept your invitation:\n${inviteUrl}\n\nThis invitation will expire in 7 days.`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2>Join ${org?.name || "Workspace"} on RawReply</h2>
          <p>You have been invited to join <strong>${org?.name || "RawReply"}</strong> as a <strong>${role}</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${inviteUrl}" style="background-color: #635bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </p>
          <p style="font-size: 12px; color: #667085;">Direct link: ${inviteUrl}</p>
        </div>
      `,
    });

    return { invite, inviteUrl };
  },

  async cancelInvitation({ orgId, invitationId, actorUserId }) {
    const actorMember = await db.findMember(orgId, actorUserId);
    if (!actorMember || !hasPermission(actorMember.role, PERMISSIONS.INVITE_MEMBERS)) {
      throw new Error("You do not have permission to cancel invitations.");
    }
    await db.cancelInvitation(orgId, invitationId);
    return { success: true };
  },

  async removeMember({ orgId, targetUserId, actorUserId }) {
    const actorMember = await db.findMember(orgId, actorUserId);
    const targetMember = await db.findMember(orgId, targetUserId);

    if (!actorMember || !targetMember) {
      throw new Error("Member not found in organization.");
    }

    if (!canRemoveMember(actorMember.role, targetMember.role)) {
      throw new Error("You do not have permission to remove this member.");
    }

    await db.removeMember(orgId, targetUserId);
    return { success: true };
  },

  async updateMemberRole({ orgId, targetUserId, newRole, actorUserId }) {
    const actorMember = await db.findMember(orgId, actorUserId);
    const targetMember = await db.findMember(orgId, targetUserId);

    if (!actorMember || !targetMember) {
      throw new Error("Member not found in organization.");
    }

    if (!canChangeRole(actorMember.role, targetMember.role, newRole)) {
      throw new Error("You do not have permission to change this member's role.");
    }

    const updated = await db.updateMemberRole(orgId, targetUserId, newRole);
    return updated;
  },

  async acceptInvitation({ token, userId }) {
    const tokenHash = hashToken(token);
    const invite = await db.findInvitationByTokenHash(tokenHash);

    if (!invite) {
      throw new Error("Invalid or expired invitation link.");
    }

    if (invite.accepted_at) {
      throw new Error("This invitation has already been accepted.");
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new Error("This invitation has expired.");
    }

    // Add user as member with invited role
    await db.addOrganizationMember({
      id: generateId("mem"),
      organizationId: invite.organization_id,
      userId,
      role: invite.role,
    });

    await db.markInvitationAccepted(invite.id);
    return { organizationId: invite.organization_id, role: invite.role };
  },

  async leaveOrganization({ orgId, userId }) {
    const member = await db.findMember(orgId, userId);
    if (!member) {
      throw new Error("You are not a member of this organization.");
    }

    if (member.role === ROLES.OWNER) {
      // Check if there are other owners
      const allMembers = await db.listOrganizationMembers(orgId);
      const ownerCount = allMembers.filter((m) => m.role === ROLES.OWNER).length;
      if (ownerCount <= 1) {
        throw new Error(
          "As the sole owner, you cannot leave the organization. Please transfer ownership first."
        );
      }
    }

    await db.removeMember(orgId, userId);
    return { success: true };
  },
};
