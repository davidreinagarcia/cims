/** @file Replaceable sign-in contract for the front-end DEMO. */

/** Demo roles change labels only and grant no permissions. */
export type Role = "student" | "officer" | "staff" | "moderator";

/** Fictional account selected on this device, with no authentication. */
export interface Session {
  accountId: string;
  displayName: string;
  role: Role;
  provider: "mock";
}

/** Fictional identity offered by the demo account picker. */
export interface Persona {
  displayName: string;
  role: Role;
  description: string;
}

/** Adapter boundary keeps sign-in implementation out of screens. */
export interface AuthAdapter {
  signIn(persona: Persona): Promise<Session>;
  signOut(): Promise<void>;
  restore(): Session | null;
}
