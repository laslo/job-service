/**
 * Per-message orchestration for the CPU worker.
 *
 * Stage-5 contract:
 *  - Look up the row by id (Postgres is the source of truth; the event only
 *    carries enough fields for routing).
 *  - If the row is already in a terminal state (`completed` / `failed`) skip
 *    the work — Kafka redelivery is allowed to be a no-op.
 *  - Mark the row `running`, clear any stale error from a prior failed
 *    attempt, and execute the CPU stub under the configured wall-clock
 *    deadline.
 *  - On success transition to `completed`. On any thrown error transition to
 *    `failed` with a serialised message and **return normally** so the Kafka
 *    consumer commits the offset (the failure is durable in Postgres).
 *  - Database errors propagate so the offset is *not* committed and the
 *    message is redelivered — the next attempt will retry the row.
 */

import type { JobCreatedEvent } from "@job-service/kafka";

import {
  CpuStubTimeoutError,
  readIterationsOverride,
  runCpuStub,
  type CpuStubResult,
} from "./cpu-stub.js";
import type { CpuWorkerEnv } from "./env.js";
import { JobNotFoundError, type WorkerJobsRepository } from "./jobs.repository.js";

export interface HandlerContext {
  readonly env: CpuWorkerEnv;
  readonly repository: WorkerJobsRepository;
  /** Injected logger so tests can capture output. */
  readonly logger: HandlerLogger;
  /** Override for tests — production code reads `Date.now()` directly. */
  readonly now?: () => number;
}

export interface HandlerLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export type HandlerOutcome =
  | { kind: "completed"; jobId: string; result: CpuStubResult }
  | { kind: "failed"; jobId: string; error: string }
  | { kind: "skipped"; jobId: string; reason: string };

export async function handleJobCreated(
  event: JobCreatedEvent,
  ctx: HandlerContext,
): Promise<HandlerOutcome> {
  const now = ctx.now ?? Date.now;
  const row = await ctx.repository.findById(event.id);
  if (!row) {
    // The event arrived before the row is visible (logical replication lag, a
    // wiped dev DB, etc.). Surface as an error so the offset is not committed
    // and the message is redelivered — by then the row should be visible.
    throw new JobNotFoundError(event.id);
  }
  if (row.status === "completed" || row.status === "failed") {
    ctx.logger.info(
      `cpu-job-worker: skip jobId=${row.id} status=${row.status} (terminal — likely Kafka redelivery)`,
    );
    return { kind: "skipped", jobId: row.id, reason: `already ${row.status}` };
  }

  const running = await ctx.repository.markRunning(row.id);
  if (!running) {
    // Another worker beat us to a terminal transition between findById and
    // markRunning. Treat as a benign skip.
    ctx.logger.info(`cpu-job-worker: skip jobId=${row.id} (raced to terminal state)`);
    return { kind: "skipped", jobId: row.id, reason: "raced to terminal" };
  }

  const payload = (running.payload ?? {}) as Record<string, unknown>;
  let result: CpuStubResult;
  try {
    const iterations = readIterationsOverride(payload, ctx.env.maxIterations);
    result = runCpuStub({
      seed: running.id,
      iterations: iterations ?? ctx.env.defaultIterations,
      deadline: now() + ctx.env.timeoutMs,
    });
  } catch (err) {
    const message = formatFailureMessage(err, ctx.env);
    const failed = await ctx.repository.markFailed(running.id, message);
    if (!failed) {
      ctx.logger.warn(
        `cpu-job-worker: jobId=${running.id} failure could not be persisted (row already terminal)`,
      );
    } else {
      ctx.logger.warn(`cpu-job-worker: jobId=${running.id} failed: ${message}`);
    }
    return { kind: "failed", jobId: running.id, error: message };
  }

  const completed = await ctx.repository.markCompleted(running.id);
  if (!completed) {
    // Should not happen — markRunning succeeded — but guard anyway so a race
    // does not corrupt our return value.
    ctx.logger.warn(`cpu-job-worker: jobId=${running.id} could not transition to completed`);
    return { kind: "skipped", jobId: running.id, reason: "could not complete" };
  }

  ctx.logger.info(
    `cpu-job-worker: jobId=${running.id} completed in ${result.durationMs}ms ` +
      `(iterations=${result.iterations} hash=${result.hash.slice(0, 12)}…)`,
  );
  return { kind: "completed", jobId: running.id, result };
}

function formatFailureMessage(error: unknown, env: CpuWorkerEnv): string {
  if (error instanceof CpuStubTimeoutError) {
    return `Job exceeded JOB_CPU_TIMEOUT_MS=${env.timeoutMs}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
