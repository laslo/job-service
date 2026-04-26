#!/usr/bin/env node
// Smoke command: prints toolchain identity and the target repo layout.
// One command a contributor runs to confirm the dev loop works after onboarding
// or a major branch switch. Layout grows with the roadmap (currently Stage 3).

import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const expectedDirs = [
  "apps",
  "apps/job-service",
  "packages",
  "packages/db",
  "infra",
  "infra/kubernetes",
  "infra/helm",
  "infra/observability",
  "docs",
];

const expectedFiles = [
  ".env.example",
  "infra/docker-compose.dev.yml",
  "apps/job-service/openapi.json",
];

const layout = expectedDirs.map((rel) => {
  const abs = join(root, rel);
  const ok = existsSync(abs) && statSync(abs).isDirectory();
  return { kind: "dir", path: rel, ok };
});

const files = expectedFiles.map((rel) => {
  const abs = join(root, rel);
  const ok = existsSync(abs) && statSync(abs).isFile();
  return { kind: "file", path: rel, ok };
});

const lines = [
  `${pkg.name}@${pkg.version} — smoke`,
  "",
  "Toolchain (locked):",
  `  node           ${process.version}  (engines: ${pkg.engines?.node ?? "n/a"})`,
  `  packageManager ${pkg.packageManager ?? "n/a"}`,
  "",
  "Target layout:",
  ...layout.map((l) => `  ${l.ok ? "ok " : "MISS"} ${l.path}/`),
  ...files.map((f) => `  ${f.ok ? "ok " : "MISS"} ${f.path}`),
  "",
  "Next: see docs/roadmap.md (Stage 4 — Kafka).",
];

process.stdout.write(lines.join("\n") + "\n");

const missing = [...layout, ...files].filter((l) => !l.ok);
if (missing.length > 0) {
  const noun = missing.length === 1 ? "entry" : "entries";
  process.stderr.write(`\nMissing ${missing.length} expected ${noun}.\n`);
  process.exit(1);
}
