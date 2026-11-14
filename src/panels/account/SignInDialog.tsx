/** @file Accessible sign-in theater with a fake redirect, fictional accounts and community rules. */
import { useEffect, useRef, useState } from "react";
import { DEMO_PERSONAS } from "../../auth/mockAdapter";
import { useAuth } from "../../state/auth";
import "./account.css";

const RULES_KEY = "cims.rules.v1";

/** Mounts a fresh theater flow whenever the demo sign-in dialog opens. */
export default function SignInDialog() {
  const { dialogOpen } = useAuth();
  return dialogOpen ? <SignInFlow /> : null;
}

function SignInFlow() {
  const { session, signIn, closeDialog } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<"intro" | "redirect" | "choose" | "signing">("intro");
  const [accepted, setAccepted] = useState(() => {
    try { return localStorage.getItem(RULES_KEY) === "accepted"; } catch { return false; }
  });
  const [previouslyAccepted] = useState(accepted);
  const [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      const target = previous?.isConnected ? previous : document.querySelector<HTMLElement>("[data-account-trigger]");
      target?.focus();
    };
  }, []);
  useEffect(() => {
    if (step !== "redirect") return;
    const timer = window.setTimeout(() => setStep("choose"), 1200);
    return () => window.clearTimeout(timer);
  }, [step]);
  useEffect(() => { dialog.current?.focus(); }, [step]);

  return (
    <dialog ref={dialog} className="account-dialog cims" role="dialog" aria-modal="true" aria-labelledby="sign-in-title"
      aria-describedby="sign-in-disclaimer" tabIndex={-1} onCancel={(event) => { event.preventDefault(); closeDialog(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
      }}>
      <header className="cims-header account-dialog__header">
        <h2 id="sign-in-title">Sign in with Georgia Tech</h2>
        <span className="cims-status">DEMO</span>
      </header>
      <div className="account-dialog__body">
        {step === "intro" && <>
          <p>Try a fictional Georgia Tech account. Roles change demo labels only.</p>
          <button type="button" className="cims-btn cims-btn--primary cims-btn--block" onClick={() => setStep("redirect")}>Continue with Georgia Tech login</button>
        </>}
        {step === "redirect" && <div className="account-dialog__progress" role="status">
          <span className="account-spinner" aria-hidden="true" />
          <p>Contacting Georgia Tech login...</p>
          <small className="cims-muted">DEMO simulation. No connection is made.</small>
        </div>}
        {step === "choose" && <>
          <h3 className="cims-caps">Choose a demo account</h3>
          <p className="cims-muted">DEMO roles do not grant permissions.</p>
          {!previouslyAccepted && <div className="account-rules">
            <p>Community rules: be respectful, post accurate information and avoid sharing personal details.</p>
            <label><input type="checkbox" className="cims-check" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
              <span>I agree to the community rules for this demo.</span></label>
          </div>}
          <div className="account-personas">
            {DEMO_PERSONAS.map((persona) => <button key={persona.role} type="button" className="cims-btn account-persona" disabled={!accepted}
              onClick={async () => {
                if (!accepted) return;
                setError("");
                setStep("signing");
                try {
                  try { localStorage.setItem(RULES_KEY, "accepted"); } catch { /* Ask again next time if storage is blocked. */ }
                  await signIn(persona);
                } catch {
                  setError("Demo sign-in could not finish. Please try again.");
                  setStep("choose");
                }
              }}>
              <strong>{persona.displayName}</strong><span>{persona.description}</span>
            </button>)}
          </div>
          {error && <p role="alert">{error}</p>}
        </>}
        {step === "signing" && <div className="account-dialog__progress" role="status">
          {!session && <span className="account-spinner" aria-hidden="true" />}
          <p>{session ? `Signed in as ${session.displayName}` : "Preparing your DEMO account..."}</p>
          <small className="cims-muted">DEMO only. Nothing is authenticated.</small>
        </div>}
      </div>
      <footer className="account-dialog__footer">
        <p id="sign-in-disclaimer">Demo sign-in. No real authentication. Never enter GT credentials.</p>
        <button type="button" className="cims-btn" onClick={closeDialog}>Cancel</button>
      </footer>
    </dialog>
  );
}
