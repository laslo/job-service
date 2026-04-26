/**
 * Deterministic CPU-bound stub processor.
 *
 * The roadmap calls for "PDF or stub processor" in Stage 5; we ship a stub so
 * the topology is exercised end-to-end without dragging a PDF toolchain into
 * the dev loop. The work is intentionally CPU-bound — chained SHA-256 — so
 * the worker behaves like a real compute job: it occupies the event loop and
 * must respect a wall-clock budget.
 *
 * Two safety properties matter:
 *
 *  1. **Bounded runtime**. Callers pass a `deadline` (absolute ms timestamp);
 *     the loop checks it every `DEADLINE_CHECK_INTERVAL` iterations and aborts
 *     with `CpuStubTimeoutError` rather than running to completion. This is
 *     cheaper and more predictable than a `setTimeout` race because CPU loops
 *     do not yield to timers reliably.
 *
 *  2. **Deterministic output**. Same `seed` + `iterations` ⇒ same hash. That
 *     property lets the handler test pin exact expected results without
 *     mocking node:crypto.
 */

import { createHash } from "node:crypto";

export interface CpuStubInput {
  readonly seed: string;
  readonly iterations: number;
  /** Absolute wall-clock deadline (`Date.now()` + budget). */
  readonly deadline: number;
}

export interface CpuStubResult {
  readonly hash: string;
  readonly iterations: number;
  readonly durationMs: number;
}

export class CpuStubTimeoutError extends Error {
  constructor(elapsedMs: number, budgetMs: number) {
    super(`CPU stub exceeded budget: elapsed=${elapsedMs}ms, budget=${budgetMs}ms`);
    this.name = "CpuStubTimeoutError";
  }
}

/**
 * Iteration block size for the deadline check.
 *
 * Smaller values give finer-grained cancellation but spend more time on the
 * `Date.now()` call relative to hashing. 1024 keeps overhead under ~1% on
 * commodity hardware while still aborting within tens of milliseconds of a
 * blown deadline.
 */
const DEADLINE_CHECK_INTERVAL = 1024;

export function runCpuStub(input: CpuStubInput): CpuStubResult {
  if (!Number.isInteger(input.iterations) || input.iterations < 1) {
    throw new Error(`iterations must be a positive integer, got ${input.iterations}`);
  }
  const startedAt = Date.now();
  let digest: Buffer = Buffer.from(input.seed, "utf8");

  for (let i = 0; i < input.iterations; i++) {
    digest = createHash("sha256").update(digest).digest();
    if (i % DEADLINE_CHECK_INTERVAL === DEADLINE_CHECK_INTERVAL - 1) {
      const now = Date.now();
      if (now >= input.deadline) {
        throw new CpuStubTimeoutError(now - startedAt, input.deadline - startedAt);
      }
    }
  }

  return {
    hash: digest.toString("hex"),
    iterations: input.iterations,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Coerces optional `payload.iterations` into a safe integer in `[1, max]`.
 * Returns `null` when the field is absent so callers can fall back to the
 * env-supplied default.
 */
export function readIterationsOverride(
  payload: Record<string, unknown> | null | undefined,
  max: number,
): number | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = (payload as { iterations?: unknown }).iterations;
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) {
    throw new Error(`payload.iterations must be a positive integer, got ${String(raw)}`);
  }
  if (raw > max) {
    throw new Error(`payload.iterations=${raw} exceeds JOB_CPU_MAX_ITERATIONS=${max}`);
  }
  return raw;
}
