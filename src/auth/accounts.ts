/** @file The pre-created demo accounts (one per role) that the login button offers. Source of truth: accounts.json (also read by scripts/db.mjs to create them in Supabase Auth). No sign-up flow exists. */
import type { Persona } from "./types";
import accounts from "./accounts.json";

/** Shared password of every demo account. Demo-grade on purpose: the roles protect a hackathon sandbox, not real data. */
export const DEMO_PASSWORD = "cims-demo-2026";

/** One account per role, in the order the login dialog lists them. */
export const DEMO_ACCOUNTS: readonly Persona[] = accounts as Persona[];
