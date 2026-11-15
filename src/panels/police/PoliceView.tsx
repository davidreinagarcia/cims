/** @file GTPD console (full screen): draw the danger circle on a 2D map, launch and end alarms, and work the queue of citizen police tips, all live. */
import { useEffect, useRef, useState } from "react";
import {
  ALERT_KINDS, AlertsError, endAlert, launchAlert, setPoliceKey, useAlerts, type AlertKind, type CampusAlert, type PoliceTip,
} from "../../lib/alerts";
import PoliceMap, { type Draft } from "./PoliceMap";
import TipsQueue from "./TipsQueue";
import "./police.css";

/** Props for the console. */
export interface PoliceViewProps { onClose: () => void }

/** Asks for the GTPD access code (remote mode only) and explains local demo mode. */
function AccessGate({ rejected }: { rejected: boolean }) {
  const [code, setCode] = useState("");
  return (
    <form className="police__gate" onSubmit={(e) => { e.preventDefault(); setPoliceKey(code); }}>
      <h2 className="cims-caps">GTPD access</h2>
      <p>Enter the access code to launch alarms and read citizen reports.</p>
      <label className="police__label">
        <span>Access code</span>
        <input className="police__control" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
      </label>
      {rejected && <p className="police__error" role="alert">That code was not accepted.</p>}
      <button type="submit" className="cims-btn cims-btn--primary" disabled={!code.trim()}>Open console</button>
    </form>
  );
}

/** Launch form: kind, wording, drill flag and a two-step confirm, because this reaches everyone on campus. */
function LaunchForm({ draft, drawing, onDraw, onRadius, onClear, onLaunched }: {
  draft: Draft | null; drawing: boolean; onDraw: () => void; onRadius: (m: number) => void; onClear: () => void; onLaunched: () => void;
}) {
  const [kind, setKind] = useState<AlertKind>("shelter-in-place");
  const [title, setTitle] = useState(ALERT_KINDS[1].label);
  const [message, setMessage] = useState(ALERT_KINDS[1].message);
  const [test, setTest] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (id: AlertKind) => {
    const item = ALERT_KINDS.find((k) => k.id === id)!;
    setKind(id); setTitle(item.label); setMessage(item.message); setConfirm(false);
  };
  const launch = async () => {
    if (!draft) return;
    setBusy(true); setError(null);
    try {
      await launchAlert({ kind, title: title.trim() || "Police alert", message: message.trim(), center: draft.center, radiusM: draft.radiusM, test });
      setConfirm(false); onLaunched();
    } catch (e) {
      setError(e instanceof AlertsError || e instanceof Error ? e.message : "Could not launch.");
    } finally { setBusy(false); }
  };

  return (
    <section className="police__section" aria-labelledby="police-launch">
      <h2 id="police-launch" className="cims-section__title cims-caps">New alarm</h2>
      <div className="police__chips" role="radiogroup" aria-label="Kind of alarm">
        {ALERT_KINDS.map((k) => (
          <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={`police__chip${kind === k.id ? " is-on" : ""}`} onClick={() => pick(k.id)}>{k.label}</button>
        ))}
      </div>
      <label className="police__label"><span>Headline</span>
        <input className="police__control" value={title} maxLength={80} onChange={(e) => { setTitle(e.target.value); setConfirm(false); }} /></label>
      <label className="police__label"><span>Instructions for the public</span>
        <textarea className="police__control" rows={3} value={message} maxLength={500} onChange={(e) => { setMessage(e.target.value); setConfirm(false); }} /></label>

      <div className="police__area">
        <button type="button" className={`cims-btn${drawing ? " cims-btn--primary" : ""}`} onClick={onDraw} aria-pressed={drawing}>
          {drawing ? "Drag on the map…" : draft ? "Redraw area" : "Draw area on map"}
        </button>
        {draft && <button type="button" className="cims-btn" onClick={onClear}>Clear</button>}
      </div>
      {draft ? (
        <label className="police__label"><span>Radius: {draft.radiusM} m</span>
          <input type="range" min={20} max={1500} step={5} value={Math.min(draft.radiusM, 1500)} onChange={(e) => { onRadius(Number(e.target.value)); setConfirm(false); }} /></label>
      ) : (
        <p className="cims-muted police__hint">Press "Draw area", then press on the map where it is happening and drag outward to size the circle.</p>
      )}
      <label className="police__check"><input type="checkbox" checked={test} onChange={(e) => setTest(e.target.checked)} /> Drill: label it TEST</label>

      {error && <p className="police__error" role="alert">{error}</p>}
      {confirm ? (
        <div className="police__confirm" role="group" aria-label="Confirm launch">
          <p><strong>{test ? "Send this TEST to everyone on campus?" : "This goes to everyone on campus right now."}</strong></p>
          <button type="button" className="cims-btn police__launch" disabled={busy} onClick={launch}>{busy ? "Launching…" : "Yes, launch alarm"}</button>
          <button type="button" className="cims-btn" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      ) : (
        <button type="button" className="cims-btn police__launch" disabled={!draft || !title.trim()} onClick={() => setConfirm(true)}>Launch alarm</button>
      )}
    </section>
  );
}

/** The live alarms with Show and End. */
function ActiveAlarms({ alerts, onShow }: { alerts: CampusAlert[]; onShow: (a: CampusAlert) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const end = async (id: string) => {
    setBusyId(id); setError(null);
    try { await endAlert(id); } catch (e) { setError(e instanceof Error ? e.message : "Could not end the alarm."); } finally { setBusyId(null); }
  };
  return (
    <section className="police__section" aria-labelledby="police-active">
      <h2 id="police-active" className="cims-section__title cims-caps">Active alarms ({alerts.length})</h2>
      {error && <p className="police__error" role="alert">{error}</p>}
      {alerts.length === 0 ? <p className="cims-muted">No alarm is running.</p> : (
        <ul className="police__alarms">
          {alerts.map((a) => (
            <li key={a.id} className="police-alarm">
              <div>
                <strong>{a.test ? "TEST · " : ""}{a.title}</strong>
                <span className="cims-muted"> · {a.radiusM} m · since {new Date(a.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
              </div>
              <div className="police__row">
                <button type="button" className="cims-btn cims-btn--small" onClick={() => onShow(a)}>Show</button>
                <button type="button" className="cims-btn cims-btn--small police__end" disabled={busyId === a.id} onClick={() => end(a.id)}>
                  {busyId === a.id ? "Ending…" : "End alarm"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Full-screen console, opened from the home screen (and by ?view=police). */
export default function PoliceView({ onClose }: PoliceViewProps) {
  const state = useAlerts();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [selectedTipId, setSelectedTipId] = useState<string | null>(null);
  const [focus, setFocus] = useState<CampusAlert | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    root.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { if (drawing) setDrawing(false); else onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing, onClose]);

  const authorized = state.mode === "local" || state.police;
  const active = state.alerts.filter((a) => a.status === "active");
  const tips: PoliceTip[] = authorized ? state.tips : [];
  const newCount = tips.filter((t) => t.status === "new").length;

  return (
    <div className="police" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="GTPD alert console">
      <header className="police__bar">
        <h1 className="police__title">GTPD alert console</h1>
        <span className={`police__status police__status--${state.status}`} role="status">
          {state.mode === "local" ? "Demo mode · this browser only" : state.status === "live" ? "Live" : state.status === "offline" ? "Reconnecting…" : "Connecting…"}
        </span>
        <button type="button" className="cims-btn" onClick={onClose}>Back to map</button>
      </header>
      <div className="police__body">
        <aside className="police__side">
          {!authorized ? (
            state.status === "connecting" ? <p className="cims-empty" role="status">Connecting…</p> : <AccessGate rejected={state.keyRejected} />
          ) : (
            <>
              <LaunchForm
                draft={draft} drawing={drawing}
                onDraw={() => setDrawing((d) => !d)}
                onRadius={(radiusM) => setDraft((d) => d && { ...d, radiusM })}
                onClear={() => { setDraft(null); setDrawing(false); }}
                onLaunched={() => { setDraft(null); setDrawing(false); }}
              />
              <ActiveAlarms alerts={active} onShow={(a) => setFocus({ ...a })} />
              <section className="police__section" aria-labelledby="police-tips">
                <h2 id="police-tips" className="cims-section__title cims-caps">Citizen reports {newCount > 0 && <span className="cims-tag cims-tag--alert">{newCount} new</span>}</h2>
                <TipsQueue
                  tips={tips} selectedId={selectedTipId} onSelect={setSelectedTipId}
                  onDrawHere={(tip) => { setDraft({ center: tip.point, radiusM: 100 }); setDrawing(false); setSelectedTipId(tip.id); }}
                />
              </section>
            </>
          )}
        </aside>
        <PoliceMap
          draft={draft} drawing={drawing} tips={tips} selectedTipId={selectedTipId} focus={focus}
          onDraft={setDraft} onDrawEnd={() => setDrawing(false)} onSelectTip={setSelectedTipId}
        />
      </div>
    </div>
  );
}
