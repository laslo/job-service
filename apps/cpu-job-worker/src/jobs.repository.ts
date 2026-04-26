/**
 * Worker-side repository for the `jobs` table.
 *
 * Kept separate from `apps/job-service`'s NestJS-bound repository so this
 * process can stay a small, fast script (no DI container, no decorators).
 * The transitions here are guarded with `WHERE status IN (...)` clauses so
 * Kafka redeliveries cannot regress a `completed` row back to `running`.
 *
 * `updatedAt` is bumped explicitly on every transition because the schema
 * default (`now()`) only fires on insert.
 */

import { and, eq, inArray } from "drizzle-orm";

import { jobs, type Database, type JobRow, type JobStatus } from "@job-service/db";

export class JobNotFoundError extends Error {
  constructor(id: string) {
    super(`Job ${id} not found`);
    this.name = "JobNotFoundError";
  }
}

/**
 * `error` column values are bounded so a runaway stack trace cannot blow up
 * the row size. Workers that need richer detail can stash structured info in
 * `payload` (or, in a later stage, a dedicated `result` column).
 */
export const MAX_ERROR_LENGTH = 2_000;

const ACTIVE_STATUSES: readonly JobStatus[] = ["pending", "running"];

export class WorkerJobsRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<JobRow | null> {
    const [row] = await this.db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return row ?? null;
  }

  /**
   * Move a row from `pending`/`running` to `running`, clearing any stale
   * error from a previous failed attempt. Returns the updated row, or `null`
   * if the row is already in a terminal state (caller should skip the work).
   */
  async markRunning(id: string): Promise<JobRow | null> {
    const [row] = await this.db
      .update(jobs)
      .set({ status: "running", error: null, updatedAt: new Date() })
      .where(and(eq(jobs.id, id), inArray(jobs.status, [...ACTIVE_STATUSES])))
      .returning();
    return row ?? null;
  }

  /**
   * Move a `running` row to `completed`. Idempotent: a redelivered message
   * whose row is already `completed` returns `null` and the caller skips.
   */
  async markCompleted(id: string): Promise<JobRow | null> {
    const [row] = await this.db
      .update(jobs)
      .set({ status: "completed", error: null, updatedAt: new Date() })
      .where(and(eq(jobs.id, id), eq(jobs.status, "running")))
      .returning();
    return row ?? null;
  }

  /**
   * Mark a row failed and persist a (truncated) error message. Accepts
   * `pending` as well as `running` so the very first attempt — which fails
   * before `markRunning` lands — still records the cause.
   */
  async markFailed(id: string, error: string): Promise<JobRow | null> {
    const message = truncate(error, MAX_ERROR_LENGTH);
    const [row] = await this.db
      .update(jobs)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(and(eq(jobs.id, id), inArray(jobs.status, [...ACTIVE_STATUSES])))
      .returning();
    return row ?? null;
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + "…";
}
