import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { leadStore } from "@/lib/storage/lead-store";

/**
 * GET /api/leads/[id]
 * Retrieves details for a specific qualified lead.
 */
export async function GET(req, { params }) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const lead = await leadStore.getLead(session.organizationId, id);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

/**
 * PATCH /api/leads/[id]
 * Updates lead status or appends an internal note.
 */
export async function PATCH(req, { params }) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    let updatedLead = null;

    if (body.status) {
      updatedLead = await leadStore.updateLeadStatus(
        session.organizationId,
        id,
        body.status
      );
    }

    if (body.note) {
      const authorName = session.user.name || "Team Member";
      await leadStore.addLeadNote(session.organizationId, id, {
        text: body.note,
        authorName,
      });
      updatedLead = await leadStore.getLead(session.organizationId, id);
    }

    if (!updatedLead) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to update lead" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/leads/[id]
 * Deletes a lead record with organization authorization.
 */
export async function DELETE(req, { params }) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await leadStore.deleteLead(session.organizationId, id);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to delete lead" },
      { status: 400 }
    );
  }
}

