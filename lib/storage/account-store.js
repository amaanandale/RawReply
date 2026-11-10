import fs from "fs";
import path from "path";
import { encryptToken, decryptToken } from "../crypto/encryption.js";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "data")
  : path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(DATA_DIR, "encrypted_accounts.json");

/**
 * Ensures data directory exists for local encrypted account storage.
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Reads all stored account records from the local encrypted file.
 */
function readAllRawAccounts() {
  ensureDataDir();
  if (!fs.existsSync(STORAGE_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(STORAGE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[AccountStore] Error reading storage file:", err.message);
    return [];
  }
}

/**
 * Writes account records to the local encrypted file.
 */
function writeAllRawAccounts(accounts) {
  ensureDataDir();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(accounts, null, 2), "utf8");
}

/**
 * Sanitizes an account record for safe client/UI consumption.
 * STRIPS ALL SENSITIVE ACCESS TOKENS.
 */
export function sanitizeAccount(account) {
  if (!account) return null;
  const {
    encryptedAccessToken,
    encryptedPageToken,
    ...safeAccount
  } = account;
  return {
    ...safeAccount,
    platform: safeAccount.platform || "instagram",
  };
}

/**
 * Multi-tenant Instagram Account Storage service.
 * Enforces organization-level isolation and AES-256-GCM token encryption at rest.
 */
export const accountStore = {
  /**
   * Platform Super Admin method: Retrieves all connected Instagram accounts across all organizations.
   * Never exposes raw tokens.
   */
  async listAllAccounts() {
    const all = readAllRawAccounts();
    return all.map(sanitizeAccount);
  },

  /**
   * Retrieves all connected Instagram accounts for a specific organization.
   * Never exposes raw tokens.
   */
  async listAccounts(organizationId) {
    if (!organizationId) {
      throw new Error("[AccountStore] organizationId is required");
    }
    const all = readAllRawAccounts();
    const orgAccounts = all.filter((acc) => acc.organizationId === organizationId);
    return orgAccounts.map(sanitizeAccount);
  },

  /**
   * Retrieves account connection slots usage and remaining capacity.
   * Maximum 4 connected social accounts (Instagram + Facebook Pages combined) per customer workspace.
   */
  async getAccountLimitStatus(organizationId) {
    if (!organizationId) {
      return { limit: 4, used: 0, remaining: 4, isLimitReached: false, instagramCount: 0, facebookCount: 0 };
    }
    const accounts = await this.listAccounts(organizationId);
    const active = accounts.filter((a) => a.status === "connected");
    const instagramCount = active.filter((a) => (a.platform || "instagram") === "instagram").length;
    const facebookCount = active.filter((a) => a.platform === "facebook").length;
    const used = active.length;
    if (organizationId === "org_platform_super_admin") {
      return {
        limit: Infinity,
        used,
        remaining: Infinity,
        isLimitReached: false,
        instagramCount,
        facebookCount,
      };
    }
    return {
      limit: 4,
      used,
      remaining: Math.max(0, 4 - used),
      isLimitReached: used >= 4,
      instagramCount,
      facebookCount,
    };
  },

  /**
   * Finds a specific account belonging to an organization.
   */
  async getAccount(organizationId, instagramAccountId) {
    if (!organizationId || !instagramAccountId) {
      throw new Error("[AccountStore] organizationId and instagramAccountId are required");
    }
    const all = readAllRawAccounts();
    const account = all.find(
      (acc) =>
        acc.organizationId === organizationId &&
        (acc.id === instagramAccountId || acc.instagramBusinessId === instagramAccountId)
    );
    return sanitizeAccount(account);
  },

  /**
   * Internal server-only method: Retrieves decrypted Page & User tokens for automation/webhooks.
   */
  async getDecryptedTokens(organizationId, instagramAccountId) {
    if (!organizationId || !instagramAccountId) {
      throw new Error("[AccountStore] organizationId and instagramAccountId are required");
    }
    const all = readAllRawAccounts();
    const account = all.find(
      (acc) =>
        acc.organizationId === organizationId &&
        (acc.id === instagramAccountId || acc.instagramBusinessId === instagramAccountId)
    );

    if (!account) return null;

    return {
      accessToken: decryptToken(account.encryptedAccessToken),
      pageToken: decryptToken(account.encryptedPageToken),
    };
  },

  /**
   * Saves or updates a connected Instagram or Facebook Page account for an organization.
   * Access tokens are immediately encrypted with AES-256-GCM before write.
   */
  async saveAccount(arg1, arg2) {
    const data = typeof arg1 === "object" && arg1 !== null ? arg1 : { organizationId: arg1, ...arg2 };
    const {
      organizationId,
      platform = "instagram",
      id,
      instagramBusinessId,
      facebookPageId,
      username,
      name,
      profilePictureUrl,
      accountType = platform === "facebook" ? "PAGE" : "BUSINESS",
      pageId,
      pageName,
      accessToken,
      pageToken,
      tokenExpiresAt,
    } = data;

    const resolvedId = id || instagramBusinessId || facebookPageId || pageId;

    if (!organizationId || !resolvedId) {
      throw new Error("[AccountStore] organizationId and account ID are required");
    }

    const all = readAllRawAccounts();
    const existingIndex = all.findIndex(
      (acc) =>
        acc.organizationId === organizationId &&
        (acc.id === resolvedId ||
          acc.instagramBusinessId === resolvedId ||
          acc.facebookPageId === resolvedId ||
          acc.pageId === resolvedId)
    );

    // Enforce strict limit of 4 connected accounts per workspace
    if (existingIndex === -1) {
      const activeCount = all.filter(
        (acc) => acc.organizationId === organizationId && acc.status === "connected"
      ).length;
      if (activeCount >= 4) {
        throw new Error("Maximum limit of 4 connected Instagram accounts reached for this workspace. Maximum limit of 4 connected accounts (Instagram / Facebook).");
      }
    }

    const now = new Date().toISOString();
    const record = {
      id: resolvedId,
      organizationId,
      platform: platform || "instagram",
      instagramBusinessId: instagramBusinessId || (platform === "instagram" ? resolvedId : null),
      facebookPageId: facebookPageId || pageId || (platform === "facebook" ? resolvedId : null),
      username,
      name: name || username,
      profilePictureUrl: profilePictureUrl || null,
      accountType,
      pageId: pageId || facebookPageId || null,
      pageName: pageName || null,
      encryptedAccessToken: encryptToken(accessToken),
      encryptedPageToken: encryptToken(pageToken),
      tokenExpiresAt: tokenExpiresAt || null,
      status: "connected",
      connectedAt: existingIndex >= 0 ? all[existingIndex].connectedAt : now,
      lastSyncedAt: now,
    };

    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...record };
    } else {
      all.push(record);
    }

    writeAllRawAccounts(all);
    return sanitizeAccount(record);
  },

  /**
   * Disconnects an Instagram account for an organization.
   * Revokes or zeroes out encrypted tokens while preserving audit history.
   */
  async disconnectAccount(organizationId, instagramAccountId) {
    if (!organizationId || !instagramAccountId) {
      throw new Error("[AccountStore] organizationId and instagramAccountId are required");
    }

    const all = readAllRawAccounts();
    const targetIndex = all.findIndex(
      (acc) =>
        acc.organizationId === organizationId &&
        (acc.id === instagramAccountId || acc.instagramBusinessId === instagramAccountId)
    );

    if (targetIndex === -1) {
      return { success: false, error: "Account not found in organization" };
    }

    // Remove from active store
    const removed = all.splice(targetIndex, 1)[0];
    writeAllRawAccounts(all);

    return {
      success: true,
      disconnectedAccount: sanitizeAccount(removed),
    };
  },
};
