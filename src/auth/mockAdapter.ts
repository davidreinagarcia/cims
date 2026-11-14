/** @file Fictional demo accounts and best-effort local session storage, without authentication. */
import type { AuthAdapter, Persona, Session } from "./types";

const SESSION_KEY = "cims.session.v1";

/** Demo role descriptions describe possible future capabilities, never enforced permissions. */
export const DEMO_PERSONAS: readonly Persona[] = [
  { displayName: "Demo Student", role: "student", description: "Would post reports, add +1 votes and share fullness updates." },
  { displayName: "Demo Club Officer", role: "officer", description: "Would share club events and organisation updates." },
  { displayName: "Demo Facilities Staff", role: "staff", description: "Would update maintenance reports and repair progress." },
  { displayName: "Demo Moderator", role: "moderator", description: "Would review community posts and handle flagged content." },
];

/** Pretends to sign in with fictional accounts; storage failure never blocks the demo. */
export const mockAdapter: AuthAdapter = {
  async signIn(persona) {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    const session: Session = {
      accountId: `demo-${crypto.randomUUID()}`,
      displayName: persona.displayName,
      role: persona.role,
      provider: "mock",
    };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* Memory-only demo. */ }
    return session;
  },
  async signOut() {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* Memory-only demo. */ }
  },
  restore() {
    try {
      const value = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
      if (value?.provider === "mock" && typeof value.accountId === "string" && value.accountId.startsWith("demo-") &&
        DEMO_PERSONAS.some((persona) => persona.role === value.role && persona.displayName === value.displayName)) {
        return { accountId: value.accountId, displayName: value.displayName, role: value.role, provider: "mock" };
      }
    } catch { /* Missing, malformed or unavailable storage means signed out. */ }
    return null;
  },
};
