import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { leadStore } from "@/lib/storage/lead-store";
import { exportStore } from "@/lib/storage/export-store";
import { integrationStore } from "@/lib/storage/integration-store";
import { generateLeadsXlsx } from "@/lib/export/xlsx";
import {
  getValidMicrosoftToken,
  appendLeadsToExcelWorkbook,
} from "@/lib/integrations/microsoft";

/**
 * POST /api/leads/export
 * Exports qualified leads either as a downloadable .xlsx file or directly into Microsoft Excel.
 */
export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.organizationId;
  const body = await req.json().catch(() => ({}));
  const {
    type = "download_xlsx", // 'download_xlsx' | 'sync_excel'
    leadIds = [],
    filter = "selected", // 'selected' | 'all' | 'filtered'
    filters = {},
  } = body;

  try {
    // 1. Resolve leads to export
    let targetLeads = [];

    if (filter === "selected" && Array.isArray(leadIds) && leadIds.length > 0) {
      const allLeadsRes = await leadStore.listLeads(organizationId, { limit: 10000 });
      targetLeads = allLeadsRes.leads.filter((l) => leadIds.includes(l.id));
    } else if (filter === "filtered") {
      const filteredRes = await leadStore.listLeads(organizationId, {
        ...filters,
        limit: 10000,
      });
      targetLeads = filteredRes.leads;
    } else {
      // All qualified leads
      const allRes = await leadStore.listLeads(organizationId, { limit: 10000 });
      targetLeads = allRes.leads;
    }

    if (targetLeads.length === 0) {
      return NextResponse.json(
        { error: "No qualified leads match the selected criteria for export." },
        { status: 400 }
      );
    }

    const exportedLeadIds = targetLeads.map((l) => l.id);
    const authorName = session.user.name || session.user.email || "Team Member";

    // 2. Direct .xlsx file generation
    if (type === "download_xlsx") {
      const xlsxBuffer = generateLeadsXlsx(targetLeads);
      const filename = `rawreply-qualified-leads-${new Date().toISOString().split("T")[0]}.xlsx`;

      // Mark leads as exported in store
      await leadStore.markLeadsExported(organizationId, exportedLeadIds, "Excel Spreadsheet Download");

      // Record export history
      await exportStore.recordExport({
        organizationId,
        exportType: "xlsx_download",
        leadsCount: targetLeads.length,
        destination: "Excel Spreadsheet Download (.xlsx)",
        status: "success",
        exportedBy: authorName,
        leadIds: exportedLeadIds,
      });

      return new Response(xlsxBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": xlsxBuffer.length.toString(),
        },
      });
    }

    // 3. Microsoft Excel Graph API Sync
    if (type === "sync_excel") {
      const integration = await integrationStore.getIntegration(organizationId);
      if (!integration || !integration.connected) {
        return NextResponse.json(
          { error: "Microsoft Excel is not connected. Please connect Microsoft Excel in Integrations." },
          { status: 400 }
        );
      }

      if (!integration.selectedWorkbook || !integration.selectedWorkbook.id) {
        return NextResponse.json(
          { error: "No target workbook selected. Please configure a target Excel workbook in Integrations." },
          { status: 400 }
        );
      }

      const workbookId = integration.selectedWorkbook.id;
      const worksheetName = integration.selectedWorksheet?.name || "RawReply Leads";

      // Obtain fresh token (auto-refreshed if needed)
      const accessToken = await getValidMicrosoftToken(organizationId);

      // Append lead rows to Microsoft Excel workbook
      const appendResult = await appendLeadsToExcelWorkbook(
        accessToken,
        workbookId,
        worksheetName,
        targetLeads
      );

      // Mark leads exported
      await leadStore.markLeadsExported(
        organizationId,
        exportedLeadIds,
        `Microsoft Excel (${integration.selectedWorkbook.name} - ${worksheetName})`
      );

      // Update sync timestamp
      await integrationStore.recordSync(organizationId);

      // Record history
      await exportStore.recordExport({
        organizationId,
        exportType: "microsoft_excel",
        leadsCount: appendResult.appendedCount,
        destination: `OneDrive / ${integration.selectedWorkbook.name} [${worksheetName}]`,
        status: "success",
        exportedBy: authorName,
        leadIds: exportedLeadIds,
      });

      return NextResponse.json({
        success: true,
        appendedCount: appendResult.appendedCount,
        targetRange: appendResult.targetRange,
        destination: `${integration.selectedWorkbook.name} (${worksheetName})`,
      });
    }

    return NextResponse.json({ error: `Unknown export type: ${type}` }, { status: 400 });
  } catch (err) {
    console.error("[API /api/leads/export POST] Error:", err.message);

    // Record failed export in audit history
    await exportStore.recordExport({
      organizationId,
      exportType: type,
      leadsCount: 0,
      destination: "Microsoft Excel",
      status: "failed",
      error: err.message,
      exportedBy: session.user.name || "Team Member",
    });

    return NextResponse.json(
      { error: err.message || "Failed to export qualified leads" },
      { status: 500 }
    );
  }
}

