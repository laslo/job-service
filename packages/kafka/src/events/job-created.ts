/**
 * `jobs.created` event payload.
 *
 * Emitted by the API after a `jobs` row has been persisted in `pending` state.
 * Consumers (Stage 5+ workers, the Stage-4 logger stub) are expected to use the
 * `id` to look the row up in Postgres for the authoritative state — the event
 * carries enough fields for log lines and routing decisions, but Postgres
 * remains the source of truth.
 *
 * Schema is versioned via the `schemaVersion` field. A future stage will move
 * this to a registry (Avro/Protobuf) once a second consumer needs evolution
 * guarantees; for now JSON + an explicit version is the smallest workable step.
 */

import { Topics } from "../topics.js";

export const JOB_CREATED_SCHEMA_VERSION = 1;

export interface JobCreatedEvent {
  readonly schemaVersion: typeof JOB_CREATED_SCHEMA_VERSION;
  /** Job UUID; used as the partitioning key so per-job order is preserved. */
  readonly id: string;
  readonly type: string;
  readonly status: "pending";
  /** ISO-8601 timestamp from Postgres (`jobs.created_at`). */
  readonly createdAt: string;
}

export interface EncodedJobCreated {
  readonly topic: typeof Topics.JobsCreated;
  readonly key: string;
  readonly value: string;
  readonly headers: Readonly<Record<string, string>>;
}

export function encodeJobCreated(event: JobCreatedEvent): EncodedJobCreated {
  return {
    topic: Topics.JobsCreated,
    key: event.id,
    value: JSON.stringify(event),
    headers: {
      "content-type": "application/json",
      "schema-version": String(event.schemaVersion),
      "event-type": "job.created",
    },
  };
}

export class JobCreatedDecodeError extends Error {
  constructor(reason: string, cause?: unknown) {
    super(`Failed to decode jobs.created message: ${reason}`);
    this.name = "JobCreatedDecodeError";
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export function decodeJobCreated(value: Buffer | string | null): JobCreatedEvent {
  if (value === null) {
    throw new JobCreatedDecodeError("message value is null (tombstone not expected on this topic)");
  }
  const text = typeof value === "string" ? value : value.toString("utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new JobCreatedDecodeError("payload is not valid JSON", cause);
  }
  if (!isJobCreatedEvent(parsed)) {
    throw new JobCreatedDecodeError(`payload does not match schema v${JOB_CREATED_SCHEMA_VERSION}`);
  }
  return parsed;
}

function isJobCreatedEvent(value: unknown): value is JobCreatedEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate.schemaVersion === JOB_CREATED_SCHEMA_VERSION &&
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    candidate.status === "pending" &&
    typeof candidate.createdAt === "string"
  );
}
