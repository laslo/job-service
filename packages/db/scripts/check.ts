#!/usr/bin/env -S tsx
/**
 * Stage-2 sanity script: insert a job row and fetch it back.
 *
 * Validates connectivity, schema shape, and default columns (id, status,
 * timestamps) without standing up the API yet. Run via `pnpm db:check`.
 */

import { eq } from "drizzle-orm";

import { createClient } from "../src/client.js";
import { jobs } from "../src/schema/jobs.js";

async function main(): Promise<void> {
  const client = createClient({ max: 1 });

  try {
    const [inserted] = await client.db
      .insert(jobs)
      .values({
        type: "stage2.smoke",
        payload: { source: "db:check", at: new Date().toISOString() },
      })
      .returning();

    if (!inserted) {
      throw new Error("Insert returned no row");
    }

    const [fetched] = await client.db.select().from(jobs).where(eq(jobs.id, inserted.id)).limit(1);

    if (!fetched) {
      throw new Error(`Fetch returned no row for id=${inserted.id}`);
    }

    process.stdout.write(
      [
        "db:check ok",
        `  id         ${fetched.id}`,
        `  type       ${fetched.type}`,
        `  status     ${fetched.status}`,
        `  payload    ${JSON.stringify(fetched.payload)}`,
        `  createdAt  ${fetched.createdAt.toISOString()}`,
        `  updatedAt  ${fetched.updatedAt.toISOString()}`,
        "",
      ].join("\n"),
    );
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`db:check failed: ${formatError(error)}\n`);
  process.exitCode = 1;
});

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}
