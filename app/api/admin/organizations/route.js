import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

export async function GET(req) {
  const auth = await requireSuperAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const [orgs, total] = await Promise.all([
      db.listAllOrganizations({ search, status, limit, offset }),
      db.countAllOrganizations({ search, status }),
    ]);

    const orgsWithDetails = await Promise.all(
      orgs.map(async (org) => {
        const members = await db.listOrganizationMembers(org.id);
        const owner = members.find((m) => m.role === "owner") || members[0] || null;
        return {
          ...org,
          memberCount: members.length,
          owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      organizations: orgsWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

