#!/usr/bin/env -S node --import @swc-node/register/esm-register
/**
 * Emit the OpenAPI document for the Job Service to `apps/job-service/openapi.json`.
 *
 * Run via `pnpm --filter @job-service/api openapi:generate` (or `pnpm api:openapi`
 * at the repo root). Commit the file alongside controller / DTO changes so a
 * future CI step can detect drift between source-of-truth decorators and the
 * checked-in artifact (per ADR-0004).
 *
 * The script never opens an HTTP listener and never connects to Postgres; it
 * builds the Nest application context, snapshots the spec, and exits.
 */

import "reflect-metadata";

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "../src/app.module.js";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, "..", "openapi.json");

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    app.setGlobalPrefix("v1", { exclude: ["healthz", "readyz"] });

    const config = new DocumentBuilder()
      .setTitle("Job Service API")
      .setDescription("Create and fetch background jobs.")
      .setVersion("0.1.0")
      .addServer("http://localhost:4000")
      .addTag("jobs")
      .addTag("health")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    await writeFile(outFile, JSON.stringify(document, null, 2) + "\n", "utf8");
    process.stdout.write(`Wrote ${outFile}\n`);
  } finally {
    await app.close();
  }
}

main().catch((err: unknown) => {
  process.stderr.write(
    `generate-openapi failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
