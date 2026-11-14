/** @file Header account control with fictional identity labels and demo sign-out. */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../state/auth";
import "./account.css";

/** Shows sign-in or the selected demo persona with a small sign-out disclosure. */
export default function AccountChip() {
  const { session, openDialog, signOut } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [expanded]);
  return <div className="account-chip" ref={root} onKeyDown={(event) => {
    if (event.key === "Escape") { setExpanded(false); trigger.current?.focus(); }
  }}>
    {session ? <>
      <button type="button" data-account-trigger ref={trigger} className="cims-btn account-chip__trigger" aria-expanded={expanded} aria-controls="account-options"
        onClick={() => setExpanded(!expanded)}>
        <span className="cims-badge" aria-hidden="true">{session.displayName.charAt(0)}</span>
        <span className="account-chip__name">{session.displayName}</span>
        <span className="cims-status">DEMO</span>
      </button>
      {expanded && <div id="account-options" className="account-chip__menu">
        <p className="cims-muted">DEMO role: {session.role}</p>
        <button type="button" className="cims-btn cims-btn--block" onClick={() => { setExpanded(false); void signOut(); }}>Sign out</button>
      </div>}
    </> : <button type="button" data-account-trigger className="cims-btn account-chip__trigger" onClick={openDialog}>Sign in <span className="cims-status">DEMO</span></button>}
  </div>;
}
