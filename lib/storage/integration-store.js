import fs from "fs";
import path from "path";
import { encryptToken, decryptToken } from "../crypto/encryption.js";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "data")
  : path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(DATA_DIR, "microsoft_integrations.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAllRawIntegrations() {
  ensureDataDir();
  if (!fs.existsSync(STORAGE_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(STORAGE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[IntegrationStore] Error reading integrations file:", err.message);
    return [];
  }
}

function writeAllRawIntegrations(list) {
  ensureDataDir();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(list, null, 2), "utf8");
}

function sanitizeIntegration(item) {
  if (!item) return null;
  const {
    encryptedAccessToken,
    encryptedRefreshToken,
    ...safe
  } = item;
  return safe;
}

export const integrationStore = {
  /**
   * Retrieves public/safe integration status for an organization.
   * Never exposes access or refresh tokens.
   */
  async getIntegration(organizationId) {
    if (!organizationId) return null;
    const all = readAllRawIntegrations();
    const found = all.find((i) => i.organizationId === organizationId);
    if (!found) {
      return {
        organizationId,
        connected: false,
        accountEmail: null,
        displayName: null,
        selectedWorkbook: null,
        selectedWorksheet: null,
        connectedAt: null,
        lastSyncAt: null,
      };
    }
    return sanitizeIntegration(found);
  },

  /**
   * Internal server-only method to fetch decrypted tokens for Graph API calls.
   */
  async getDecryptedTokens(organizationId) {
    if (!organizationId) return null;
    const all = readAllRawIntegrations();
    const found = all.find((i) => i.organizationId === organizationId);
    if (!found || !found.connected) return null;

    let accessToken = null;
    let refreshToken = null;

    try {
      if (found.encryptedAccessToken) {
        accessToken = decryptToken(found.encryptedAccessToken);
      }
      if (found.encryptedRefreshToken) {
        refreshToken = decryptToken(found.encryptedRefreshToken);
      }
    } catch (err) {
      console.error("[IntegrationStore] Error decrypting Microsoft tokens:", err.message);
      return null;
    }

    return {
      accessToken,
      refreshToken,
      tokenExpiresAt: found.tokenExpiresAt,
      accountEmail: found.accountEmail,
      displayName: found.displayName,
      selectedWorkbook: found.selectedWorkbook,
      selectedWorksheet: found.selectedWorksheet,
    };
  },

  /**
   * Saves or updates Microsoft OAuth connection credentials.
   * Encrypts tokens at rest with AES-256-GCM.
   */
  async saveIntegration(organizationId, data) {
    if (!organizationId) {
      throw new Error("[IntegrationStore] organizationId is required");
    }

    const {
      microsoftUserId,
      accountEmail,
      displayName,
      accessToken,
      refreshToken,
      expiresIn = 3600,
      scopes = [],
    } = data;

    const encryptedAccessToken = accessToken ? encryptToken(accessToken) : null;
    const encryptedRefreshToken = refreshToken ? encryptToken(refreshToken) : null;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const all = readAllRawIntegrations();
    const index = all.findIndex((i) => i.organizationId === organizationId);

    const record = {
      organizationId,
      connected: true,
      microsoftUserId: microsoftUserId || (index !== -1 ? all[index].microsoftUserId : null),
      accountEmail: accountEmail || (index !== -1 ? all[index].accountEmail : null),
      displayName: displayName || (index !== -1 ? all[index].displayName : null),
      encryptedAccessToken: encryptedAccessToken || (index !== -1 ? all[index].encryptedAccessToken : null),
      encryptedRefreshToken: encryptedRefreshToken || (index !== -1 ? all[index].encryptedRefreshToken : null),
      tokenExpiresAt,
      scopes,
      selectedWorkbook: index !== -1 ? all[index].selectedWorkbook : null,
      selectedWorksheet: index !== -1 ? all[index].selectedWorksheet : null,
      connectedAt: index !== -1 && all[index].connectedAt ? all[index].connectedAt : new Date().toISOString(),
      lastSyncAt: index !== -1 ? all[index].lastSyncAt : null,
      updatedAt: new Date().toISOString(),
    };

    if (index !== -1) {
      all[index] = record;
    } else {
      all.push(record);
    }

    writeAllRawIntegrations(all);
    return sanitizeIntegration(record);
  },

  /**
   * Updates workbook and worksheet configuration.
   */
  async updateWorkbookConfig(organizationId, { workbook, worksheet }) {
    const all = readAllRawIntegrations();
    const index = all.findIndex((i) => i.organizationId === organizationId);
    if (index === -1) {
      throw new Error("[IntegrationStore] No active Microsoft connection found");
    }

    if (workbook !== undefined) {
      all[index].selectedWorkbook = workbook;
    }
    if (worksheet !== undefined) {
      all[index].selectedWorksheet = worksheet;
    }

    all[index].updatedAt = new Date().toISOString();
    writeAllRawIntegrations(all);
    return sanitizeIntegration(all[index]);
  },

  /**
   * Records successful sync timestamp.
   */
  async recordSync(organizationId) {
    const all = readAllRawIntegrations();
    const index = all.findIndex((i) => i.organizationId === organizationId);
    if (index !== -1) {
      all[index].lastSyncAt = new Date().toISOString();
      writeAllRawIntegrations(all);
    }
  },

  /**
   * Disconnects Microsoft Excel integration and deletes credentials.
   */
  async disconnect(organizationId) {
    const all = readAllRawIntegrations();
    const index = all.findIndex((i) => i.organizationId === organizationId);
    if (index !== -1) {
      all[index] = {
        organizationId,
        connected: false,
        accountEmail: null,
        displayName: null,
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        tokenExpiresAt: null,
        selectedWorkbook: null,
        selectedWorksheet: null,
        connectedAt: null,
        lastSyncAt: null,
        updatedAt: new Date().toISOString(),
      };
      writeAllRawIntegrations(all);
    }
    return { success: true };
  },
};

