import fs from "fs";
import path from "path";
import crypto from "crypto";
import { validateAndNormalizePhone } from "../validations/phone.js";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "data")
  : path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(DATA_DIR, "qualified_leads.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readAllRawLeads() {
  ensureDataDir();
  if (!fs.existsSync(STORAGE_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(STORAGE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[LeadStore] Error reading storage file:", err.message);
    return [];
  }
}

function writeAllRawLeads(leads) {
  ensureDataDir();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(leads, null, 2), "utf8");
}

export const LEAD_STATUSES = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  CONVERTED: "converted",
  NOT_INTERESTED: "not_interested",
};

/**
 * Multi-tenant Qualified Lead Store.
 *
 * Enforces organization-level isolation and strict phone-number qualification rules.
 */
export const leadStore = {
  /**
   * Evaluates and records a qualified lead.
   * ONLY succeeds if a valid international mobile number is submitted.
   */
  async createOrUpdateLead(leadData) {
    const {
      organizationId,
      instagramAccountId,
      instagramUsername,
      name,
      phoneNumber,
      sourceAutomationId,
      sourceAutomationName,
      sourcePostId,
      sourcePostCaption,
      conversationId,
    } = leadData;

    if (!organizationId) {
      throw new Error("[LeadStore] organizationId is required");
    }

    // 1. Strict Phone Number Validation
    const validation = validateAndNormalizePhone(phoneNumber);
    if (!validation.isValid) {
      throw new Error(`[LeadStore] Lead rejected: ${validation.error}`);
    }

    const normalizedPhone = validation.normalized;
    const countryCode = validation.countryCode;

    const allLeads = readAllRawLeads();

    // 2. Deduplication check: same organization, same Instagram account, same normalized mobile number
    const existingIndex = allLeads.findIndex(
      (l) =>
        l.organizationId === organizationId &&
        l.instagramAccountId === (instagramAccountId || "") &&
        l.phoneNumber === normalizedPhone
    );

    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      const existing = allLeads[existingIndex];
      // Update existing record idempotently
      const updatedLead = {
        ...existing,
        name: name || existing.name,
        instagramUsername: instagramUsername || existing.instagramUsername,
        sourceAutomationId: sourceAutomationId || existing.sourceAutomationId,
        sourceAutomationName: sourceAutomationName || existing.sourceAutomationName,
        sourcePostId: sourcePostId || existing.sourcePostId,
        sourcePostCaption: sourcePostCaption || existing.sourcePostCaption,
        conversationId: conversationId || existing.conversationId,
        updatedAt: now,
      };

      allLeads[existingIndex] = updatedLead;
      writeAllRawLeads(allLeads);

      console.log(
        JSON.stringify({
          level: "info",
          service: "LeadStore",
          action: "duplicate_lead_updated_idempotently",
          organizationId,
          leadId: existing.id,
          phoneMasked: `${normalizedPhone.slice(0, 4)}***${normalizedPhone.slice(-2)}`,
        })
      );

      return { lead: updatedLead, isNew: false };
    }

    // 3. Create fresh qualified lead
    const newLead = {
      id: `lead_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      organizationId,
      instagramAccountId: instagramAccountId || "",
      instagramUsername: instagramUsername ? (instagramUsername.startsWith("@") ? instagramUsername : `@${instagramUsername}`) : "",
      name: name || (instagramUsername ? instagramUsername.replace(/^@/, "") : "Instagram Lead"),
      phoneNumber: normalizedPhone,
      countryCode,
      sourceAutomationId: sourceAutomationId || "",
      sourceAutomationName: sourceAutomationName || "Direct Comment Trigger",
      sourcePostId: sourcePostId || "",
      sourcePostCaption: sourcePostCaption || "",
      conversationId: conversationId || "",
      status: LEAD_STATUSES.NEW,
      notes: [],
      exportedToExcel: false,
      exportedAt: null,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    allLeads.push(newLead);
    writeAllRawLeads(allLeads);

    console.log(
      JSON.stringify({
        level: "info",
        service: "LeadStore",
        action: "qualified_lead_created",
        organizationId,
        leadId: newLead.id,
        phoneMasked: `${normalizedPhone.slice(0, 4)}***${normalizedPhone.slice(-2)}`,
        countryCode,
      })
    );

    return { lead: newLead, isNew: true };
  },

  /**
   * Retrieves paginated, filtered qualified leads for an organization.
   */
  async listLeads(organizationId, options = {}) {
    if (!organizationId) {
      throw new Error("[LeadStore] organizationId is required");
    }

    const {
      search = "",
      status = "",
      automationId = "",
      accountId = "",
      startDate = "",
      endDate = "",
      sort = "newest",
      page = 1,
      limit = 25,
    } = options;

    const allLeads = readAllRawLeads();
    let orgLeads = allLeads.filter((l) => l.organizationId === organizationId);

    // Apply Search (phone, username, name)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      orgLeads = orgLeads.filter(
        (l) =>
          l.phoneNumber.toLowerCase().includes(q) ||
          l.instagramUsername.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q) ||
          l.sourcePostId.toLowerCase().includes(q)
      );
    }

    // Apply Status filter
    if (status && status !== "all") {
      orgLeads = orgLeads.filter((l) => l.status === status);
    }

    // Apply Automation filter
    if (automationId && automationId !== "all") {
      orgLeads = orgLeads.filter((l) => l.sourceAutomationId === automationId);
    }

    // Apply Account filter
    if (accountId && accountId !== "all") {
      orgLeads = orgLeads.filter((l) => l.instagramAccountId === accountId);
    }

    // Apply Date Range
    if (startDate) {
      const start = new Date(startDate).getTime();
      orgLeads = orgLeads.filter((l) => new Date(l.submittedAt).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      orgLeads = orgLeads.filter((l) => new Date(l.submittedAt).getTime() <= end);
    }

    // Sorting
    orgLeads.sort((a, b) => {
      const timeA = new Date(a.submittedAt).getTime();
      const timeB = new Date(b.submittedAt).getTime();
      return sort === "oldest" ? timeA - timeB : timeB - timeA;
    });

    const total = orgLeads.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 25);
    const totalPages = Math.ceil(total / limitNum) || 1;

    const startIndex = (pageNum - 1) * limitNum;
    const paginated = orgLeads.slice(startIndex, startIndex + limitNum);

    return {
      leads: paginated,
      total,
      page: pageNum,
      totalPages,
      limit: limitNum,
    };
  },

  /**
   * Retrieves a single lead strictly within the organization scope.
   */
  async getLead(organizationId, leadId) {
    if (!organizationId || !leadId) return null;
    const allLeads = readAllRawLeads();
    return (
      allLeads.find(
        (l) => l.organizationId === organizationId && l.id === leadId
      ) || null
    );
  },

  /**
   * Updates lead sales status.
   */
  async updateLeadStatus(organizationId, leadId, newStatus) {
    if (!Object.values(LEAD_STATUSES).includes(newStatus)) {
      throw new Error(`[LeadStore] Invalid status: ${newStatus}`);
    }

    const allLeads = readAllRawLeads();
    const index = allLeads.findIndex(
      (l) => l.organizationId === organizationId && l.id === leadId
    );

    if (index === -1) {
      throw new Error("[LeadStore] Lead not found");
    }

    allLeads[index].status = newStatus;
    allLeads[index].updatedAt = new Date().toISOString();
    writeAllRawLeads(allLeads);

    return allLeads[index];
  },

  /**
   * Adds an internal note to a lead.
   */
  async addLeadNote(organizationId, leadId, { text, authorName = "Team Member" }) {
    if (!text || !text.trim()) {
      throw new Error("[LeadStore] Note text cannot be empty");
    }

    const allLeads = readAllRawLeads();
    const index = allLeads.findIndex(
      (l) => l.organizationId === organizationId && l.id === leadId
    );

    if (index === -1) {
      throw new Error("[LeadStore] Lead not found");
    }

    const note = {
      id: `note_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      text: text.trim(),
      authorName,
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(allLeads[index].notes)) {
      allLeads[index].notes = [];
    }

    allLeads[index].notes.push(note);
    allLeads[index].updatedAt = new Date().toISOString();
    writeAllRawLeads(allLeads);

    return note;
  },

  /**
   * Deletes a lead within the organization.
   */
  async deleteLead(organizationId, leadId) {
    const allLeads = readAllRawLeads();
    const index = allLeads.findIndex(
      (l) => l.organizationId === organizationId && l.id === leadId
    );

    if (index === -1) {
      throw new Error("[LeadStore] Lead not found or unauthorized");
    }

    allLeads.splice(index, 1);
    writeAllRawLeads(allLeads);
    return { success: true };
  },

  /**
   * Marks a set of leads as exported.
   */
  async markLeadsExported(organizationId, leadIds, destination = "Excel") {
    if (!Array.isArray(leadIds) || leadIds.length === 0) return 0;
    const allLeads = readAllRawLeads();
    const now = new Date().toISOString();
    let count = 0;

    for (const lead of allLeads) {
      if (lead.organizationId === organizationId && leadIds.includes(lead.id)) {
        lead.exportedToExcel = true;
        lead.exportedAt = now;
        lead.exportDestination = destination;
        count++;
      }
    }

    if (count > 0) {
      writeAllRawLeads(allLeads);
    }
    return count;
  },

  /**
   * Aggregates lead analytics for an organization.
   */
  async getLeadStats(organizationId) {
    if (!organizationId) {
      return { total: 0, new: 0, contacted: 0, qualified: 0, converted: 0, notInterested: 0, exported: 0 };
    }
    const allLeads = readAllRawLeads();
    const orgLeads = allLeads.filter((l) => l.organizationId === organizationId);

    const stats = {
      total: orgLeads.length,
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      notInterested: 0,
      exported: 0,
    };

    for (const l of orgLeads) {
      if (l.status === LEAD_STATUSES.NEW) stats.new++;
      else if (l.status === LEAD_STATUSES.CONTACTED) stats.contacted++;
      else if (l.status === LEAD_STATUSES.QUALIFIED) stats.qualified++;
      else if (l.status === LEAD_STATUSES.CONVERTED) stats.converted++;
      else if (l.status === LEAD_STATUSES.NOT_INTERESTED) stats.notInterested++;

      if (l.exportedToExcel) stats.exported++;
    }

    return stats;
  },
};

