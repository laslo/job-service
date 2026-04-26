/**
 * Reads CPU-worker tunables from process.env.
 *
 * Stage-5 scope: a per-job CPU budget and a default iteration count for the
 * stub processor. Both have safe defaults sized for local development; the
 * limits are explicit so local runs cannot wedge the event loop indefinitely.
 *
 * The Kafka and database surfaces remain owned by their respective packages
 * (`@job-service/kafka` / `@job-service/db`); this file only covers what is
 * unique to the worker.
 */

export interface CpuWorkerEnv {
  /** Wall-clock budget per job before the handler force-fails it. */
  readonly timeoutMs: number;
  /** Default SHA-256 iteration count when the job payload omits its own. */
  readonly defaultIterations: number;
  /** Hard ceiling on `payload.iterations` so a poison message cannot stall. */
  readonly maxIterations: number;
}

export class InvalidCpuWorkerEnvError extends Error {
  constructor(name: string, value: unknown, reason?: string) {
    super(`Invalid env var ${name}=${String(value)}${reason ? `: ${reason}` : ""}`);
    this.name = "InvalidCpuWorkerEnvError";
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_ITERATIONS = 200_000;
const DEFAULT_MAX_ITERATIONS = 5_000_000;

export function readCpuWorkerEnv(env: NodeJS.ProcessEnv = process.env): CpuWorkerEnv {
  const timeoutMs = parsePositiveInt(env, "JOB_CPU_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, {
    min: 100,
    max: 10 * 60_000,
  });
  const defaultIterations = parsePositiveInt(
    env,
    "JOB_CPU_DEFAULT_ITERATIONS",
    DEFAULT_ITERATIONS,
    { min: 1, max: DEFAULT_MAX_ITERATIONS },
  );
  const maxIterations = parsePositiveInt(env, "JOB_CPU_MAX_ITERATIONS", DEFAULT_MAX_ITERATIONS, {
    min: defaultIterations,
    max: 100_000_000,
  });

  return { timeoutMs, defaultIterations, maxIterations };
}

interface RangeOptions {
  readonly min: number;
  readonly max: number;
}

function parsePositiveInt(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  range: RangeOptions,
): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new InvalidCpuWorkerEnvError(name, raw, "expected a positive integer");
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < range.min || value > range.max) {
    throw new InvalidCpuWorkerEnvError(name, raw, `must be between ${range.min} and ${range.max}`);
  }
  return value;
}
