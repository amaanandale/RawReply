import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { leadStore } from "@/lib/storage/lead-store";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limiter";

/**
 * GET /api/leads
 * Lists paginated, filtered qualified leads for the authenticated organization.
 */
export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const platform = searchParams.get("platform") || "";
  const automationId = searchParams.get("automationId") || "";
  const accountId = searchParams.get("accountId") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "25", 10);

  try {
    const result = await leadStore.listLeads(session.organizationId, {
      search,
      status,
      platform,
      automationId,
      accountId,
      startDate,
      endDate,
      sort,
      page,
      limit,
    });

    const stats = await leadStore.getLeadStats(session.organizationId);

    return NextResponse.json({
      ...result,
      stats,
    });
  } catch (err) {
    console.error("[API /api/leads GET] Error:", err.message);
    return NextResponse.json(
      { error: "Failed to retrieve qualified leads" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads
 * Creates or updates a qualified lead.
 * ONLY individuals who provide a valid international mobile number become leads.
 */
export async function POST(req) {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`lead_submit:${clientIp}`, 30, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many lead submissions. Please wait." },
      { status: 429 }
    );
  }

  // Session authentication or server-to-server webhook key
  const session = await getCurrentSession(req);
  let organizationId = session?.organizationId;

  const body = await req.json().catch(() => ({}));

  if (!organizationId) {
    // If called internally by webhook DM runner, organizationId can be provided in trusted payload
    if (body.organizationId) {
      organizationId = body.organizationId;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await leadStore.createOrUpdateLead({
      ...body,
      organizationId,
    });

    return NextResponse.json(
      {
        success: true,
        lead: result.lead,
        isNew: result.isNew,
      },
      { status: result.isNew ? 201 : 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to process lead qualification" },
      { status: 400 }
    );
  }
}

