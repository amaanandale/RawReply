import { NextResponse } from "next/server";
import {
  parseAndVerifySignedRequest,
  processMetaDataDeletion,
  getDeletionRequestStatus,
} from "@/lib/meta/data-deletion";

/**
 * Meta Data Deletion Request Callback Endpoint.
 *
 * Conforms to Meta Platform Specifications:
 * - Meta sends an HTTP POST with a `signed_request` when a user removes the app or requests data deletion.
 * - Endpoint verifies HMAC-SHA256 signature using META_APP_SECRET.
 * - Purges user data and revokes access tokens safely.
 * - Returns `{ url: "<status_url>", confirmation_code: "<code_string>" }`
 *
 * GET /api/auth/meta/data-deletion?code=...
 * - Allows checking the deletion status of a specific confirmation code.
 */

export async function POST(req) {
  try {
    let signedRequest = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      try {
        const formData = await req.formData();
        signedRequest = formData.get("signed_request");
      } catch {
        // Fallback to text parsing if formData parsing encounters an issue
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      signedRequest = body.signed_request;
    }

    if (!signedRequest) {
      // Fallback: check query parameter or raw text
      const url = new URL(req.url);
      signedRequest = url.searchParams.get("signed_request");
      if (!signedRequest) {
        const text = await req.text().catch(() => "");
        const params = new URLSearchParams(text);
        signedRequest = params.get("signed_request");
      }
    }

    if (!signedRequest) {
      return NextResponse.json(
        { error: "Missing signed_request parameter in request body" },
        { status: 400 }
      );
    }

    // 1. Verify cryptographic signature (HMAC-SHA256 with META_APP_SECRET)
    const payload = parseAndVerifySignedRequest(signedRequest);

    const userId = payload.user_id;
    if (!userId) {
      return NextResponse.json(
        { error: "Payload does not contain valid user_id" },
        { status: 400 }
      );
    }

    // 2. Derive base URL for confirmation link
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("host") || "rawreply.vercel.app";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

    // 3. Process deletion and generate confirmation code
    const result = await processMetaDataDeletion({
      userId,
      metaIssuedAt: payload.issued_at,
      baseUrl,
    });

    // 4. Return Meta's required JSON response format
    return NextResponse.json(
      {
        url: result.url,
        confirmation_code: result.confirmationCode,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "MetaDataDeletion",
        action: "callback_failed",
        error: err.message,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json(
      { error: err.message || "Data deletion request failed" },
      { status: 400 }
    );
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing confirmation code parameter" },
      { status: 400 }
    );
  }

  const record = getDeletionRequestStatus(code);
  if (!record) {
    return NextResponse.json(
      {
        error: "Deletion request not found",
        confirmation_code: code,
        status: "not_found",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    confirmation_code: record.confirmationCode,
    status: record.status,
    requested_at: record.requestedAt,
    completed_at: record.completedAt,
    message: record.message,
  });
}
