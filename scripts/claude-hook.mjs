#!/usr/bin/env node
/** @file Claude Code hook: keeps indexes current and makes the agent fix docs gaps in files it touched. */
// Wired in .claude/settings.json. Modes:
//   session-start  enable git hooks + merge driver for generated files, regenerate indexes, print a 1-line nudge
//   stop           regenerate indexes; if files changed in this branch lack summaries/JSDoc, have broken
//                  links or look like duplicates, exit 2 so the agent fixes them before finishing.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const mode = process.argv[2];
const sh = (c) => { try { return execSync(c, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };
const gen = (flags = "") => sh(`node scripts/gen-index.mjs ${flags}`);
process.chdir(sh("git rev-parse --show-toplevel") || ".");

if (mode === "session-start") {
  if (sh("git config core.hooksPath") !== ".githooks") sh("git config core.hooksPath .githooks");
  sh('git config merge.cims-generated.name "CIMS generated index (regenerate, never hand-merge)"');
  sh("git config merge.cims-generated.driver true");
  gen("--quiet");
  console.log("CIMS: indexes regenerated. Navigate via INDEX.md → folder INDEX.md; check docs/FUNCTIONS.md before writing a function; follow CLAUDE.md.");
  process.exit(0);
}

if (mode === "stop") {
  let input = {};
  try { input = JSON.parse(readFileSync(0, "utf8") || "{}"); } catch {}
  const report = JSON.parse(gen("--json") || "{}");
  gen("--quiet"); // write the fresh indexes
  if (input.stop_hook_active) process.exit(0); // never loop: one nudge per stop

  const base = sh("git merge-base HEAD origin/main");
  const changed = new Set([
    ...sh("git status --porcelain").split("\n").filter(Boolean).map((l) => l.slice(3).split(" -> ").pop()),
    ...(base ? sh(`git diff --name-only ${base}`).split("\n").filter(Boolean) : []),
  ]);
  const mine = (p) => changed.has(p.split(":")[0].split(" ")[0]);
  const dirsTouched = new Set([...changed].map((p) => p.split("/").slice(0, -1).join("/")).filter(Boolean));
  const issues = [
    ...(report.missingSummaries ?? []).filter(mine).map((f) => `${f}: add a one-line summary (code: \`/** @file … */\` on line 1; markdown: \`<!-- summary: … -->\`)`),
    ...(report.missingDocs ?? []).filter(mine).map((x) => `${x}: add a one-line JSDoc above this export`),
    ...(report.missingDirDesc ?? []).filter((d) => dirsTouched.has(d)).map((d) => `${d}/INDEX.md: write the one-line folder description above the AUTO marker`),
    ...(report.brokenLinks ?? []).filter((l) => changed.has(l.split(" → ")[0])).map((l) => `broken link: ${l}`),
    ...(report.duplicates ?? []).filter((d) => [...changed].some((f) => d.includes(f))).map((d) => `possible duplicate (reuse or merge): ${d}`),
  ];
  if (issues.length) {
    console.error(`Docs maintenance (CIMS): fix these in files you changed, then finish. Indexes regenerate automatically.\n- ${issues.slice(0, 15).join("\n- ")}`);
    process.exit(2);
  }
  process.exit(0);
}
