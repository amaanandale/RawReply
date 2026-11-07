import fs from "fs";
import path from "path";
import crypto from "crypto";
import pg from "pg";

const { Pool } = pg;

// Resolved data directory for fallback persistent store (uses /tmp on Vercel/serverless)
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "data")
  : path.join(process.cwd(), "data");
const FALLBACK_DB_FILE = path.join(DATA_DIR, "auth_db.json");

let pgPool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production" && !process.env.DATABASE_URL.includes("localhost")
          ? { rejectUnauthorized: false }
          : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pgPool;
}

function sanitizeRole(role) {
  if (!role) return "member";
  if (typeof role === "object") {
    const raw = (role.name || role.id || "member").toLowerCase();
    if (raw.includes("owner") || raw.includes("admin")) return "owner";
    return "member";
  }
  return String(role).toLowerCase();
}

// Ensure local data directory and fallback database file exist
function getFallbackData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FALLBACK_DB_FILE)) {
    const initial = {
      users: [],
      organizations: [],
      organization_members: [],
      invitations: [],
      sessions: [],
      auth_tokens: [],
      system_audit_logs: [],
    };
    fs.writeFileSync(FALLBACK_DB_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(FALLBACK_DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.system_audit_logs) parsed.system_audit_logs = [];
    let updated = false;

    parsed.system_audit_logs.forEach((log, idx) => {
      if (!log.id) {
        log.id = `log_${Date.now()}_${idx}_${crypto.randomBytes(4).toString("hex")}`;
        updated = true;
      }
    });

    if (Array.isArray(parsed.organization_members)) {
      parsed.organization_members.forEach((m) => {
        if (typeof m.role === "object") {
          m.role = sanitizeRole(m.role);
          updated = true;
        }
      });
    }

    if (Array.isArray(parsed.invitations)) {
      parsed.invitations.forEach((inv) => {
        if (typeof inv.role === "object") {
          inv.role = sanitizeRole(inv.role);
          updated = true;
        }
      });
    }

    if (updated) {
      fs.writeFileSync(FALLBACK_DB_FILE, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  } catch {
    return {
      users: [],
      organizations: [],
      organization_members: [],
      invitations: [],
      sessions: [],
      auth_tokens: [],
      system_audit_logs: [],
    };
  }
}

function saveFallbackData(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(FALLBACK_DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

export const db = {
  isPostgres() {
    return Boolean(process.env.DATABASE_URL);
  },

  async query(text, params = []) {
    const pool = getPool();
    if (pool) {
      return pool.query(text, params);
    }
    throw new Error("Direct SQL query is only available when DATABASE_URL is configured.");
  },

  // -------------------------------------------------------------
  // Users Repository
  // -------------------------------------------------------------
  async findUserByEmail(email) {
    const normalized = email.toLowerCase().trim();
    const pool = getPool();
    if (pool) {
      const res = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1", [normalized]);
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    return data.users.find((u) => u.email.toLowerCase() === normalized) || null;
  },

  async findUserById(id) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    return data.users.find((u) => u.id === id) || null;
  },

  async createUser({ id, name, email, passwordHash, status = "active", isSuperAdmin = false, platformRole = "customer" }) {
    const now = new Date().toISOString();
    const normalized = email.toLowerCase().trim();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO users (id, name, email, password_hash, status, is_super_admin, platform_role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [id, name, normalized, passwordHash, status, isSuperAdmin, platformRole, now, now]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    const user = {
      id,
      name,
      email: normalized,
      password_hash: passwordHash,
      email_verified_at: null,
      status,
      is_super_admin: Boolean(isSuperAdmin),
      platform_role: platformRole,
      created_at: now,
      updated_at: now,
    };
    data.users.push(user);
    saveFallbackData(data);
    return user;
  },

  async updateUserPassword(userId, newPasswordHash) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      await pool.query("UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3", [
        newPasswordHash,
        now,
        userId,
      ]);
      return;
    }
    const data = getFallbackData();
    const user = data.users.find((u) => u.id === userId);
    if (user) {
      user.password_hash = newPasswordHash;
      user.updated_at = now;
      saveFallbackData(data);
    }
  },

  async markEmailVerified(userId) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      await pool.query("UPDATE users SET email_verified_at = $1, updated_at = $2 WHERE id = $3", [
        now,
        now,
        userId,
      ]);
      return;
    }
    const data = getFallbackData();
    const user = data.users.find((u) => u.id === userId);
    if (user) {
      user.email_verified_at = now;
      user.updated_at = now;
      saveFallbackData(data);
    }
  },

  // -------------------------------------------------------------
  // Organizations Repository
  // -------------------------------------------------------------
  async createOrganization({ id, name, slug }) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO organizations (id, name, slug, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, name, slug, now, now]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    const org = { id, name, slug, created_at: now, updated_at: now };
    data.organizations.push(org);
    saveFallbackData(data);
    return org;
  },

  async findOrganizationById(id) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query("SELECT * FROM organizations WHERE id = $1 LIMIT 1", [id]);
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    return data.organizations.find((o) => o.id === id) || null;
  },

  async findOrganizationBySlug(slug) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query("SELECT * FROM organizations WHERE slug = $1 LIMIT 1", [slug]);
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    return data.organizations.find((o) => o.slug === slug) || null;
  },

  async updateOrganization(id, { name, slug }) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `UPDATE organizations SET name = $1, slug = $2, updated_at = $3 WHERE id = $4 RETURNING *`,
        [name, slug, now, id]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    const org = data.organizations.find((o) => o.id === id);
    if (org) {
      org.name = name;
      org.slug = slug;
      org.updated_at = now;
      saveFallbackData(data);
    }
    return org;
  },

  // -------------------------------------------------------------
  // Organization Members Repository
  // -------------------------------------------------------------
  async addOrganizationMember({ id, organizationId, userId, role = "member" }) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO organization_members (id, organization_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role
         RETURNING *`,
        [id, organizationId, userId, role, now]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    const existingIndex = data.organization_members.findIndex(
      (m) => m.organization_id === organizationId && m.user_id === userId
    );
    const member = { id, organization_id: organizationId, user_id: userId, role, joined_at: now };
    if (existingIndex >= 0) {
      data.organization_members[existingIndex] = member;
    } else {
      data.organization_members.push(member);
    }
    saveFallbackData(data);
    return member;
  },

  async findMember(organizationId, userId) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        "SELECT * FROM organization_members WHERE organization_id = $1 AND user_id = $2 LIMIT 1",
        [organizationId, userId]
      );
      if (!res.rows[0]) return null;
      return { ...res.rows[0], role: sanitizeRole(res.rows[0].role) };
    }
    const data = getFallbackData();
    const found = data.organization_members.find(
      (m) => m.organization_id === organizationId && m.user_id === userId
    );
    if (!found) return null;
    return { ...found, role: sanitizeRole(found.role) };
  },

  async listUserOrganizations(userId) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `SELECT o.*, m.role, m.joined_at
         FROM organizations o
         JOIN organization_members m ON o.id = m.organization_id
         WHERE m.user_id = $1
         ORDER BY o.name ASC`,
        [userId]
      );
      return res.rows.map((r) => ({ ...r, role: sanitizeRole(r.role) }));
    }
    const data = getFallbackData();
    const memberships = data.organization_members.filter((m) => m.user_id === userId);
    return memberships
      .map((m) => {
        const org = data.organizations.find((o) => o.id === m.organization_id);
        if (!org) return null;
        return {
          ...org,
          role: sanitizeRole(m.role),
          joined_at: m.joined_at,
        };
      })
      .filter(Boolean);
  },

  async listOrganizationMembers(organizationId) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `SELECT m.id as membership_id, m.role, m.joined_at, u.id as user_id, u.name, u.email
         FROM organization_members m
         JOIN users u ON m.user_id = u.id
         WHERE m.organization_id = $1
         ORDER BY m.joined_at ASC`,
        [organizationId]
      );
      return res.rows.map((r) => ({ ...r, role: sanitizeRole(r.role) }));
    }
    const data = getFallbackData();
    const members = data.organization_members.filter((m) => m.organization_id === organizationId);
    return members
      .map((m) => {
        const u = data.users.find((user) => user.id === m.user_id);
        if (!u) return null;
        return {
          membership_id: m.id,
          role: sanitizeRole(m.role),
          joined_at: m.joined_at,
          user_id: u.id,
          name: u.name,
          email: u.email,
        };
      })
      .filter(Boolean);
  },

  async updateMemberRole(organizationId, userId, newRole) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `UPDATE organization_members SET role = $1 WHERE organization_id = $2 AND user_id = $3 RETURNING *`,
        [newRole, organizationId, userId]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    const member = data.organization_members.find(
      (m) => m.organization_id === organizationId && m.user_id === userId
    );
    if (member) {
      member.role = newRole;
      saveFallbackData(data);
    }
    return member;
  },

  async removeMember(organizationId, userId) {
    const pool = getPool();
    if (pool) {
      await pool.query("DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2", [
        organizationId,
        userId,
      ]);
      return;
    }
    const data = getFallbackData();
    data.organization_members = data.organization_members.filter(
      (m) => !(m.organization_id === organizationId && m.user_id === userId)
    );
    saveFallbackData(data);
  },

  // -------------------------------------------------------------
  // Invitations Repository
  // -------------------------------------------------------------
  async createInvitation({ id, organizationId, email, role, tokenHash, expiresAt, invitedBy }) {
    const now = new Date().toISOString();
    const normalized = email.toLowerCase().trim();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO invitations (id, organization_id, email, role, token_hash, expires_at, invited_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, organizationId, normalized, role, tokenHash, expiresAt, invitedBy, now]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    const invite = {
      id,
      organization_id: organizationId,
      email: normalized,
      role,
      token_hash: tokenHash,
      expires_at: expiresAt,
      accepted_at: null,
      invited_by: invitedBy,
      created_at: now,
    };
    data.invitations.push(invite);
    saveFallbackData(data);
    return invite;
  },

  async findInvitationByTokenHash(tokenHash) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query("SELECT * FROM invitations WHERE token_hash = $1 LIMIT 1", [tokenHash]);
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    return data.invitations.find((i) => i.token_hash === tokenHash) || null;
  },

  async listPendingInvitations(organizationId) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `SELECT i.*, u.name as invited_by_name
         FROM invitations i
         JOIN users u ON i.invited_by = u.id
         WHERE i.organization_id = $1 AND i.accepted_at IS NULL AND i.expires_at > $2
         ORDER BY i.created_at DESC`,
        [organizationId, now]
      );
      return res.rows;
    }
    const data = getFallbackData();
    return data.invitations
      .filter((i) => i.organization_id === organizationId && !i.accepted_at && i.expires_at > now)
      .map((i) => {
        const u = data.users.find((user) => user.id === i.invited_by);
        return {
          ...i,
          invited_by_name: u?.name || "Unknown",
        };
      });
  },

  async markInvitationAccepted(invitationId) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      await pool.query("UPDATE invitations SET accepted_at = $1 WHERE id = $2", [now, invitationId]);
      return;
    }
    const data = getFallbackData();
    const inv = data.invitations.find((i) => i.id === invitationId);
    if (inv) {
      inv.accepted_at = now;
      saveFallbackData(data);
    }
  },

  async cancelInvitation(organizationId, invitationId) {
    const pool = getPool();
    if (pool) {
      await pool.query("DELETE FROM invitations WHERE id = $1 AND organization_id = $2", [
        invitationId,
        organizationId,
      ]);
      return;
    }
    const data = getFallbackData();
    data.invitations = data.invitations.filter(
      (i) => !(i.id === invitationId && i.organization_id === organizationId)
    );
    saveFallbackData(data);
  },

  // -------------------------------------------------------------
  // Sessions Repository
  // -------------------------------------------------------------
  async createSession({ id, userId, activeOrganizationId, refreshTokenHash, expiresAt, userAgent, ipAddress }) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO sessions (id, user_id, active_organization_id, refresh_token_hash, expires_at, user_agent, ip_address, created_at, last_used_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [id, userId, activeOrganizationId, refreshTokenHash, expiresAt, userAgent, ipAddress, now, now]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    const session = {
      id,
      user_id: userId,
      active_organization_id: activeOrganizationId,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt,
      revoked_at: null,
      user_agent: userAgent,
      ip_address: ipAddress,
      created_at: now,
      last_used_at: now,
    };
    data.sessions.push(session);
    saveFallbackData(data);
    return session;
  },

  async findSessionByRefreshTokenHash(refreshTokenHash) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        "SELECT * FROM sessions WHERE refresh_token_hash = $1 LIMIT 1",
        [refreshTokenHash]
      );
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    return data.sessions.find((s) => s.refresh_token_hash === refreshTokenHash) || null;
  },

  async findSessionById(id) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query("SELECT * FROM sessions WHERE id = $1 LIMIT 1", [id]);
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    return data.sessions.find((s) => s.id === id) || null;
  },

  async updateSessionRefreshToken(sessionId, newRefreshTokenHash, newExpiresAt) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `UPDATE sessions SET refresh_token_hash = $1, expires_at = $2, last_used_at = $3 WHERE id = $4 RETURNING *`,
        [newRefreshTokenHash, newExpiresAt, now, sessionId]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    const session = data.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.refresh_token_hash = newRefreshTokenHash;
      session.expires_at = newExpiresAt;
      session.last_used_at = now;
      saveFallbackData(data);
    }
    return session;
  },

  async updateSessionActiveOrganization(sessionId, organizationId) {
    const pool = getPool();
    if (pool) {
      await pool.query("UPDATE sessions SET active_organization_id = $1 WHERE id = $2", [
        organizationId,
        sessionId,
      ]);
      return;
    }
    const data = getFallbackData();
    const session = data.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.active_organization_id = organizationId;
      saveFallbackData(data);
    }
  },

  async revokeSession(sessionId) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      await pool.query("UPDATE sessions SET revoked_at = $1 WHERE id = $2", [now, sessionId]);
      return;
    }
    const data = getFallbackData();
    const session = data.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.revoked_at = now;
      saveFallbackData(data);
    }
  },

  async revokeAllUserSessions(userId) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      await pool.query("UPDATE sessions SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL", [
        now,
        userId,
      ]);
      return;
    }
    const data = getFallbackData();
    for (const session of data.sessions) {
      if (session.user_id === userId && !session.revoked_at) {
        session.revoked_at = now;
      }
    }
    saveFallbackData(data);
  },

  // -------------------------------------------------------------
  // Auth Tokens Repository (Password Reset & Verification)
  // -------------------------------------------------------------
  async createAuthToken({ id, userId, type, tokenHash, expiresAt }) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO auth_tokens (id, user_id, type, token_hash, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, userId, type, tokenHash, expiresAt, now]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    const token = {
      id,
      user_id: userId,
      type,
      token_hash: tokenHash,
      expires_at: expiresAt,
      used_at: null,
      created_at: now,
    };
    data.auth_tokens.push(token);
    saveFallbackData(data);
    return token;
  },

  async findAuthToken(tokenHash, type) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        "SELECT * FROM auth_tokens WHERE token_hash = $1 AND type = $2 LIMIT 1",
        [tokenHash, type]
      );
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    return (
      data.auth_tokens.find((t) => t.token_hash === tokenHash && t.type === type) || null
    );
  },

  async markAuthTokenUsed(id) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      await pool.query("UPDATE auth_tokens SET used_at = $1 WHERE id = $2", [now, id]);
      return;
    }
    const data = getFallbackData();
    const tok = data.auth_tokens.find((t) => t.id === id);
    if (tok) {
      tok.used_at = now;
      saveFallbackData(data);
    }
  },

  // -------------------------------------------------------------
  // Super Admin & System Management
  // -------------------------------------------------------------
  async makeSuperAdmin(identifier) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `UPDATE users
         SET is_super_admin = true, platform_role = 'super_admin', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 OR LOWER(email) = LOWER($1)
         RETURNING *`,
        [identifier]
      );
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    const user = data.users.find(
      (u) => u.id === identifier || u.email.toLowerCase() === identifier.toLowerCase()
    );
    if (user) {
      user.is_super_admin = true;
      user.platform_role = "super_admin";
      user.updated_at = new Date().toISOString();
      saveFallbackData(data);
      return user;
    }
    return null;
  },

  async setCustomerStatus(userId, status) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        "UPDATE users SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *",
        [status, now, userId]
      );
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    const user = data.users.find((u) => u.id === userId);
    if (user) {
      user.status = status;
      user.updated_at = now;
      saveFallbackData(data);
      return user;
    }
    return null;
  },

  async setOrganizationStatus(orgId, status) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        "UPDATE organizations SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *",
        [status, now, orgId]
      );
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    const org = data.organizations.find((o) => o.id === orgId);
    if (org) {
      org.status = status;
      org.updated_at = now;
      saveFallbackData(data);
      return org;
    }
    return null;
  },

  async recordAuditLog({ id, actorId, performedBy, actorEmail, action, targetType, targetId, details, ipAddress }) {
    const logId = id || `log_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const resolvedActorId = actorId || performedBy || null;
    const now = new Date().toISOString();
    const pool = getPool();
    const detailsStr = typeof details === "object" ? JSON.stringify(details) : details || null;
    if (pool) {
      const res = await pool.query(
        `INSERT INTO system_audit_logs (id, actor_id, actor_email, action, target_type, target_id, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [logId, resolvedActorId, actorEmail, action, targetType, targetId, detailsStr, ipAddress, now]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    if (!data.system_audit_logs) data.system_audit_logs = [];
    const log = {
      id: logId,
      actor_id: resolvedActorId,
      actor_email: actorEmail,
      action,
      target_type: targetType,
      target_id: targetId,
      details: detailsStr,
      ip_address: ipAddress,
      created_at: now,
    };
    data.system_audit_logs.unshift(log); // Prepend so newest is first
    saveFallbackData(data);
    return log;
  },

  async listAuditLogs({ limit = 20, offset = 0, action = "", search = "" } = {}) {
    const pool = getPool();
    if (pool) {
      let query = "SELECT * FROM system_audit_logs WHERE 1=1";
      const params = [];
      if (action) {
        params.push(action);
        query += ` AND action = $${params.length}`;
      }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(actor_email) LIKE $${params.length} OR LOWER(target_id) LIKE $${params.length} OR LOWER(details) LIKE $${params.length})`;
      }
      params.push(limit);
      query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
      params.push(offset);
      query += ` OFFSET $${params.length}`;
      const res = await pool.query(query, params);
      return res.rows;
    }
    const data = getFallbackData();
    let logs = (data.system_audit_logs || []).slice();
    if (action) {
      logs = logs.filter((l) => l.action === action);
    }
    if (search) {
      const term = search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.actor_email?.toLowerCase().includes(term) ||
          l.target_id?.toLowerCase().includes(term) ||
          l.details?.toLowerCase().includes(term)
      );
    }
    return logs.slice(offset, offset + limit);
  },

  async countAuditLogs({ action = "", search = "" } = {}) {
    const pool = getPool();
    if (pool) {
      let query = "SELECT COUNT(*) as count FROM system_audit_logs WHERE 1=1";
      const params = [];
      if (action) {
        params.push(action);
        query += ` AND action = $${params.length}`;
      }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(actor_email) LIKE $${params.length} OR LOWER(target_id) LIKE $${params.length} OR LOWER(details) LIKE $${params.length})`;
      }
      const res = await pool.query(query, params);
      return parseInt(res.rows[0].count, 10);
    }
    const data = getFallbackData();
    let logs = (data.system_audit_logs || []).slice();
    if (action) {
      logs = logs.filter((l) => l.action === action);
    }
    if (search) {
      const term = search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.actor_email?.toLowerCase().includes(term) ||
          l.target_id?.toLowerCase().includes(term) ||
          l.details?.toLowerCase().includes(term)
      );
    }
    return logs.length;
  },

  async listAllCustomers({ search = "", status = "", limit = 20, offset = 0 } = {}) {
    const pool = getPool();
    if (pool) {
      let query = `
        SELECT u.id, u.name, u.email, u.status, u.is_super_admin, u.platform_role, u.created_at,
               m.role as organization_role, o.id as organization_id, o.name as organization_name
        FROM users u
        LEFT JOIN organization_members m ON u.id = m.user_id
        LEFT JOIN organizations o ON m.organization_id = o.id
        WHERE 1=1
      `;
      const params = [];
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
      }
      if (status) {
        params.push(status);
        query += ` AND u.status = $${params.length}`;
      }
      params.push(limit);
      query += ` ORDER BY u.created_at DESC LIMIT $${params.length}`;
      params.push(offset);
      query += ` OFFSET $${params.length}`;
      const res = await pool.query(query, params);
      return res.rows;
    }
    const data = getFallbackData();
    let users = data.users.slice();
    if (search) {
      const term = search.toLowerCase();
      users = users.filter((u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
    }
    if (status) {
      users = users.filter((u) => u.status === status);
    }
    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const page = users.slice(offset, offset + limit);
    return page.map((u) => {
      const member = data.organization_members.find((m) => m.user_id === u.id);
      const org = member ? data.organizations.find((o) => o.id === member.organization_id) : null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        is_super_admin: Boolean(u.is_super_admin),
        platform_role: u.platform_role || "customer",
        created_at: u.created_at,
        organization_role: member?.role || null,
        organization_id: org?.id || null,
        organization_name: org?.name || null,
      };
    });
  },

  async countAllCustomers({ search = "", status = "" } = {}) {
    const pool = getPool();
    if (pool) {
      let query = "SELECT COUNT(*) as count FROM users WHERE 1=1";
      const params = [];
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`;
      }
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
      const res = await pool.query(query, params);
      return parseInt(res.rows[0].count, 10);
    }
    const data = getFallbackData();
    let users = data.users.slice();
    if (search) {
      const term = search.toLowerCase();
      users = users.filter((u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
    }
    if (status) {
      users = users.filter((u) => u.status === status);
    }
    return users.length;
  },

  async listAllOrganizations({ search = "", status = "", limit = 20, offset = 0 } = {}) {
    const pool = getPool();
    if (pool) {
      let query = `
        SELECT o.id, o.name, o.slug, o.status, o.created_at,
               u.id as owner_id, u.name as owner_name, u.email as owner_email,
               COUNT(DISTINCT m.user_id) as member_count
        FROM organizations o
        LEFT JOIN organization_members m_owner ON o.id = m_owner.organization_id AND m_owner.role = 'owner'
        LEFT JOIN users u ON m_owner.user_id = u.id
        LEFT JOIN organization_members m ON o.id = m.organization_id
        WHERE 1=1
      `;
      const params = [];
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(o.name) LIKE $${params.length} OR LOWER(o.slug) LIKE $${params.length})`;
      }
      if (status) {
        params.push(status);
        query += ` AND o.status = $${params.length}`;
      }
      query += ` GROUP BY o.id, u.id, u.name, u.email ORDER BY o.created_at DESC`;
      params.push(limit);
      query += ` LIMIT $${params.length}`;
      params.push(offset);
      query += ` OFFSET $${params.length}`;
      const res = await pool.query(query, params);
      return res.rows;
    }
    const data = getFallbackData();
    let orgs = data.organizations.slice();
    if (search) {
      const term = search.toLowerCase();
      orgs = orgs.filter((o) => o.name.toLowerCase().includes(term) || o.slug.toLowerCase().includes(term));
    }
    if (status) {
      orgs = orgs.filter((o) => (o.status || "active") === status);
    }
    orgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const page = orgs.slice(offset, offset + limit);
    return page.map((o) => {
      const members = data.organization_members.filter((m) => m.organization_id === o.id);
      const ownerMember = members.find((m) => m.role === "owner");
      const ownerUser = ownerMember ? data.users.find((u) => u.id === ownerMember.user_id) : null;
      return {
        id: o.id,
        name: o.name,
        slug: o.slug,
        status: o.status || "active",
        created_at: o.created_at,
        owner_id: ownerUser?.id || null,
        owner_name: ownerUser?.name || "Unassigned",
        owner_email: ownerUser?.email || "Unknown",
        member_count: members.length,
      };
    });
  },

  async countAllOrganizations({ search = "", status = "" } = {}) {
    const pool = getPool();
    if (pool) {
      let query = "SELECT COUNT(*) as count FROM organizations WHERE 1=1";
      const params = [];
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(slug) LIKE $${params.length})`;
      }
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
      const res = await pool.query(query, params);
      return parseInt(res.rows[0].count, 10);
    }
    const data = getFallbackData();
    let orgs = data.organizations.slice();
    if (search) {
      const term = search.toLowerCase();
      orgs = orgs.filter((o) => o.name.toLowerCase().includes(term) || o.slug.toLowerCase().includes(term));
    }
    if (status) {
      orgs = orgs.filter((o) => (o.status || "active") === status);
    }
    return orgs.length;
  },

  async getPlatformMetrics() {
    const data = getFallbackData();
    const users = data.users || [];
    const orgs = data.organizations || [];

    const totalUsers = users.length;
    const activeCustomers = users.filter((u) => u.status === "active" && !u.is_super_admin).length;
    const suspendedCustomers = users.filter((u) => u.status === "suspended").length;
    const superAdminsCount = users.filter((u) => u.is_super_admin).length;
    const totalOrganizations = orgs.length;

    // Get recent registrations
    const recentUsers = users
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        created_at: u.created_at,
      }));

    return {
      totalUsers,
      activeUsers: activeCustomers,
      activeCustomers,
      suspendedCustomers,
      superAdminsCount,
      totalOrganizations,
      totalAuditLogs: (data.system_audit_logs || []).length,
      recentUsers,
    };
  },
};

