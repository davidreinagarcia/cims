/** @file Maintenance dashboard (full screen): live Facilities reports split by crew (electrical, plumbing, HVAC...), counts per crew, status changes, new reports highlighted as they arrive. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../state/auth";
import { CREWS, crewOf, useLiveReports } from "../../lib/liveReports";
import { STATUS_LABEL, isActive, reportsService, type IssueReport, type ReportStatus } from "../../lib/reports";
import ReportSummary from "../report/ReportSummary";
import "./maintenance.css";

/** Props for the dashboard. */
export interface MaintenanceViewProps { onClose: () => void }

const ALL = "all";
const STATUSES = Object.keys(STATUS_LABEL) as ReportStatus[];
const staffRoles = ["maintenance", "moderator"];

/** Full-screen maintenance dashboard, opened from the menu (and by ?view=maintenance). */
export default function MaintenanceView({ onClose }: MaintenanceViewProps) {
  const { session, openDialog } = useAuth();
  const allowed = !!session && staffRoles.includes(session.role);
  const { reports, fresh, error } = useLiveReports("Facilities");
  const [crew, setCrew] = useState(ALL);
  const [showDone, setShowDone] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    root.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const counts = useMemo(() => {
    const c: Record<string, { open: number; total: number }> = { [ALL]: { open: 0, total: 0 } };
    for (const crewDef of CREWS) c[crewDef.id] = { open: 0, total: 0 };
    for (const r of reports ?? []) {
      for (const key of [ALL, crewOf(r.category)]) { c[key].total++; if (isActive(r.status)) c[key].open++; }
    }
    return c;
  }, [reports]);

  const visible = (reports ?? [])
    .filter((r) => (crew === ALL || crewOf(r.category) === crew) && (showDone || isActive(r.status)))
    .sort((a, b) => b.plusOnes - a.plusOnes || b.createdAt.localeCompare(a.createdAt));

  async function change(r: IssueReport, status: ReportStatus) {
    setProblem(null);
    try { await reportsService.setStatus(r.id, status); } catch (e) { setProblem(e instanceof Error ? e.message : "Could not save the status."); }
  }

  return (
    <div className="maint" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Maintenance dashboard">
      <header className="maint__bar">
        <h1 className="maint__title">Maintenance dashboard</h1>
        <span className="maint__live" role="status">{error ? "Offline" : reports ? "Live" : "Connecting…"}</span>
        <button type="button" className="cims-btn" onClick={onClose}>Back to map</button>
      </header>

      {!allowed ? (
        <div className="maint__gate">
          <h2 className="cims-caps">Maintenance access</h2>
          <p>Sign in with the maintenance demo account to see the Facilities queue.</p>
          <button type="button" className="cims-btn cims-btn--primary" onClick={openDialog}>Sign in</button>
        </div>
      ) : (
        <div className="maint__body">
          <nav className="maint__crews" aria-label="Crew">
            {[{ id: ALL, label: "All crews" }, ...CREWS].map((c) => (
              <button key={c.id} type="button" className="maint__crew" aria-pressed={crew === c.id} onClick={() => setCrew(c.id)}>
                <span className="maint__crew-name">{c.label}</span>
                <span className="maint__crew-count">{counts[c.id].open}</span>
                <span className="maint__crew-sub">open of {counts[c.id].total}</span>
              </button>
            ))}
          </nav>
          <main className="maint__list">
            <label className="maint__check"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show resolved and duplicates</label>
            {(error || problem) && <p className="police__error" role="alert">{error ?? problem}</p>}
            {!reports && !error && <p className="cims-empty" role="status">Loading queue…</p>}
            {reports && visible.length === 0 && <p className="cims-empty" role="status">Nothing to do here. New reports show up on their own.</p>}
            <ul className="maint__cards">
              {visible.map((r) => (
                <li key={r.id} className={`maint__card${fresh.has(r.id) ? " is-new" : ""}`}>
                  <p className="maint__meta">
                    {fresh.has(r.id) && <span className="cims-tag cims-tag--alert">NEW</span>}
                    <span className="cims-mono">+{r.plusOnes}</span>
                    <span className="cims-muted">{CREWS.find((c) => c.id === crewOf(r.category))?.label}</span>
                  </p>
                  <ReportSummary report={r} />
                  <label className="maint__status"><span>Status</span>
                    <select value={r.status} onChange={(e) => change(r, e.target.value as ReportStatus)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          </main>
        </div>
      )}
    </div>
  );
}
