#!/usr/bin/env node
/** @file Supabase migration tool: `check` (offline lint, anyone), `status`/`apply`/`baseline`/`accounts` (need the management token, so only David's agent on Alexandria). */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dir = join(root, "supabase/migrations");
const { ref } = JSON.parse(readFileSync(join(root, "supabase/project.json"), "utf8"));
const [cmd = "help", ...rest] = process.argv.slice(2);
const flag = (f) => rest.includes(f);
const files = () => readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

// Anything that can lose data or break running code. Allowed only with --allow-destructive.
const DESTRUCTIVE = /\b(drop\s+(table|column|schema|policy|function|trigger|index|view|type)|truncate|delete\s+from|alter\s+table\s+\S+\s+(drop|rename)|alter\s+\S+\s+rename\s+to)\b/i;
const stripComments = (sql) => sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

function lint() {
  const problems = [];
  const names = files();
  for (const f of names) {
    if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(f)) problems.push(`${f}: name must be <YYYYMMDDHHMMSS>_<snake_case>.sql`);
    const sql = readFileSync(join(dir, f), "utf8");
    const waived = /^--\s*allow-destructive:\s*\S+/m.test(sql); // a reasoned waiver in the file itself; David reviews it in the PR
    const bad = waived ? null : stripComments(sql).match(DESTRUCTIVE);
    if (bad) problems.push(`${f}: destructive statement "${bad[0]}" (add a reasoned "-- allow-destructive: <why>" line and flag it in the PR for David)`);
    if (/service_role|sb_secret|sbp_/i.test(sql)) problems.push(`${f}: looks like it contains a secret`);
  }
  return problems;
}

function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN_CIMS) return process.env.SUPABASE_ACCESS_TOKEN_CIMS;
  const p = join(homedir(), ".claude/secrets/cims_supabase.env");
  if (existsSync(p)) {
    const m = readFileSync(p, "utf8").match(/^SUPABASE_ACCESS_TOKEN_CIMS=(.+)$/m);
    if (m) return m[1].trim();
  }
  console.error("No management token. Only David's agent on Alexandria has it: ask David to apply your migration (see docs/SUPABASE.md).");
  process.exit(2);
}
const api = async (path, init = {}) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, {
    ...init, headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
};
const sql = (query) => api("/database/query", { method: "POST", body: JSON.stringify({ query }) });
const ensureTable = () => sql("create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now()); alter table public.schema_migrations enable row level security;");
const applied = async () => { await ensureTable(); return new Set((await sql("select name from public.schema_migrations")).map((r) => r.name)); };

async function main() {
  if (cmd === "check") {
    const problems = lint();
    if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
    console.log(`ok: ${files().length} migrations, names valid, nothing destructive`);
  } else if (cmd === "status") {
    const done = await applied();
    for (const f of files()) console.log(`${done.has(f) ? "applied " : "PENDING "} ${f}`);
  } else if (cmd === "baseline") {
    const done = await applied();
    const todo = files().filter((f) => !done.has(f));
    for (const f of todo) await sql(`insert into public.schema_migrations (name) values ('${f}') on conflict do nothing`);
    console.log(`marked ${todo.length} migration(s) as already applied`);
  } else if (cmd === "apply") {
    const only = rest.find((a) => !a.startsWith("--"));
    const problems = lint().filter((p) => !(flag("--allow-destructive") && p.includes("destructive")));
    if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
    const done = await applied();
    const todo = files().filter((f) => !done.has(f) && (!only || f === basename(only)));
    if (!todo.length) { console.log("nothing pending"); return; }
    for (const f of todo) {
      // One transaction per file (the management API runs a whole query atomically): it applies fully or not at all.
      await sql(readFileSync(join(dir, f), "utf8") + `\n;insert into public.schema_migrations (name) values ('${f}');`);
      console.log(`applied ${f}`);
    }
  } else if (cmd === "accounts") {
    // Creates or updates the demo users listed in src/auth/accounts.json (idempotent).
    const keys = await api("/api-keys");
    const sr = keys.find((k) => k.name === "service_role").api_key;
    const base = `https://${ref}.supabase.co/auth/v1/admin/users`;
    const h = { apikey: sr, Authorization: `Bearer ${sr}`, "Content-Type": "application/json" };
    const accounts = JSON.parse(readFileSync(join(root, "src/auth/accounts.json"), "utf8"));
    const password = readFileSync(join(root, "src/auth/accounts.ts"), "utf8").match(/DEMO_PASSWORD = "([^"]+)"/)[1];
    const existing = (await (await fetch(`${base}?per_page=200`, { headers: h })).json()).users;
    for (const a of accounts) {
      const app_metadata = { role: a.role, display_name: a.displayName, ...(a.team ? { team: a.team } : {}) };
      const found = existing.find((u) => u.email === a.email);
      const res = await fetch(found ? `${base}/${found.id}` : base, {
        method: found ? "PUT" : "POST", headers: h,
        body: JSON.stringify({ email: a.email, password, email_confirm: true, app_metadata, user_metadata: { display_name: a.displayName } }),
      });
      console.log(`${found ? "updated" : "created"} ${a.email} (${a.role}) ${res.ok ? "" : "FAILED " + res.status}`);
    }
  } else {
    console.log("usage: node scripts/db.mjs check | status | apply [file] [--allow-destructive] | baseline | accounts");
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
