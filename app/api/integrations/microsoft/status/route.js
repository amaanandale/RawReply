import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { integrationStore } from "@/lib/storage/integration-store";
import { isMicrosoftConfigured } from "@/lib/integrations/microsoft";

export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await integrationStore.getIntegration(session.organizationId);
  const isConfigured = isMicrosoftConfigured();

  return NextResponse.json({
    isConfigured,
    ...integration,
  });
}

