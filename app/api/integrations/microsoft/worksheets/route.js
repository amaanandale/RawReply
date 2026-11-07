import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getValidMicrosoftToken,
  listMicrosoftWorksheets,
  createMicrosoftWorksheet,
} from "@/lib/integrations/microsoft";

export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workbookId = searchParams.get("workbookId");

  if (!workbookId) {
    return NextResponse.json({ error: "workbookId is required" }, { status: 400 });
  }

  try {
    const accessToken = await getValidMicrosoftToken(session.organizationId);
    const worksheets = await listMicrosoftWorksheets(accessToken, workbookId);
    return NextResponse.json({ worksheets });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch worksheets" },
      { status: 400 }
    );
  }
}

export async function POST(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { workbookId, name = "RawReply Leads" } = body;

  if (!workbookId) {
    return NextResponse.json({ error: "workbookId is required" }, { status: 400 });
  }

  try {
    const accessToken = await getValidMicrosoftToken(session.organizationId);
    const newSheet = await createMicrosoftWorksheet(accessToken, workbookId, name);
    return NextResponse.json({ success: true, worksheet: newSheet });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to create worksheet" },
      { status: 400 }
    );
  }
}

