import crypto from "crypto";

/**
 * Verifies the Meta HMAC-SHA256 signature from the X-Hub-Signature-256 header.
 * Uses timingSafeEqual to protect against timing attacks.
 */
export function verifyWebhookSignature({ rawBody, signatureHeader, appSecret }) {
  if (!signatureHeader || !appSecret) {
    return false;
  }

  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    return false;
  }

  const receivedHash = parts[1];
  const expectedHash = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Normalizes incoming Meta webhook events into standardized RawReply event objects.
 * Handles both Instagram graph comments (feed changes) and direct messaging events.
 */
export function normalizeWebhookEvents(payload) {
  if (!payload || !Array.isArray(payload.entry)) {
    return [];
  }

  const events = [];
  const isPageObject = payload.object === "page";

  for (const entry of payload.entry) {
    const entryId = entry.id; // Page ID or Instagram Business Account ID
    const entryTime = entry.time || Date.now();

    // 1. Check for Feed / Comment changes (Instagram comments or Facebook Page feed comments)
    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        if (change.field === "comments" || change.field === "feed") {
          const val = change.value || {};
          // Only process comments, not other feed changes
          if (val.item === "comment" || val.comment_id || val.id) {
            const rawCommentId = val.comment_id || val.id;
            const normalizedDedupKey = rawCommentId.startsWith("comment_")
              ? rawCommentId
              : `comment_${rawCommentId}`;

            const platform = isPageObject ? "facebook" : "instagram";
            const eventType = isPageObject ? "facebook_comment" : "instagram_comment";

            events.push({
              id: `${normalizedDedupKey}_${entryTime}`,
              dedupKey: normalizedDedupKey,
              type: eventType,
              platform,
              accountId: entryId,
              timestamp: entryTime,
              data: {
                commentId: val.comment_id || val.id,
                postId: val.media?.id || val.post_id,
                parentId: val.parent_id || null,
                text: val.text || val.message || "",
                from: {
                  id: val.from?.id,
                  username: val.from?.username || val.from?.name || "User",
                  name: val.from?.name || val.from?.username || "User",
                },
                createdAt: val.created_time || new Date(entryTime).toISOString(),
              },
            });
          }
        }
      }
    }

    // 2. Check for Direct Messaging events (Instagram DMs or Facebook Messenger)
    if (Array.isArray(entry.messaging)) {
      for (const msg of entry.messaging) {
        const senderId = msg.sender?.id;
        const recipientId = msg.recipient?.id;
        const timestamp = msg.timestamp || entryTime;

        // Message received
        if (msg.message && !msg.message.is_echo) {
          const platform = isPageObject ? "facebook" : "instagram";
          const eventType = isPageObject ? "facebook_message" : "instagram_message";

          events.push({
            id: `msg_${msg.message.mid || `${senderId}_${timestamp}`}`,
            dedupKey: `msg_${msg.message.mid}`,
            type: eventType,
            platform,
            accountId: recipientId,
            timestamp,
            data: {
              mid: msg.message.mid,
              senderId,
              recipientId,
              text: msg.message.text || "",
              quickReply: msg.message.quick_reply || null,
              replyToMid: msg.message.reply_to?.mid || null,
            },
          });
        }

        // Postback button received
        if (msg.postback) {
          events.push({
            id: `postback_${msg.postback.mid || `${senderId}_${timestamp}`}`,
            dedupKey: `postback_${msg.postback.mid || `${senderId}_${msg.postback.payload}_${timestamp}`}`,
            type: "instagram_postback",
            platform: "instagram",
            accountId: recipientId,
            timestamp,
            data: {
              senderId,
              recipientId,
              mid: msg.postback.mid,
              payload: msg.postback.payload,
              title: msg.postback.title,
            },
          });
        }
      }
    }
  }

  return events;
}
