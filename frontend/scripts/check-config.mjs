#!/usr/bin/env node
/**
 * Guards against the three ways this project silently drifts back to older
 * conventions that most tutorials still teach:
 *
 *   1. `tailwind.config.*` — Tailwind 4 is configured in CSS (`@theme`), and a
 *      JS config file is ignored, so its contents would quietly do nothing.
 *   2. `@tailwind base/components/utilities` — replaced by `@import "tailwindcss"`.
 *   3. `middleware.ts` — Next.js 16 runs `proxy.ts`; a middleware file would
 *      never execute, taking the auth redirect with it.
 *
 * Run by `npm run guard` and by CI. Exits non-zero with the fix spelled out.
 * Deliberately dependency-free and Node 20 compatible (no `fs.glob`).
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "out", "coverage"]);

/** Every file under `root`, as a path relative to it, with build output skipped. */
function walk(dir = root, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...walk(join(dir, entry.name), `${prefix}${entry.name}/`));
    } else {
      files.push(`${prefix}${entry.name}`);
    }
  }
  return files;
}

const files = walk();
const problems = [];

for (const file of files.filter((f) => /(^|\/)tailwind\.config\.[cm]?[jt]s$/.test(f))) {
  problems.push(
    `${file}: Tailwind 4 reads its config from CSS. Move these values into an @theme block in app/globals.css and delete this file.`,
  );
}

for (const file of files.filter((f) => f === "middleware.ts" || f === "src/middleware.ts")) {
  problems.push(
    `${file}: Next.js 16 runs proxy.ts, not middleware.ts — this file would never execute. Move its logic into proxy.ts.`,
  );
}

for (const file of files.filter((f) => f.endsWith(".css"))) {
  const directive = readFileSync(resolve(root, file), "utf8").match(/^\s*@tailwind\s+\w+/m);
  if (directive) {
    problems.push(
      `${file}: "${directive[0].trim()}" is Tailwind 3 syntax. Tailwind 4 uses a single @import "tailwindcss".`,
    );
  }
}

if (!files.includes("proxy.ts")) {
  problems.push(
    "proxy.ts is missing — without it no route is protected and sessions never refresh.",
  );
}

if (problems.length > 0) {
  console.error(`Config guard failed (${problems.length} problem${problems.length > 1 ? "s" : ""}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`Config guard passed (${files.length} files checked).`);
