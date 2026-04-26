/**
 * Reads HTTP server settings from process.env.
 *
 * Intentionally tiny: at Stage 3 the only knobs are bind host and port. Database
 * connection config is owned by `@job-service/db` (see `DATABASE_URL`); a future
 * shared `@job-service/config` package can absorb both surfaces if scope grows.
 */

export interface ApiEnv {
  readonly host: string;
  readonly port: number;
}

export class InvalidApiEnvError extends Error {
  constructor(name: string, value: unknown) {
    super(`Invalid env var ${name}=${String(value)}`);
    this.name = "InvalidApiEnvError";
  }
}

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 4000;

export function readApiEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  const rawPort = env.JOB_SERVICE_PORT?.trim();
  let port = DEFAULT_PORT;
  if (rawPort) {
    if (!/^\d+$/.test(rawPort)) {
      throw new InvalidApiEnvError("JOB_SERVICE_PORT", env.JOB_SERVICE_PORT);
    }
    port = Number.parseInt(rawPort, 10);
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new InvalidApiEnvError("JOB_SERVICE_PORT", env.JOB_SERVICE_PORT);
  }

  const host = env.JOB_SERVICE_HOST?.trim() || DEFAULT_HOST;
  return { host, port };
}
