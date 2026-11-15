/** @file Session context over Supabase demo accounts with cancellable sign-in and one pending action to resume. */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { supabaseAuthAdapter } from "../auth/supabaseAdapter";
import type { AuthAdapter, Persona, Session } from "../auth/types";

type AuthApi = {
  session: Session | null;
  signIn: (persona: Persona) => Promise<void>;
  signOut: () => Promise<void>;
  requireAuth: (action: () => void) => void;
  dialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
};
const AuthContext = createContext<AuthApi | null>(null);

/** Provides demo identity and resumes a requested action after the success screen. */
export function AuthProvider({ children, adapter = supabaseAuthAdapter }: { children: ReactNode; adapter?: AuthAdapter }) {
  const [session, setSession] = useState(() => adapter.restore());
  const [dialogOpen, setDialogOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const attempt = useRef(0);
  const closeDialog = useCallback(() => {
    attempt.current++;
    pending.current = null;
    setDialogOpen(false);
  }, []);
  const api = useMemo<AuthApi>(() => ({
    session,
    dialogOpen,
    closeDialog,
    openDialog: () => { pending.current = null; setDialogOpen(true); },
    requireAuth: (action) => {
      if (session) action();
      else { pending.current = action; setDialogOpen(true); }
    },
    signIn: async (persona) => {
      const id = ++attempt.current;
      const next = await adapter.signIn(persona);
      if (id !== attempt.current) {
        // Cancelled while the adapter was waiting. Do not restore that session later.
        if (adapter.restore()?.accountId === next.accountId) await adapter.signOut();
        return;
      }
      setSession(next);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      if (id !== attempt.current) return;
      const action = pending.current;
      pending.current = null;
      setDialogOpen(false);
      action?.();
    },
    signOut: async () => {
      closeDialog();
      setSession(null);
      await adapter.signOut();
    },
  }), [session, dialogOpen, closeDialog, adapter]);
  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

/** Reads the demo session and sign-in controls inside AuthProvider. */
export function useAuth(): AuthApi {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
