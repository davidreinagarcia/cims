/** @file Replaceable sign-in contract for the front-end DEMO. */

/** Pre-created account roles. Supabase enforces them server-side (JWT `app_metadata.role`, see supabase/migrations). */
export type Role = "student" | "officer" | "maintenance" | "it" | "police" | "moderator";

/** Roles that work the report queue. */
export const STAFF_ROLES: readonly Role[] = ["maintenance", "it", "police", "moderator"];

/** The report team a staff role works for; moderators see every team (null). */
export function staffTeam(role: Role): "Facilities" | "IT" | "Emergency" | null {
  return role === "maintenance" ? "Facilities" : role === "it" ? "IT" : role === "police" ? "Emergency" : null;
}

/** Fictional account selected on this device, with no authentication. */
export interface Session {
  accountId: string;
  displayName: string;
  role: Role;
  provider: "mock" | "supabase";
}

/** Fictional identity offered by the demo account picker. */
export interface Persona {
  /** Supabase login of the pre-created account. */
  email: string;
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
