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
      instagram_accounts: [],
      instagram_media: [],
      automations: [],
      automation_executions: [],
      conversations: [],
      messages: [],
      comments: [],
      captured_leads: [],
      login_events: [],
      system_errors: [],
      webhook_events: [],
      subscriptions: [],
    };
    fs.writeFileSync(FALLBACK_DB_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(FALLBACK_DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    let updated = false;
    if (!parsed.system_audit_logs) { parsed.system_audit_logs = []; updated = true; }
    if (!parsed.login_events) { parsed.login_events = []; updated = true; }
    if (!parsed.system_errors) { parsed.system_errors = []; updated = true; }
    if (!parsed.instagram_accounts) { parsed.instagram_accounts = []; updated = true; }
    if (!parsed.conversations) { parsed.conversations = []; updated = true; }
    if (!parsed.messages) { parsed.messages = []; updated = true; }
    if (!parsed.comments) { parsed.comments = []; updated = true; }
    if (!parsed.captured_leads) { parsed.captured_leads = []; updated = true; }
    if (!parsed.webhook_events) { parsed.webhook_events = []; updated = true; }
    if (!parsed.subscriptions) { parsed.subscriptions = []; updated = true; }
    if (!parsed.automations) { parsed.automations = []; updated = true; }
    if (!parsed.instagram_media) { parsed.instagram_media = []; updated = true; }
    if (!parsed.automation_executions) { parsed.automation_executions = []; updated = true; }

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

  async createUser({
    id,
    name,
    email,
    passwordHash,
    status = "active",
    isSuperAdmin = false,
    platformRole = "customer",
    authProvider = "email_otp",
    emailVerifiedAt = null,
  }) {
    const now = new Date().toISOString();
    const normalized = email.toLowerCase().trim();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO users (id, name, email, password_hash, status, is_super_admin, platform_role, auth_provider, email_verified_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [id, name, normalized, passwordHash, status, isSuperAdmin, platformRole, authProvider, emailVerifiedAt, now, now]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    const user = {
      id,
      name,
      email: normalized,
      password_hash: passwordHash,
      email_verified_at: emailVerifiedAt,
      status,
      is_super_admin: Boolean(isSuperAdmin),
      platform_role: platformRole,
      auth_provider: authProvider,
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

  async listAllCustomers({ search = "", status = "", filter = "", limit = 20, offset = 0 } = {}) {
    const pool = getPool();
    if (pool) {
      let query = `
        SELECT u.id, u.name, u.email, u.status, u.is_super_admin, u.platform_role, u.created_at,
               u.auth_provider, u.email_verified_at, u.last_login_at,
               m.role as organization_role, o.id as organization_id, o.name as organization_name
        FROM users u
        LEFT JOIN organization_members m ON u.id = m.user_id
        LEFT JOIN organizations o ON m.organization_id = o.id
        WHERE u.is_super_admin = false
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
      if (filter === "google") {
        query += ` AND u.auth_provider = 'google'`;
      } else if (filter === "email_otp") {
        query += ` AND (u.auth_provider = 'email_otp' OR u.auth_provider = 'email' OR u.auth_provider IS NULL)`;
      } else if (filter === "verified") {
        query += ` AND u.email_verified_at IS NOT NULL`;
      }
      params.push(limit);
      query += ` ORDER BY u.created_at DESC LIMIT $${params.length}`;
      params.push(offset);
      query += ` OFFSET $${params.length}`;
      const res = await pool.query(query, params);
      return res.rows;
    }
    const data = getFallbackData();
    let users = data.users.filter((u) => !u.is_super_admin);
    if (search) {
      const term = search.toLowerCase();
      users = users.filter((u) => u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
    }
    if (status) {
      users = users.filter((u) => u.status === status);
    }
    if (filter === "google") {
      users = users.filter((u) => u.auth_provider === "google");
    } else if (filter === "email_otp") {
      users = users.filter((u) => u.auth_provider === "email_otp" || u.auth_provider === "email" || !u.auth_provider);
    } else if (filter === "verified") {
      users = users.filter((u) => Boolean(u.email_verified_at) || u.auth_provider === "google");
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
        auth_provider: u.auth_provider || "email_otp",
        email_verified_at: u.email_verified_at || (u.auth_provider === "google" ? u.created_at : null),
        last_login_at: u.last_login_at || null,
        is_super_admin: false,
        platform_role: u.platform_role || "customer",
        created_at: u.created_at,
        organization_role: member?.role || null,
        organization_id: org?.id || null,
        organization_name: org?.name || null,
      };
    });
  },

  async countAllCustomers({ search = "", status = "", filter = "" } = {}) {
    const pool = getPool();
    if (pool) {
      let query = "SELECT COUNT(*) as count FROM users WHERE is_super_admin = false";
      const params = [];
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`;
      }
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
      if (filter === "google") {
        query += ` AND auth_provider = 'google'`;
      } else if (filter === "email_otp") {
        query += ` AND (auth_provider = 'email_otp' OR auth_provider = 'email' OR auth_provider IS NULL)`;
      } else if (filter === "verified") {
        query += ` AND email_verified_at IS NOT NULL`;
      }
      const res = await pool.query(query, params);
      return parseInt(res.rows[0].count, 10);
    }
    const data = getFallbackData();
    let users = data.users.filter((u) => !u.is_super_admin);
    if (search) {
      const term = search.toLowerCase();
      users = users.filter((u) => u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
    }
    if (status) {
      users = users.filter((u) => u.status === status);
    }
    if (filter === "google") {
      users = users.filter((u) => u.auth_provider === "google");
    } else if (filter === "email_otp") {
      users = users.filter((u) => u.auth_provider === "email_otp" || u.auth_provider === "email" || !u.auth_provider);
    } else if (filter === "verified") {
      users = users.filter((u) => Boolean(u.email_verified_at) || u.auth_provider === "google");
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

  // -------------------------------------------------------------
  // Authentication & Login Event Monitoring Repository
  // -------------------------------------------------------------
  async updateUserLastLogin(userId) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      await pool.query("UPDATE users SET last_login_at = $1 WHERE id = $2", [now, userId]);
      return;
    }
    const data = getFallbackData();
    const user = data.users.find((u) => u.id === userId);
    if (user) {
      user.last_login_at = now;
      saveFallbackData(data);
    }
  },

  async recordLoginEvent({
    id,
    userId,
    organizationId,
    email,
    eventType,
    status = "success",
    safeErrorCode,
    safeErrorDescription,
    ipAddress,
    userAgent,
    requestId,
  }) {
    const eventId = id || `login_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO login_events (id, user_id, organization_id, email, event_type, status, safe_error_code, safe_error_description, ip_address, user_agent, request_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          eventId,
          userId || null,
          organizationId || null,
          (email || "unknown").toLowerCase().trim(),
          eventType,
          status,
          safeErrorCode || null,
          safeErrorDescription || null,
          ipAddress || null,
          userAgent || null,
          requestId || null,
          now,
        ]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    if (!data.login_events) data.login_events = [];
    const event = {
      id: eventId,
      user_id: userId || null,
      organization_id: organizationId || null,
      email: (email || "unknown").toLowerCase().trim(),
      event_type: eventType,
      status,
      safe_error_code: safeErrorCode || null,
      safe_error_description: safeErrorDescription || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      request_id: requestId || null,
      created_at: now,
    };
    data.login_events.unshift(event);
    saveFallbackData(data);
    return event;
  },

  async listLoginEvents({ userId, organizationId, email, eventType, status, limit = 50, offset = 0 } = {}) {
    const pool = getPool();
    if (pool) {
      let query = "SELECT * FROM login_events WHERE 1=1";
      const params = [];
      if (userId) {
        params.push(userId);
        query += ` AND user_id = $${params.length}`;
      }
      if (organizationId) {
        params.push(organizationId);
        query += ` AND organization_id = $${params.length}`;
      }
      if (email) {
        params.push(email.toLowerCase().trim());
        query += ` AND LOWER(email) = $${params.length}`;
      }
      if (eventType) {
        params.push(eventType);
        query += ` AND event_type = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
      params.push(limit);
      query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
      params.push(offset);
      query += ` OFFSET $${params.length}`;
      const res = await pool.query(query, params);
      return res.rows;
    }
    const data = getFallbackData();
    let events = (data.login_events || []).slice();
    if (userId) events = events.filter((e) => e.user_id === userId);
    if (organizationId) events = events.filter((e) => e.organization_id === organizationId);
    if (email) events = events.filter((e) => e.email?.toLowerCase() === email.toLowerCase().trim());
    if (eventType) events = events.filter((e) => e.event_type === eventType);
    if (status) events = events.filter((e) => e.status === status);
    return events.slice(offset, offset + limit);
  },

  async countLoginEvents({ userId, organizationId, email, eventType, status } = {}) {
    const pool = getPool();
    if (pool) {
      let query = "SELECT COUNT(*) as count FROM login_events WHERE 1=1";
      const params = [];
      if (userId) {
        params.push(userId);
        query += ` AND user_id = $${params.length}`;
      }
      if (organizationId) {
        params.push(organizationId);
        query += ` AND organization_id = $${params.length}`;
      }
      if (email) {
        params.push(email.toLowerCase().trim());
        query += ` AND LOWER(email) = $${params.length}`;
      }
      if (eventType) {
        params.push(eventType);
        query += ` AND event_type = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
      const res = await pool.query(query, params);
      return parseInt(res.rows[0].count, 10);
    }
    const data = getFallbackData();
    let events = (data.login_events || []).slice();
    if (userId) events = events.filter((e) => e.user_id === userId);
    if (organizationId) events = events.filter((e) => e.organization_id === organizationId);
    if (email) events = events.filter((e) => e.email?.toLowerCase() === email.toLowerCase().trim());
    if (eventType) events = events.filter((e) => e.event_type === eventType);
    if (status) events = events.filter((e) => e.status === status);
    return events.length;
  },

  // -------------------------------------------------------------
  // Centralized System Error Monitoring Repository
  // -------------------------------------------------------------
  async recordSystemError({
    id,
    fingerprint,
    severity = "error",
    category = "api",
    customerId,
    organizationId,
    endpoint,
    safeMessage,
    stackTrace,
    requestId,
  }) {
    const errorId = id || `err_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const existing = await pool.query(
        "SELECT id, occurrence_count FROM system_errors WHERE fingerprint = $1 AND resolved = false LIMIT 1",
        [fingerprint]
      );
      if (existing.rows[0]) {
        const res = await pool.query(
          `UPDATE system_errors
           SET occurrence_count = occurrence_count + 1, last_seen_at = $1, stack_trace = COALESCE($2, stack_trace)
           WHERE id = $3
           RETURNING *`,
          [now, stackTrace, existing.rows[0].id]
        );
        return res.rows[0];
      }
      const res = await pool.query(
        `INSERT INTO system_errors (id, fingerprint, severity, category, customer_id, organization_id, endpoint, safe_message, stack_trace, request_id, resolved, occurrence_count, first_seen_at, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, 1, $11, $11)
         RETURNING *`,
        [
          errorId,
          fingerprint,
          severity,
          category,
          customerId || null,
          organizationId || null,
          endpoint || null,
          safeMessage,
          stackTrace || null,
          requestId || null,
          now,
        ]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    if (!data.system_errors) data.system_errors = [];
    const existing = data.system_errors.find((e) => e.fingerprint === fingerprint && !e.resolved);
    if (existing) {
      existing.occurrence_count = (existing.occurrence_count || 1) + 1;
      existing.last_seen_at = now;
      if (stackTrace) existing.stack_trace = stackTrace;
      saveFallbackData(data);
      return existing;
    }
    const record = {
      id: errorId,
      fingerprint,
      severity,
      category,
      customer_id: customerId || null,
      organization_id: organizationId || null,
      endpoint: endpoint || null,
      safe_message: safeMessage,
      stack_trace: stackTrace || null,
      request_id: requestId || null,
      resolved: false,
      resolved_at: null,
      resolved_by: null,
      occurrence_count: 1,
      first_seen_at: now,
      last_seen_at: now,
    };
    data.system_errors.unshift(record);
    saveFallbackData(data);
    return record;
  },

  async listSystemErrors({ customerId, organizationId, category, severity, resolved, search, limit = 50, offset = 0 } = {}) {
    const pool = getPool();
    if (pool) {
      let query = "SELECT * FROM system_errors WHERE 1=1";
      const params = [];
      if (customerId) {
        params.push(customerId);
        query += ` AND customer_id = $${params.length}`;
      }
      if (organizationId) {
        params.push(organizationId);
        query += ` AND organization_id = $${params.length}`;
      }
      if (category) {
        params.push(category);
        query += ` AND category = $${params.length}`;
      }
      if (severity) {
        params.push(severity);
        query += ` AND severity = $${params.length}`;
      }
      if (typeof resolved === "boolean") {
        params.push(resolved);
        query += ` AND resolved = $${params.length}`;
      }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(safe_message) LIKE $${params.length} OR LOWER(endpoint) LIKE $${params.length})`;
      }
      params.push(limit);
      query += ` ORDER BY last_seen_at DESC LIMIT $${params.length}`;
      params.push(offset);
      query += ` OFFSET $${params.length}`;
      const res = await pool.query(query, params);
      return res.rows;
    }
    const data = getFallbackData();
    let errors = (data.system_errors || []).slice();
    if (customerId) errors = errors.filter((e) => e.customer_id === customerId);
    if (organizationId) errors = errors.filter((e) => e.organization_id === organizationId);
    if (category) errors = errors.filter((e) => e.category === category);
    if (severity) errors = errors.filter((e) => e.severity === severity);
    if (typeof resolved === "boolean") errors = errors.filter((e) => e.resolved === resolved);
    if (search) {
      const term = search.toLowerCase();
      errors = errors.filter((e) => e.safe_message?.toLowerCase().includes(term) || e.endpoint?.toLowerCase().includes(term));
    }
    return errors.slice(offset, offset + limit);
  },

  async countSystemErrors({ customerId, organizationId, category, severity, resolved, search } = {}) {
    const pool = getPool();
    if (pool) {
      let query = "SELECT COUNT(*) as count FROM system_errors WHERE 1=1";
      const params = [];
      if (customerId) {
        params.push(customerId);
        query += ` AND customer_id = $${params.length}`;
      }
      if (organizationId) {
        params.push(organizationId);
        query += ` AND organization_id = $${params.length}`;
      }
      if (category) {
        params.push(category);
        query += ` AND category = $${params.length}`;
      }
      if (severity) {
        params.push(severity);
        query += ` AND severity = $${params.length}`;
      }
      if (typeof resolved === "boolean") {
        params.push(resolved);
        query += ` AND resolved = $${params.length}`;
      }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(safe_message) LIKE $${params.length} OR LOWER(endpoint) LIKE $${params.length})`;
      }
      const res = await pool.query(query, params);
      return parseInt(res.rows[0].count, 10);
    }
    const data = getFallbackData();
    let errors = (data.system_errors || []).slice();
    if (customerId) errors = errors.filter((e) => e.customer_id === customerId);
    if (organizationId) errors = errors.filter((e) => e.organization_id === organizationId);
    if (category) errors = errors.filter((e) => e.category === category);
    if (severity) errors = errors.filter((e) => e.severity === severity);
    if (typeof resolved === "boolean") errors = errors.filter((e) => e.resolved === resolved);
    if (search) {
      const term = search.toLowerCase();
      errors = errors.filter((e) => e.safe_message?.toLowerCase().includes(term) || e.endpoint?.toLowerCase().includes(term));
    }
    return errors.length;
  },

  async resolveSystemError(errorId, resolvedBy) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        "UPDATE system_errors SET resolved = true, resolved_at = $1, resolved_by = $2 WHERE id = $3 RETURNING *",
        [now, resolvedBy, errorId]
      );
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    const err = (data.system_errors || []).find((e) => e.id === errorId);
    if (err) {
      err.resolved = true;
      err.resolved_at = now;
      err.resolved_by = resolvedBy;
      saveFallbackData(data);
      return err;
    }
    return null;
  },

  // -------------------------------------------------------------
  // Instagram Media Library Repository
  // -------------------------------------------------------------
  async saveInstagramMedia(arg1, arg2, arg3, arg4) {
    let mediaItems = [];
    let organizationId = null;
    let instagramAccountId = null;
    let platform = "instagram";

    if (arg1 && typeof arg1 === "object" && !Array.isArray(arg1) && arg1.organizationId) {
      organizationId = arg1.organizationId;
      instagramAccountId = arg1.instagramAccountId;
      mediaItems = arg1.mediaItems || [];
      platform = arg1.platform || "instagram";
    } else {
      mediaItems = Array.isArray(arg1) ? arg1 : (Array.isArray(arg3) ? arg3 : []);
      organizationId = Array.isArray(arg1) ? arg2 : arg1;
      instagramAccountId = Array.isArray(arg1) ? arg3 : arg2;
      platform = arg4 || "instagram";
    }

    if (!Array.isArray(mediaItems) || mediaItems.length === 0) return [];
    const pool = getPool();
    const now = new Date().toISOString();
    const effectivePlatform = platform || "instagram";

    if (pool) {
      const saved = [];
      for (const item of mediaItems) {
        const id = `med_${item.id || item.media_id}`;
        const itemPlatform = item.platform || effectivePlatform;
        const res = await pool.query(
          `INSERT INTO instagram_media
           (id, organization_id, instagram_account_id, media_id, media_type, caption, thumbnail_url, media_url, permalink, published_at, last_synced_at, platform, account_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (instagram_account_id, media_id)
           DO UPDATE SET
             caption = EXCLUDED.caption,
             thumbnail_url = EXCLUDED.thumbnail_url,
             media_url = EXCLUDED.media_url,
             permalink = EXCLUDED.permalink,
             last_synced_at = EXCLUDED.last_synced_at,
             platform = EXCLUDED.platform,
             account_id = EXCLUDED.account_id
           RETURNING *`,
          [
            id,
            organizationId,
            instagramAccountId,
            item.id || item.media_id,
            item.mediaType || item.media_type || "IMAGE",
            item.caption || null,
            item.thumbnailUrl || item.thumbnail_url || item.mediaUrl || item.media_url || null,
            item.mediaUrl || item.media_url || null,
            item.permalink || null,
            item.publishedAt || item.timestamp || now,
            now,
            itemPlatform,
            instagramAccountId,
          ]
        );
        saved.push(res.rows[0]);
      }
      return saved;
    }

    const data = getFallbackData();
    if (!data.instagram_media) data.instagram_media = [];

    const saved = [];
    for (const item of mediaItems) {
      const mediaId = String(item.id || item.media_id);
      const existingIdx = data.instagram_media.findIndex(
        (m) => m.instagram_account_id === instagramAccountId && m.media_id === mediaId
      );

      const record = {
        id: `med_${mediaId}`,
        organization_id: organizationId,
        instagram_account_id: instagramAccountId,
        account_id: instagramAccountId,
        platform: item.platform || effectivePlatform,
        media_id: mediaId,
        media_type: item.mediaType || item.media_type || "IMAGE",
        caption: item.caption || null,
        thumbnail_url: item.thumbnailUrl || item.thumbnail_url || item.mediaUrl || item.media_url || null,
        media_url: item.mediaUrl || item.media_url || null,
        permalink: item.permalink || null,
        published_at: item.publishedAt || item.timestamp || now,
        like_count: item.likeCount || item.like_count || 0,
        comments_count: item.commentsCount || item.comments_count || 0,
        last_synced_at: now,
      };

      if (existingIdx !== -1) {
        data.instagram_media[existingIdx] = { ...data.instagram_media[existingIdx], ...record };
        saved.push(data.instagram_media[existingIdx]);
      } else {
        data.instagram_media.push(record);
        saved.push(record);
      }
    }

    saveFallbackData(data);
    return saved;
  },

  async listInstagramMedia(arg1, arg2, arg3) {
    let instagramAccountId = arg1;
    let options = typeof arg2 === "object" && arg2 !== null ? arg2 : {};
    if (typeof arg2 === "string") {
      instagramAccountId = arg2;
      options = typeof arg3 === "object" && arg3 !== null ? arg3 : {};
    }
    const limit = options.limit || 24;
    const offset = options.offset || 0;
    const platform = options.platform || "";

    const pool = getPool();
    if (pool) {
      let query = `SELECT * FROM instagram_media
         WHERE (instagram_account_id = $1 OR organization_id = $1)`;
      const params = [instagramAccountId];
      if (platform && platform !== "all") {
        params.push(platform);
        query += ` AND platform = $${params.length}`;
      }
      params.push(limit, offset);
      query += ` ORDER BY published_at DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const res = await pool.query(query, params);
      return res.rows;
    }
    const data = getFallbackData();
    let media = (data.instagram_media || []).filter(
      (m) =>
        m.instagram_account_id === instagramAccountId ||
        m.account_id === instagramAccountId ||
        m.organization_id === arg1 ||
        m.organization_id === instagramAccountId
    );
    if (platform && platform !== "all") {
      media = media.filter((m) => (m.platform || "instagram") === platform);
    }
    media.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
    return media.slice(offset, offset + limit);
  },

  // -------------------------------------------------------------
  // Automations
  // -------------------------------------------------------------
  async createAutomation({
    id,
    userId = null,
    organizationId,
    instagramAccountId = null,
    accountId = null,
    platform = "instagram",
    name,
    triggerType = "comment",
    postId = null,
    postCaption = null,
    postThumbnailUrl = null,
    postPermalink = null,
    triggerKeyword = null,
    triggerKeywords = null,
    keywordMatchType = "contains",
    publicReplyEnabled = true,
    publicReplyText = null,
    dmEnabled = true,
    dmMessageText = null,
    status = "active",
  }) {
    const autoId = id || (typeof crypto !== "undefined" && crypto.randomUUID ? `auto_${crypto.randomUUID()}` : `auto_${Date.now()}`);
    const now = new Date().toISOString();
    const formattedKeywords = Array.isArray(triggerKeywords)
      ? triggerKeywords.join(",")
      : (triggerKeywords || triggerKeyword || null);
    const effectiveAccountId = accountId || instagramAccountId;
    const effectivePlatform = platform || "instagram";

    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        `INSERT INTO automations
         (id, user_id, organization_id, instagram_account_id, account_id, platform, name, trigger_type, post_id, post_caption, post_thumbnail_url, post_permalink, trigger_keyword, trigger_keywords, keyword_match_type, public_reply_enabled, public_reply_text, dm_enabled, dm_message_text, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
         RETURNING *`,
        [
          autoId,
          userId,
          organizationId,
          effectiveAccountId,
          effectiveAccountId,
          effectivePlatform,
          name,
          triggerType,
          postId,
          postCaption,
          postThumbnailUrl,
          postPermalink,
          triggerKeyword || formattedKeywords,
          formattedKeywords,
          keywordMatchType,
          publicReplyEnabled,
          publicReplyText,
          dmEnabled,
          dmMessageText,
          status,
          now,
          now,
        ]
      );
      return res.rows[0];
    }
    const data = getFallbackData();
    if (!data.automations) data.automations = [];
    const automation = {
      id: autoId,
      user_id: userId,
      organization_id: organizationId,
      instagram_account_id: effectiveAccountId,
      account_id: effectiveAccountId,
      platform: effectivePlatform,
      name,
      trigger_type: triggerType,
      post_id: postId,
      post_caption: postCaption,
      post_thumbnail_url: postThumbnailUrl,
      post_permalink: postPermalink,
      trigger_keyword: triggerKeyword || formattedKeywords,
      trigger_keywords: formattedKeywords,
      keyword_match_type: keywordMatchType,
      public_reply_enabled: publicReplyEnabled,
      public_reply_text: publicReplyText,
      dm_enabled: dmEnabled,
      dm_message_text: dmMessageText,
      execution_count: 0,
      last_executed_at: null,
      status,
      created_at: now,
      updated_at: now,
    };
    data.automations.push(automation);
    saveFallbackData(data);
    return automation;
  },

  async listAutomations(organizationId, { platform = "" } = {}) {
    const pool = getPool();
    if (pool) {
      let query = "SELECT * FROM automations WHERE organization_id = $1";
      const params = [organizationId];
      if (platform && platform !== "all") {
        params.push(platform);
        query += ` AND (platform = $${params.length} OR platform = 'all')`;
      }
      query += " ORDER BY created_at DESC";
      const res = await pool.query(query, params);
      return res.rows;
    }
    const data = getFallbackData();
    let automations = (data.automations || []).filter((a) => a.organization_id === organizationId);
    if (platform && platform !== "all") {
      automations = automations.filter((a) => !a.platform || a.platform === "all" || a.platform === platform);
    }
    return automations;
  },

  async listAllAutomations({ status = "" } = {}) {
    const pool = getPool();
    if (pool) {
      let query = "SELECT * FROM automations";
      const params = [];
      if (status) {
        params.push(status);
        query += " WHERE status = $1";
      }
      query += " ORDER BY created_at DESC";
      const res = await pool.query(query, params);
      return res.rows;
    }
    const data = getFallbackData();
    let automations = data.automations || [];
    if (status) {
      automations = automations.filter((a) => a.status === status);
    }
    return automations;
  },

  async findAutomationById(id) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query("SELECT * FROM automations WHERE id = $1 LIMIT 1", [id]);
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    const automations = data.automations || [];
    return automations.find((a) => a.id === id) || null;
  },

  async getAutomation(id, organizationId = null) {
    const automation = await this.findAutomationById(id);
    if (!automation) return null;
    if (organizationId && automation.organization_id !== organizationId) {
      return null;
    }
    return automation;
  },

  async updateAutomation(id, updates = {}) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return this.findAutomationById(id);
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
      setClauses.push(`updated_at = $${keys.length + 1}`);
      const values = [...Object.values(updates), now, id];
      const res = await pool.query(
        `UPDATE automations SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
        values
      );
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    if (!data.automations) data.automations = [];
    const idx = data.automations.findIndex((a) => a.id === id);
    if (idx !== -1) {
      data.automations[idx] = {
        ...data.automations[idx],
        ...updates,
        updated_at: now,
      };
      saveFallbackData(data);
      return data.automations[idx];
    }
    return null;
  },

  async deleteAutomation(id) {
    const pool = getPool();
    if (pool) {
      await pool.query("DELETE FROM automations WHERE id = $1", [id]);
      return true;
    }
    const data = getFallbackData();
    if (!data.automations) return true;
    const initialLen = data.automations.length;
    data.automations = data.automations.filter((a) => a.id !== id);
    if (data.automations.length !== initialLen) {
      saveFallbackData(data);
    }
    return true;
  },

  // -------------------------------------------------------------
  // Automation Executions & Idempotency Repository
  // -------------------------------------------------------------
  async recordAutomationExecution({
    id,
    automationId,
    organizationId,
    platform = "instagram",
    accountId = null,
    instagramAccountId = null,
    commentId,
    postId = null,
    commenterId = null,
    commenterUsername = null,
    commentText = null,
    matchedKeyword = null,
    publicReplyStatus = "skipped",
    publicReplyId = null,
    dmStatus = "skipped",
    dmId = null,
    status = "success",
    errorMessage = null,
  }) {
    const execId = id || `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();
    const effectiveAccountId = accountId || instagramAccountId;
    const effectivePlatform = platform || "instagram";

    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query(
          `INSERT INTO automation_executions
           (id, automation_id, organization_id, instagram_account_id, account_id, platform, comment_id, post_id, commenter_id, commenter_username, comment_text, matched_keyword, public_reply_status, public_reply_id, dm_status, dm_id, status, error_message, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           ON CONFLICT (automation_id, comment_id) DO NOTHING
           RETURNING *`,
          [
            execId,
            automationId,
            organizationId,
            effectiveAccountId,
            effectiveAccountId,
            effectivePlatform,
            commentId,
            postId,
            commenterId,
            commenterUsername,
            commentText,
            matchedKeyword,
            publicReplyStatus,
            publicReplyId,
            dmStatus,
            dmId,
            status,
            errorMessage,
            now,
          ]
        );
        return res.rows[0] || null;
      } catch (err) {
        if (err.code === "23505") return null; // Duplicate execution prevented
        throw err;
      }
    }

    const data = getFallbackData();
    if (!data.automation_executions) data.automation_executions = [];

    // Idempotency check: same automation_id and comment_id
    const exists = data.automation_executions.some(
      (e) => e.automation_id === automationId && e.comment_id === commentId
    );
    if (exists) return null;

    const record = {
      id: execId,
      automation_id: automationId,
      organization_id: organizationId,
      instagram_account_id: effectiveAccountId,
      account_id: effectiveAccountId,
      platform: effectivePlatform,
      comment_id: commentId,
      post_id: postId,
      commenter_id: commenterId,
      commenter_username: commenterUsername,
      comment_text: commentText,
      matched_keyword: matchedKeyword,
      public_reply_status: publicReplyStatus,
      public_reply_id: publicReplyId,
      dm_status: dmStatus,
      dm_id: dmId,
      status,
      error_message: errorMessage,
      created_at: now,
    };

    data.automation_executions.push(record);
    saveFallbackData(data);
    return record;
  },

  async findAutomationExecution(automationId, commentId) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        "SELECT * FROM automation_executions WHERE automation_id = $1 AND comment_id = $2 LIMIT 1",
        [automationId, commentId]
      );
      return res.rows[0] || null;
    }
    const data = getFallbackData();
    const executions = data.automation_executions || [];
    return executions.find(
      (e) => e.automation_id === automationId && e.comment_id === commentId
    ) || null;
  },

  async listAutomationExecutions(automationId, { limit = 50 } = {}) {
    const pool = getPool();
    if (pool) {
      const res = await pool.query(
        "SELECT * FROM automation_executions WHERE automation_id = $1 ORDER BY created_at DESC LIMIT $2",
        [automationId, limit]
      );
      return res.rows;
    }
    const data = getFallbackData();
    const executions = (data.automation_executions || []).filter(
      (e) => e.automation_id === automationId
    );
    executions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return executions.slice(0, limit);
  },

  async incrementAutomationExecution(automationId) {
    const now = new Date().toISOString();
    const pool = getPool();
    if (pool) {
      await pool.query(
        `UPDATE automations
         SET execution_count = COALESCE(execution_count, 0) + 1,
             last_executed_at = $1
         WHERE id = $2`,
        [now, automationId]
      );
      return;
    }
    const data = getFallbackData();
    if (!data.automations) return;
    const target = data.automations.find((a) => a.id === automationId);
    if (target) {
      target.execution_count = (target.execution_count || 0) + 1;
      target.last_executed_at = now;
      saveFallbackData(data);
    }
  },

  // -------------------------------------------------------------
  // Customer Detail Aggregation Repository
  // -------------------------------------------------------------
  async findCustomerDetails(customerId) {
    const user = await this.findUserById(customerId);
    if (!user) return null;

    const orgs = await this.listUserOrganizations(customerId);
    const orgDetails = await Promise.all(
      orgs.map(async (org) => {
        const members = await this.listOrganizationMembers(org.id);
        const automations = await this.listAutomations(org.id);
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: org.role,
          status: org.status || "active",
          memberCount: members.length,
          members,
          automations,
        };
      })
    );

    const loginHistory = await this.listLoginEvents({ userId: customerId, limit: 10 });
    const errors = await this.listSystemErrors({ customerId, limit: 10 });
    const auditHistory = await this.listAuditLogs({ search: customerId, limit: 10 });

    // Aggregate automations across customer's organizations
    const allAutomations = orgDetails.flatMap((o) => o.automations || []);
    const activeAutomations = allAutomations.filter((a) => a.status === "active");
    const inactiveAutomations = allAutomations.filter((a) => a.status !== "active");

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        auth_provider: user.auth_provider || "email_otp",
        status: user.status,
        email_verified_at: user.email_verified_at,
        is_super_admin: Boolean(user.is_super_admin),
        platform_role: user.platform_role || "customer",
        created_at: user.created_at,
        last_login_at: user.last_login_at || null,
        totalAutomations: allAutomations.length,
        activeAutomations: activeAutomations.length,
        inactiveAutomations: inactiveAutomations.length,
      },
      organizations: orgDetails,
      subscription: {
        planId: "free",
        name: "Free Launch Access",
        status: "active",
        price: "$0 / month",
        accessStatus: "Full Access — No Limitations",
        created_at: user.created_at,
      },
      automations: allAutomations,
      loginHistory,
      errors,
      auditHistory,
    };
  },

  // -------------------------------------------------------------
  // Super Admin Platform Metrics Repository
  // -------------------------------------------------------------
  async getPlatformMetrics() {
    const pool = getPool();
    if (pool) {
      const query = `
        SELECT
          (SELECT COUNT(*) FROM users WHERE is_super_admin = false)::int as total_customers,
          (SELECT COUNT(*) FROM users WHERE is_super_admin = false AND (auth_provider = 'email_otp' OR auth_provider = 'email' OR auth_provider IS NULL))::int as customers_via_email_otp,
          (SELECT COUNT(*) FROM users WHERE is_super_admin = false AND auth_provider = 'google')::int as customers_via_google,
          (SELECT COUNT(*) FROM users WHERE is_super_admin = false AND email_verified_at IS NOT NULL)::int as customers_verified,
          (SELECT COUNT(*) FROM users WHERE is_super_admin = false AND status = 'active')::int as active_customers,
          (SELECT COUNT(*) FROM users WHERE is_super_admin = false AND status = 'suspended')::int as suspended_customers,
          (SELECT COUNT(*) FROM users WHERE is_super_admin = true)::int as super_admins_count,
          (SELECT COUNT(*) FROM organizations)::int as total_organizations,
          (SELECT COUNT(DISTINCT organization_id) FROM instagram_accounts WHERE status = 'connected' AND (platform = 'instagram' OR platform IS NULL))::int as customers_with_instagram,
          (SELECT COUNT(DISTINCT organization_id) FROM instagram_accounts WHERE status = 'connected' AND platform = 'facebook')::int as customers_with_facebook,
          (SELECT COUNT(*) FROM instagram_accounts WHERE status = 'connected' AND (platform = 'instagram' OR platform IS NULL))::int as connected_instagram_accounts,
          (SELECT COUNT(*) FROM instagram_accounts WHERE status = 'connected' AND platform = 'facebook')::int as connected_facebook_pages,
          (SELECT COUNT(*) FROM instagram_accounts WHERE status = 'connected')::int as connected_accounts,
          (SELECT COUNT(*) FROM instagram_accounts WHERE status = 'disconnected')::int as disconnected_accounts,
          (SELECT COUNT(*) FROM automations WHERE status = 'active')::int as active_automations,
          (SELECT COUNT(*) FROM automations WHERE (platform = 'instagram' OR platform IS NULL))::int as instagram_automations,
          (SELECT COUNT(*) FROM automations WHERE platform = 'facebook')::int as facebook_automations,
          (SELECT COUNT(*) FROM automations)::int as total_automations,
          (SELECT COUNT(*) FROM captured_leads WHERE (platform = 'instagram' OR platform IS NULL))::int as instagram_leads,
          (SELECT COUNT(*) FROM captured_leads WHERE platform = 'facebook')::int as facebook_leads,
          (SELECT COUNT(*) FROM captured_leads)::int as total_captured_leads,
          (SELECT COUNT(*) FROM conversations)::int as total_conversations,
          (SELECT COUNT(*) FROM comments)::int as total_comments,
          (SELECT COUNT(*) FROM login_events WHERE status = 'success')::int as successful_logins,
          (SELECT COUNT(*) FROM login_events WHERE status = 'failure')::int as failed_logins,
          (SELECT COUNT(*) FROM system_errors WHERE resolved = false)::int as system_errors,
          (SELECT COUNT(*) FROM system_audit_logs)::int as total_audit_logs
      `;
      const res = await pool.query(query);
      const row = res.rows[0];

      const recentUsersRes = await pool.query(
        "SELECT id, name, email, status, auth_provider, email_verified_at, created_at FROM users WHERE is_super_admin = false ORDER BY created_at DESC LIMIT 5"
      );

      const recentConnectionsRes = await pool.query(
        "SELECT id, username, organization_id, status, platform, connected_at FROM instagram_accounts ORDER BY connected_at DESC LIMIT 5"
      );

      return {
        totalCustomers: row.total_customers,
        totalUsers: row.total_customers,
        customersViaEmailOtp: row.customers_via_email_otp,
        customersViaGoogle: row.customers_via_google,
        customersWithVerifiedEmail: row.customers_verified,
        customersWithConnectedInstagram: row.customers_with_instagram,
        customersWithConnectedFacebook: row.customers_with_facebook,
        freeSubscriptions: row.total_customers,
        activeCustomers: row.active_customers,
        activeUsers: row.active_customers,
        suspendedCustomers: row.suspended_customers,
        superAdminsCount: row.super_admins_count,
        totalOrganizations: row.total_organizations,
        connectedAccounts: row.connected_accounts,
        connectedInstagramAccounts: row.connected_instagram_accounts,
        connectedFacebookPages: row.connected_facebook_pages,
        disconnectedAccounts: row.disconnected_accounts,
        totalActiveAutomations: row.active_automations,
        instagramAutomations: row.instagram_automations,
        facebookAutomations: row.facebook_automations,
        totalCreatedAutomations: row.total_automations,
        instagramLeads: row.instagram_leads,
        facebookLeads: row.facebook_leads,
        totalCapturedLeads: row.total_captured_leads,
        totalConversations: row.total_conversations,
        totalComments: row.total_comments,
        successfulLogins: row.successful_logins,
        failedLogins: row.failed_logins,
        systemErrors: row.system_errors,
        totalAuditLogs: row.total_audit_logs,
        recentUsers: recentUsersRes.rows,
        recentConnections: recentConnectionsRes.rows,
      };
    }

    const data = getFallbackData();
    const users = data.users || [];
    const orgs = data.organizations || [];
    const accounts = data.instagram_accounts || [];
    const automations = data.automations || [];
    const leads = data.captured_leads || [];
    const convs = data.conversations || [];
    const comms = data.comments || [];
    const logins = data.login_events || [];
    const sysErrors = data.system_errors || [];

    // Also check local encrypted accounts file if fallback database doesn't have accounts populated
    let liveAccounts = [...accounts];
    try {
      const encryptedPath = path.join(DATA_DIR, "encrypted_accounts.json");
      if (fs.existsSync(encryptedPath)) {
        const rawEncrypted = JSON.parse(fs.readFileSync(encryptedPath, "utf8"));
        if (Array.isArray(rawEncrypted) && rawEncrypted.length > 0) {
          liveAccounts = rawEncrypted;
        }
      }
    } catch {
      // fallback
    }

    const customerUsers = users.filter((u) => !u.is_super_admin);
    const totalCustomers = customerUsers.length;
    const activeCustomers = customerUsers.filter((u) => u.status === "active").length;
    const suspendedCustomers = customerUsers.filter((u) => u.status === "suspended").length;
    const superAdminsCount = users.filter((u) => u.is_super_admin).length;

    const customersViaEmailOtp = customerUsers.filter(
      (u) => !u.auth_provider || u.auth_provider === "email_otp" || u.auth_provider === "email"
    ).length;
    const customersViaGoogle = customerUsers.filter((u) => u.auth_provider === "google").length;
    const customersWithVerifiedEmail = customerUsers.filter((u) => Boolean(u.email_verified_at)).length;

    const connectedAccs = liveAccounts.filter((a) => a.status === "connected");
    const connectedIgAccs = connectedAccs.filter((a) => (a.platform || "instagram") === "instagram");
    const connectedFbPages = connectedAccs.filter((a) => a.platform === "facebook");

    const connectedIgOrgIds = new Set(connectedIgAccs.map((a) => a.organizationId || a.organization_id));
    const connectedFbOrgIds = new Set(connectedFbPages.map((a) => a.organizationId || a.organization_id));
    
    // Find customer users whose organizations have connected accounts
    const members = data.organization_members || [];
    const usersWithIg = new Set();
    const usersWithFb = new Set();
    members.forEach((m) => {
      const orgId = m.organization_id || m.organizationId;
      const uId = m.user_id || m.userId;
      if (connectedIgOrgIds.has(orgId)) {
        usersWithIg.add(uId);
      }
      if (connectedFbOrgIds.has(orgId)) {
        usersWithFb.add(uId);
      }
    });
    const customersWithConnectedInstagram = usersWithIg.size;
    const customersWithConnectedFacebook = usersWithFb.size;

    const recentUsers = customerUsers
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        auth_provider: u.auth_provider || "email_otp",
        email_verified: Boolean(u.email_verified_at),
        status: u.status,
        created_at: u.created_at,
      }));

    const recentConnections = connectedAccs
      .slice()
      .sort((a, b) => new Date(b.connectedAt || b.connected_at || 0) - new Date(a.connectedAt || a.connected_at || 0))
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        username: a.username,
        platform: a.platform || "instagram",
        organizationId: a.organizationId || a.organization_id,
        status: a.status,
        connected_at: a.connectedAt || a.connected_at,
      }));

    const instagramAutomations = automations.filter((a) => (a.platform || "instagram") === "instagram").length;
    const facebookAutomations = automations.filter((a) => a.platform === "facebook").length;
    const instagramLeads = leads.filter((l) => (l.platform || "instagram") === "instagram").length;
    const facebookLeads = leads.filter((l) => l.platform === "facebook").length;

    return {
      totalCustomers: totalCustomers || users.length,
      totalUsers: users.length,
      customersViaEmailOtp,
      customersViaGoogle,
      customersWithVerifiedEmail,
      customersWithConnectedInstagram,
      customersWithConnectedFacebook,
      freeSubscriptions: totalCustomers || users.length,
      activeCustomers,
      activeUsers: activeCustomers,
      suspendedCustomers,
      superAdminsCount,
      totalOrganizations: orgs.length,
      connectedAccounts: connectedAccs.length,
      connectedInstagramAccounts: connectedIgAccs.length,
      connectedFacebookPages: connectedFbPages.length,
      disconnectedAccounts: liveAccounts.filter((a) => a.status === "disconnected").length,
      totalActiveAutomations: automations.filter((a) => a.status === "active").length,
      instagramAutomations,
      facebookAutomations,
      totalCreatedAutomations: automations.length,
      instagramLeads,
      facebookLeads,
      totalCapturedLeads: leads.length,
      totalConversations: convs.length,
      totalComments: comms.length,
      successfulLogins: logins.filter((l) => l.status === "success").length,
      failedLogins: logins.filter((l) => l.status === "failure").length,
      systemErrors: sysErrors.filter((e) => !e.resolved).length,
      totalAuditLogs: (data.system_audit_logs || []).length,
      recentUsers,
      recentConnections,
    };
  },
};

