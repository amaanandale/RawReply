import fs from "fs";
import path from "path";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "data")
  : path.join(process.cwd(), "data");
const EVENT_LOG_FILE = path.join(DATA_DIR, "webhook_events_log.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStoredEvents() {
  ensureDataDir();
  if (!fs.existsSync(EVENT_LOG_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(EVENT_LOG_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[DurableEventStore] Error reading event log:", err.message);
    return [];
  }
}

function writeStoredEvents(events) {
  ensureDataDir();
  // Keep the most recent 1000 events for durable deduplication and audit trail
  const trimmed = events.slice(-1000);
  fs.writeFileSync(EVENT_LOG_FILE, JSON.stringify(trimmed, null, 2), "utf8");
}

/**
 * Production Durable Event Store Interface.
 *
 * NOTE FOR PRODUCTION INFRASTRUCTURE:
 * In a multi-instance serverless/container environment (e.g. AWS / Vercel),
 * replace this file-backed implementation with an external durable queue or database
 * such as Redis Streams (Upstash), AWS SQS, or PostgreSQL (pg-boss / RabbitMQ).
 */
export const durableEventStore = {
  /**
   * Durably accepts an incoming normalized event.
   * Enforces idempotency via dedupKey check.
   */
  async ingestEvent(event) {
    if (!event || !event.dedupKey) {
      throw new Error("[DurableEventStore] Missing event or dedupKey");
    }

    const existingEvents = readStoredEvents();
    const isDuplicate = existingEvents.some((e) => e.dedupKey === event.dedupKey);

    if (isDuplicate) {
      console.log(
        JSON.stringify({
          level: "info",
          service: "DurableEventStore",
          action: "duplicate_event_detected",
          dedupKey: event.dedupKey,
          type: event.type,
          timestamp: new Date().toISOString(),
        })
      );
      return { accepted: true, duplicate: true, eventId: event.id };
    }

    const record = {
      ...event,
      ingestedAt: new Date().toISOString(),
      status: "queued",
      attempts: 0,
    };

    existingEvents.push(record);
    writeStoredEvents(existingEvents);

    console.log(
      JSON.stringify({
        level: "info",
        service: "DurableEventStore",
        action: "event_durably_ingested",
        eventId: event.id,
        dedupKey: event.dedupKey,
        type: event.type,
        timestamp: record.ingestedAt,
      })
    );

    return { accepted: true, duplicate: false, eventId: event.id };
  },

  /**
   * Retrieves pending events for downstream automation execution (for future phases).
   */
  async getQueuedEvents() {
    const events = readStoredEvents();
    return events.filter((e) => e.status === "queued");
  },

  /**
   * Marks an event as processed.
   */
  async markProcessed(eventId) {
    const events = readStoredEvents();
    const target = events.find((e) => e.id === eventId);
    if (target) {
      target.status = "processed";
      target.processedAt = new Date().toISOString();
      writeStoredEvents(events);
    }
  },
};

