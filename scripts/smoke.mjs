#!/usr/bin/env node
// Stage-1 smoke command: prints toolchain identity and target layout.
// Intended as the single command a contributor runs to confirm the dev loop works.

import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const expectedDirs = [
  "apps",
  "packages",
  "infra",
  "infra/kubernetes",
  "infra/helm",
  "infra/observability",
  "docs",
];

const layout = expectedDirs.map((rel) => {
  const abs = join(root, rel);
  const ok = existsSync(abs) && statSync(abs).isDirectory();
  return { path: rel, ok };
});

const lines = [
  `${pkg.name}@${pkg.version} — Stage 1 smoke`,
  "",
  "Toolchain (locked):",
  `  node           ${process.version}  (engines: ${pkg.engines?.node ?? "n/a"})`,
  `  packageManager ${pkg.packageManager ?? "n/a"}`,
  "",
  "Target layout:",
  ...layout.map((l) => `  ${l.ok ? "ok " : "MISS"} ${l.path}/`),
  "",
  "Next: see docs/roadmap.md (Stage 2 — PostgreSQL and job model).",
];

process.stdout.write(lines.join("\n") + "\n");

const missing = layout.filter((l) => !l.ok);
if (missing.length > 0) {
  process.stderr.write(
    `\nMissing ${missing.length} expected director${missing.length === 1 ? "y" : "ies"}.\n`,
  );
  process.exit(1);
}
