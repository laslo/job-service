#!/usr/bin/env -S tsx
/**
 * Applies pending migrations under `packages/db/drizzle` to the database
 * pointed at by `DATABASE_URL`. Idempotent: safe to run repeatedly.
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createClient } from "../src/client.js";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(here, "..", "drizzle");

async function main(): Promise<void> {
  const client = createClient({ max: 1, withSchema: false });
  try {
    await migrate(client.db, { migrationsFolder });
    process.stdout.write(`Applied migrations from ${migrationsFolder}\n`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Migration failed: ${formatError(error)}\n`);
  process.exitCode = 1;
});

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}
