/**
 * Reads database connection settings from process.env.
 *
 * Stage-2 scope: a single `DATABASE_URL` is the source of truth. We intentionally
 * avoid a runtime schema validator dependency at this stage; later stages (where
 * config grows) can introduce one in a shared `@job-service/config` package.
 */

export interface DbEnv {
  readonly url: string;
}

export class MissingDbEnvError extends Error {
  constructor(missing: string) {
    super(
      `Missing required env var ${missing}. Copy .env.example to .env or export it before running this command.`,
    );
    this.name = "MissingDbEnvError";
  }
}

export function readDbEnv(env: NodeJS.ProcessEnv = process.env): DbEnv {
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    throw new MissingDbEnvError("DATABASE_URL");
  }
  return { url };
}
