import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getValidMicrosoftToken,
  listMicrosoftWorkbooks,
} from "@/lib/integrations/microsoft";

export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getValidMicrosoftToken(session.organizationId);
    const workbooks = await listMicrosoftWorkbooks(accessToken);
    return NextResponse.json({ workbooks });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch workbooks" },
      { status: 400 }
    );
  }
}

