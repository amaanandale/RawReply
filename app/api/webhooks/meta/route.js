import { NextResponse } from "next/server";
import { verifyWebhookSignature, normalizeWebhookEvents } from "@/lib/meta/webhooks";
import { durableEventStore } from "@/lib/events/durable-store";
import { logSystemError, ERROR_CATEGORIES, ERROR_SEVERITIES } from "@/lib/monitoring/error-logger";
import { processIncomingComment, processIncomingMessage } from "@/lib/meta/automation-runner";

/**
 * GET /api/webhooks/meta
 * Official Meta Webhook verification handshake.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token && expectedToken && token === expectedToken) {
    console.log(
      JSON.stringify({
        level: "info",
        service: "MetaWebhook",
        action: "verification_success",
        timestamp: new Date().toISOString(),
      })
    );
    // Return challenge strictly as plain text with 200 OK
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn(
    JSON.stringify({
      level: "warn",
      service: "MetaWebhook",
      action: "verification_failed",
      mode,
      providedTokenMatches: token === expectedToken,
      timestamp: new Date().toISOString(),
    })
  );

  return new Response("Forbidden", { status: 403 });
}

/**
 * POST /api/webhooks/meta
 * Official Meta Webhook event receiver.
 * Enforces HMAC-SHA256 signature verification, durable event acceptance,
 * and live execution of active comment-to-DM automations.
 */
export async function POST(req) {
  const signatureHeader = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "MetaWebhook",
        message: "META_APP_SECRET not configured in server environment",
      })
    );
    return NextResponse.json(
      { error: "Server webhook configuration error" },
      { status: 500 }
    );
  }

  // Read raw body string for cryptographic signature comparison
  const rawBody = await req.text();

  const isValid = verifyWebhookSignature({
    rawBody,
    signatureHeader,
    appSecret,
  });

  if (!isValid) {
    await logSystemError({
      category: ERROR_CATEGORIES.INSTAGRAM_WEBHOOK,
      severity: ERROR_SEVERITIES.WARN,
      endpoint: "/api/webhooks/meta",
      error: "Invalid Meta webhook signature header",
    });
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "MetaWebhook",
        action: "invalid_signature_rejected",
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    return NextResponse.json(
      { error: `Malformed JSON payload: ${err.message}` },
      { status: 400 }
    );
  }

  // Verify object type is Instagram or Page
  if (payload.object !== "instagram" && payload.object !== "page") {
    // Acknowledge receipt of unrelated Meta events to avoid unnecessary retries
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  // Normalize incoming event entries
  const events = normalizeWebhookEvents(payload);

  // Durably accept and process each event
  for (const event of events) {
    let ingestResult = null;
    try {
      ingestResult = await durableEventStore.ingestEvent(event);
    } catch (ingestErr) {
      console.error(
        JSON.stringify({
          level: "error",
          service: "MetaWebhook",
          action: "durable_ingest_failure",
          error: ingestErr.message,
          eventId: event.id,
        })
      );
      return NextResponse.json(
        { error: "Failed to durably store webhook event" },
        { status: 500 }
      );
    }

    // Skip processing if this event was already ingested and deduplicated
    if (ingestResult?.duplicate) {
      continue;
    }

    // Process event downstream
    try {
      if (event.type === "instagram_comment") {
        await processIncomingComment({
          commentId: event.data?.commentId,
          postId: event.data?.postId,
          text: event.data?.text,
          commenterId: event.data?.from?.id,
          commenterUsername: event.data?.from?.username,
          accountId: event.accountId,
        });
      } else if (event.type === "instagram_message") {
        await processIncomingMessage({
          mid: event.data?.mid,
          senderId: event.data?.senderId,
          recipientId: event.data?.recipientId,
          text: event.data?.text,
          accountId: event.accountId,
        });
      }

      await durableEventStore.markProcessed(event.id);
    } catch (processErr) {
      console.error(
        JSON.stringify({
          level: "error",
          service: "MetaWebhook",
          action: "event_processing_error",
          error: processErr.message,
          eventId: event.id,
        })
      );
    }
  }

  // Fast 200 acknowledgement as required by Meta webhook SLA (< 5s)
  return new Response("EVENT_RECEIVED", { status: 200 });
}
