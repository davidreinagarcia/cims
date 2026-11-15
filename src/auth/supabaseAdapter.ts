/** @file Sign-in adapter on Supabase Auth: picks one of the pre-created demo accounts; falls back to the offline mock if the backend is down. */
import { currentAccount, signInWithPassword, signOutSupabase, BackendDown } from "../lib/supabase";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./accounts";
import { mockAdapter } from "./mockAdapter";
import type { AuthAdapter, Persona, Session } from "./types";

/** Real Supabase sessions for the demo accounts, so every row a person writes belongs to a real account with a server-enforced role. */
export const supabaseAuthAdapter: AuthAdapter = {
  async signIn(persona: Persona) {
    try {
      const auth = await signInWithPassword(persona.email, DEMO_PASSWORD);
      const session: Session = { accountId: auth.user.id, displayName: persona.displayName, role: persona.role, provider: "supabase" };
      return session;
    } catch (e) {
      if (!(e instanceof BackendDown)) throw e;
      return mockAdapter.signIn(persona); // offline demo: roles are only labels
    }
  },
  async signOut() {
    signOutSupabase();
    await mockAdapter.signOut();
  },
  restore() {
    const account = currentAccount();
    const persona = account && DEMO_ACCOUNTS.find((p) => p.email === account.email);
    if (persona && account) return { accountId: account.id, displayName: persona.displayName, role: persona.role, provider: "supabase" };
    return mockAdapter.restore();
  },
};
