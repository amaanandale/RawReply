import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

/**
 * GET /api/activity
 * Customer-facing Activity & Issues endpoint.
 * Enforces strict organization-level isolation — customers only ever see events
 * belonging to their own organization and account.
 * NEVER exposes internal stack traces, API keys, or raw system secrets.
 */
export async function GET(req) {
  const session = await getCurrentSession(req);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.organizationId;
  const userId = session.user.id;

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "";
    const type = searchParams.get("type") || ""; // 'login', 'error', 'all'
    const search = searchParams.get("search") || "";

    const [loginEvents, systemErrors] = await Promise.all([
      db.listLoginEvents({ organizationId, userId, limit: 30 }),
      db.listSystemErrors({ organizationId, category: category || undefined, limit: 30 }),
    ]);

    // Format login events for customer consumption
    const formattedLogins = loginEvents.map((evt) => ({
      id: evt.id,
      kind: "login",
      title: evt.status === "success" ? "Successful Login" : "Authentication Alert",
      description: evt.safe_error_description || (evt.status === "success" ? "Session started successfully" : "Sign-in attempt failed"),
      status: evt.status,
      severity: evt.status === "success" ? "info" : "warn",
      timestamp: evt.created_at,
      ipAddress: evt.ip_address,
      userAgent: evt.user_agent,
    }));

    // Format system errors into customer-understandable notifications (STRIPPING ALL STACK TRACES)
    const formattedErrors = systemErrors.map((err) => ({
      id: err.id,
      kind: "issue",
      category: err.category,
      title: formatCategoryTitle(err.category),
      description: err.safe_message,
      severity: err.severity,
      status: err.resolved ? "resolved" : "active",
      occurrences: err.occurrence_count || 1,
      timestamp: err.last_seen_at || err.first_seen_at,
      endpoint: err.endpoint,
    }));

    let allItems = [];
    if (type === "login") {
      allItems = formattedLogins;
    } else if (type === "issue") {
      allItems = formattedErrors;
    } else {
      allItems = [...formattedLogins, ...formattedErrors];
    }

    if (search) {
      const term = search.toLowerCase();
      allItems = allItems.filter(
        (item) =>
          item.title?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term)
      );
    }

    // Sort descending by timestamp
    allItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return NextResponse.json({
      success: true,
      activities: allItems.slice(0, 50),
      summary: {
        totalIssues: formattedErrors.filter((e) => e.status === "active").length,
        recentLogins: formattedLogins.length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function formatCategoryTitle(category) {
  switch (category) {
    case "instagram_oauth":
      return "Instagram Connection Notice";
    case "instagram_webhook":
      return "Instagram Webhook Event";
    case "comment_processing":
      return "Comment Automation Notice";
    case "message_processing":
      return "Direct Message Delivery";
    case "lead_extraction":
      return "Lead Phone Validation";
    case "auth":
      return "Security Verification";
    default:
      return "System Notification";
  }
}

