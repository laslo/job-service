import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { defineConfig } from "drizzle-kit";

import { readDbEnv } from "./src/env.js";

// Best-effort load the workspace `.env` so drizzle-kit subcommands (generate,
// migrate, push, studio) work without a wrapper. Node 22 ships `loadEnvFile`.
const here = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(here, "../../.env");
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: readDbEnv().url,
  },
  strict: true,
  verbose: true,
});
