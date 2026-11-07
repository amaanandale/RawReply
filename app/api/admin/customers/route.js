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

    const [customers, total] = await Promise.all([
      db.listAllCustomers({ search, status, limit, offset }),
      db.countAllCustomers({ search, status }),
    ]);

    const customersWithOrgs = await Promise.all(
      customers.map(async (c) => {
        const orgs = await db.listUserOrganizations(c.id);
        return {
          ...c,
          organizations: orgs.map((o) => ({ id: o.id, name: o.name, role: o.role })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      customers: customersWithOrgs,
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

