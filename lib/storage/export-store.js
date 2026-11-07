import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "data")
  : path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(DATA_DIR, "export_history.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAllRawHistory() {
  ensureDataDir();
  if (!fs.existsSync(STORAGE_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(STORAGE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[ExportStore] Error reading history file:", err.message);
    return [];
  }
}

function writeAllRawHistory(items) {
  ensureDataDir();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(items.slice(-500), null, 2), "utf8");
}

export const exportStore = {
  /**
   * Records a lead export event.
   */
  async recordExport(data) {
    const {
      organizationId,
      exportType,
      leadsCount,
      destination,
      status = "success",
      error = null,
      exportedBy = "System",
      leadIds = [],
    } = data;

    if (!organizationId) {
      throw new Error("[ExportStore] organizationId is required");
    }

    const all = readAllRawHistory();
    const record = {
      id: `exp_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      organizationId,
      exportType, // 'xlsx_download' | 'microsoft_excel'
      leadsCount: Number(leadsCount) || 0,
      destination: destination || "Local Spreadsheet",
      status, // 'success' | 'failed'
      error,
      exportedBy,
      leadIds,
      createdAt: new Date().toISOString(),
    };

    all.unshift(record);
    writeAllRawHistory(all);
    return record;
  },

  /**
   * Lists export history for an organization.
   */
  async listHistory(organizationId, limit = 20) {
    if (!organizationId) return [];
    const all = readAllRawHistory();
    return all
      .filter((item) => item.organizationId === organizationId)
      .slice(0, limit);
  },
};

