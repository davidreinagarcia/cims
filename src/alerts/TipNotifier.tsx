/** @file Notification for GTPD accounts: a toast, a short beep and a tab-title badge when a new citizen tip arrives; works inside the console and on the plain map. */
import { useEffect, useRef, useState } from "react";
import { TIP_CATEGORIES, useAlerts, type PoliceTip } from "../lib/alerts";
import { useAuth } from "../state/auth";
import "./tip-notifier.css";

/** Plays a short two-tone beep (silently skipped if the browser blocks audio before any interaction). */
function beep() {
  try {
    const ctx = new AudioContext();
    [880, 660].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; g.gain.value = 0.08; o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.15);
    });
    setTimeout(() => void ctx.close(), 700);
  } catch { /* audio unavailable */ }
}

/** Props: `onOpen` is called with the tip when the toast is pressed (open the console / select the tip). */
export default function TipNotifier({ onOpen }: { onOpen: (tip: PoliceTip) => void }) {
  const { session } = useAuth();
  const { tips, police, mode } = useAlerts();
  const known = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<PoliceTip | null>(null);
  const waiting = tips.filter((t) => t.status === "new").length;
  const active = police && mode === "remote" && (session?.role === "police" || session?.role === "moderator");

  useEffect(() => {
    if (!active) { known.current = null; return; }
    if (!known.current) { known.current = new Set(tips.map((t) => t.id)); return; }
    const added = tips.filter((t) => !known.current!.has(t.id) && t.status === "new");
    known.current = new Set(tips.map((t) => t.id));
    if (added.length) { setToast(added[added.length - 1]); beep(); }
  }, [tips, active]);

  useEffect(() => {
    if (!active) return;
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = waiting ? `(${waiting}) ${base}` : base;
    return () => { document.title = base; };
  }, [waiting, active]);

  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 20_000); return () => window.clearTimeout(t); }, [toast]);

  if (!active || !toast) return null;
  const label = TIP_CATEGORIES.find((c) => c.id === toast.category)?.label ?? "Citizen report";
  return (
    <div className="tip-toast" role="alert">
      <button type="button" className="tip-toast__main" onClick={() => { onOpen(toast); setToast(null); }}>
        <strong>New citizen report{waiting > 1 ? ` (${waiting} waiting)` : ""}</strong>
        <span>{label}{toast.buildingName ? ` · near ${toast.buildingName}` : ""}</span>
      </button>
      <button type="button" className="tip-toast__x" aria-label="Dismiss" onClick={() => setToast(null)}>×</button>
    </div>
  );
}
