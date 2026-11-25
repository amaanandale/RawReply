import fs from "fs";
import path from "path";
import crypto from "crypto";
import { validateAndNormalizePhone } from "../validations/phone.js";
import { db } from "../db/client.js";

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
      platform = "instagram",
      accountId,
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

    const effectivePlatform = platform || "instagram";
    const effectiveAccountId = accountId || instagramAccountId || "";

    // 1. Strict Phone Number Validation
    const validation = validateAndNormalizePhone(phoneNumber);
    if (!validation.isValid) {
      throw new Error(`[LeadStore] Lead rejected: ${validation.error}`);
    }

    const normalizedPhone = validation.normalized;
    const countryCode = validation.countryCode;

    const allLeads = readAllRawLeads();

    // 2. Deduplication check: same organization, same account/platform, same normalized mobile number
    const existingIndex = allLeads.findIndex(
      (l) =>
        l.organizationId === organizationId &&
        (l.accountId === effectiveAccountId || l.instagramAccountId === effectiveAccountId) &&
        l.phoneNumber === normalizedPhone
    );

    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      const existing = allLeads[existingIndex];
      // Update existing record idempotently
      const updatedLead = {
        ...existing,
        platform: existing.platform || effectivePlatform,
        accountId: existing.accountId || effectiveAccountId,
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

      if (db.isPostgres()) {
        try {
          await db.query(
            `UPDATE captured_leads
             SET username = COALESCE($1, username),
                 full_name = COALESCE($2, full_name),
                 source_automation_id = COALESCE($3, source_automation_id),
                 source_automation_name = COALESCE($4, source_automation_name),
                 source_post_id = COALESCE($5, source_post_id),
                 source_post_caption = COALESCE($6, source_post_caption),
                 conversation_id = COALESCE($7, conversation_id),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 AND organization_id = $9`,
            [
              updatedLead.instagramUsername,
              updatedLead.name,
              sourceAutomationId || null,
              sourceAutomationName || null,
              sourcePostId || null,
              sourcePostCaption || null,
              conversationId || null,
              existing.id,
              organizationId,
            ]
          );
        } catch (dbErr) {
          console.warn("[LeadStore] DB lead update note:", dbErr.message);
        }
      }

      console.log(
        JSON.stringify({
          level: "info",
          service: "LeadStore",
          action: "duplicate_lead_updated_idempotently",
          organizationId,
          platform: updatedLead.platform,
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
      platform: effectivePlatform,
      accountId: effectiveAccountId,
      instagramAccountId: effectiveAccountId,
      instagramUsername: instagramUsername ? (instagramUsername.startsWith("@") ? instagramUsername : `@${instagramUsername}`) : "",
      name: name || (instagramUsername ? instagramUsername.replace(/^@/, "") : `${effectivePlatform === "facebook" ? "Facebook" : "Instagram"} Lead`),
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

    if (db.isPostgres()) {
      try {
        await db.query(
          `INSERT INTO captured_leads (
            id, organization_id, platform, instagram_account_id, username, full_name,
            phone, country_code, source_automation_id, source_automation_name,
            source_post_id, source_post_caption, conversation_id, status, notes,
            metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (organization_id, phone, source_post_id)
          DO UPDATE SET
            username = EXCLUDED.username,
            full_name = EXCLUDED.full_name,
            source_automation_id = EXCLUDED.source_automation_id,
            source_automation_name = EXCLUDED.source_automation_name,
            source_post_caption = EXCLUDED.source_post_caption,
            conversation_id = EXCLUDED.conversation_id,
            updated_at = EXCLUDED.updated_at`,
          [
            newLead.id,
            organizationId,
            effectivePlatform,
            effectiveAccountId || null,
            newLead.instagramUsername,
            newLead.name,
            normalizedPhone,
            countryCode,
            sourceAutomationId || null,
            sourceAutomationName || null,
            sourcePostId || null,
            sourcePostCaption || null,
            conversationId || null,
            LEAD_STATUSES.NEW,
            JSON.stringify([]),
            JSON.stringify({}),
            now,
            now,
          ]
        );
      } catch (dbErr) {
        console.warn("[LeadStore] DB lead insert note:", dbErr.message);
      }
    }

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
      platform = "",
      startDate = "",
      endDate = "",
      sort = "newest",
      page = 1,
      limit = 25,
    } = options;

    const allLeads = readAllRawLeads();
    let orgLeads = allLeads.filter((l) => l.organizationId === organizationId);

    // Apply Platform filter
    if (platform && platform !== "all") {
      orgLeads = orgLeads.filter((l) => (l.platform || "instagram") === platform);
    }

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

    if (db.isPostgres()) {
      try {
        await db.query(
          `UPDATE captured_leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE organization_id = $2 AND id = $3`,
          [newStatus, organizationId, leadId]
        );
      } catch (dbErr) {
        console.warn("[LeadStore] DB updateLeadStatus note:", dbErr.message);
      }
    }

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

    if (db.isPostgres()) {
      try {
        await db.query(
          `DELETE FROM captured_leads WHERE organization_id = $1 AND id = $2`,
          [organizationId, leadId]
        );
      } catch (dbErr) {
        console.warn("[LeadStore] DB deleteLead note:", dbErr.message);
      }
    }
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

      if (db.isPostgres()) {
        try {
          await db.query(
            `UPDATE captured_leads
             SET exported_to_excel_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE organization_id = $1 AND id = ANY($2::text[])`,
            [organizationId, leadIds]
          );
          const exportLogId = `log_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
          await db.query(
            `INSERT INTO lead_export_logs (id, organization_id, export_destination, lead_count, created_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
            [exportLogId, organizationId, destination.toLowerCase().includes("sheet") ? "google_sheets" : "excel", count]
          );
        } catch (dbErr) {
          console.warn("[LeadStore] DB export log note:", dbErr.message);
        }
      }
    }
    return count;
  },

  /**
   * Aggregates lead analytics for an organization.
   */
  async getLeadStats(organizationId) {
    if (!organizationId) {
      return { total: 0, totalLeads: 0, new: 0, contacted: 0, qualified: 0, converted: 0, notInterested: 0, exported: 0, leadsToday: 0 };
    }

    if (db.isPostgres()) {
      try {
        const res = await db.query(
          `SELECT
             COUNT(*)::int as total,
             COUNT(*) FILTER (WHERE status = 'new')::int as new,
             COUNT(*) FILTER (WHERE status = 'contacted')::int as contacted,
             COUNT(*) FILTER (WHERE status = 'qualified')::int as qualified,
             COUNT(*) FILTER (WHERE status = 'converted')::int as converted,
             COUNT(*) FILTER (WHERE status = 'not_interested')::int as not_interested,
             COUNT(*) FILTER (WHERE exported_to_excel_at IS NOT NULL)::int as exported,
             COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int as leads_today
           FROM captured_leads
           WHERE organization_id = $1`,
          [organizationId]
        );
        if (res.rows[0]) {
          const r = res.rows[0];
          return {
            total: r.total,
            totalLeads: r.total,
            new: r.new,
            contacted: r.contacted,
            qualified: r.qualified,
            converted: r.converted,
            notInterested: r.not_interested,
            exported: r.exported,
            leadsToday: r.leads_today,
          };
        }
      } catch (err) {
        console.warn("[LeadStore] DB getLeadStats note:", err.message);
      }
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

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const leadsToday = orgLeads.filter((l) => new Date(l.submittedAt || l.createdAt || l.created_at).getTime() >= oneDayAgo).length;

    return {
      ...stats,
      totalLeads: stats.total,
      leadsToday,
    };
  },
};

