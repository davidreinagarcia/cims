/** @file Maintenance dashboard (full screen): Reports tab with the live Facilities board in three colored columns (To do, In progress, Done), crew filter with live counts, claim box for reports open to all teams; Door stickers tab with the link/QR generator. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../state/auth";
import { CREWS, crewOf, useLiveReports } from "../../lib/liveReports";
import { routeFor } from "../../lib/issue-routing";
import { STATUS_LABEL, reportsService, type IssueReport, type ReportStatus } from "../../lib/reports";
import { locationParts } from "../report/location";
import DoorStickers from "./DoorStickers";
import UnclaimedReports from "../report/UnclaimedReports";
import "./maintenance.css";

/** Props for the dashboard. */
export interface MaintenanceViewProps { onClose: () => void }

const ALL = "all";
const staffRoles = ["maintenance", "moderator"];
type Column = "todo" | "doing" | "done";
const COLUMNS: { id: Column; label: string; hint: string }[] = [
  { id: "todo", label: "To do", hint: "Nobody has started" },
  { id: "doing", label: "In progress", hint: "Someone is on it" },
  { id: "done", label: "Done", hint: "Resolved or duplicate" },
];
const columnOf = (s: ReportStatus): Column => (s === "in_progress" ? "doing" : s === "resolved" || s === "duplicate" ? "done" : "todo");

/** "5 min", "3 h", "2 d" since an ISO time. */
function age(iso: string): { text: string; late: boolean } {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 3600) return { text: `${Math.max(1, Math.round(s / 60))} min`, late: false };
  if (s < 86_400) return { text: `${Math.round(s / 3600)} h`, late: false };
  return { text: `${Math.round(s / 86_400)} d`, late: true };
}

function Card({ r, fresh, onSet }: { r: IssueReport; fresh: boolean; onSet: (r: IssueReport, s: ReportStatus) => void }) {
  const crew = CREWS.find((c) => c.id === crewOf(r.category));
  const waiting = age(r.createdAt);
  const col = columnOf(r.status);
  return (
    <li className={`maint__card maint__card--${r.status}${fresh ? " is-new" : ""}`}>
      <p className="maint__row">
        <span className={`maint__pill maint__pill--${r.status}`}>{STATUS_LABEL[r.status]}</span>
        {fresh && <span className="maint__new">NEW</span>}
        <span className="maint__crewtag" style={{ "--crew": `var(--crew-${crew?.id})` } as React.CSSProperties}>{crew?.label}</span>
      </p>
      <h3 className="maint__what">{routeFor(r.category).label}</h3>
      <p className="maint__where">{locationParts(r.location).join(" › ")}</p>
      {r.equipment && <p className="maint__text"><span className="cims-muted">Equipment:</span> {r.equipment}</p>}
      {r.description && <p className="maint__text">{r.description}</p>}
      {r.photoDataUrl && <img className="maint__photo" src={r.photoDataUrl} alt="Attached to the report" />}
      <p className="maint__foot">
        <span title="People who reported or said me too" className="maint__people">{r.plusOnes} {r.plusOnes === 1 ? "person" : "people"}</span>
        <span className={waiting.late && col === "todo" ? "maint__late" : "cims-muted"}>{col === "done" ? "filed" : "waiting"} {waiting.text}{col === "done" ? " ago" : ""}</span>
        {r.sample && <span className="cims-tag">Sample</span>}
      </p>
      <div className="maint__actions">
        {col === "todo" && <><button type="button" className="cims-btn cims-btn--primary" onClick={() => onSet(r, "in_progress")}>Start work</button>
          <button type="button" className="cims-btn" onClick={() => onSet(r, "duplicate")}>Duplicate</button></>}
        {col === "doing" && <><button type="button" className="cims-btn maint__resolve" onClick={() => onSet(r, "resolved")}>Resolve</button>
          <button type="button" className="cims-btn" onClick={() => onSet(r, "routed")}>Back to to-do</button></>}
        {col === "done" && <button type="button" className="cims-btn" onClick={() => onSet(r, "open")}>Reopen</button>}
      </div>
    </li>
  );
}

/** Full-screen maintenance dashboard, opened from the menu (and by ?view=maintenance). */
export default function MaintenanceView({ onClose }: MaintenanceViewProps) {
  const { session, openDialog } = useAuth();
  const allowed = !!session && staffRoles.includes(session.role);
  const { reports, fresh, error } = useLiveReports("Facilities");
  const [tab, setTab] = useState<"reports" | "stickers">("reports");
  const [crew, setCrew] = useState(ALL);
  const [problem, setProblem] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    root.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mine = useMemo(() => (reports ?? []).filter((r) => !r.openToAll), [reports]);
  const unclaimed = useMemo(() => (reports ?? []).filter((r) => r.openToAll), [reports]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { [ALL]: 0 };
    for (const d of CREWS) c[d.id] = 0;
    for (const r of mine) if (columnOf(r.status) !== "done") { c[ALL]++; c[crewOf(r.category)]++; }
    return c;
  }, [mine]);
  const shown = mine.filter((r) => crew === ALL || crewOf(r.category) === crew);
  const byColumn = (id: Column) => shown.filter((r) => columnOf(r.status) === id)
    .sort((a, b) => (id === "done" ? b.createdAt.localeCompare(a.createdAt) : b.plusOnes - a.plusOnes || a.createdAt.localeCompare(b.createdAt)));

  async function change(r: IssueReport, status: ReportStatus) {
    setProblem(null);
    try { await reportsService.setStatus(r.id, status); } catch (e) { setProblem(e instanceof Error ? e.message : "Could not save the status."); }
  }

  return (
    <div className="maint" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Maintenance dashboard">
      <header className="maint__bar">
        <h1 className="maint__title">Maintenance dashboard</h1>
        <nav className="maint__tabs" aria-label="Section">
          <button type="button" aria-pressed={tab === "reports"} onClick={() => setTab("reports")}>Reports</button>
          <button type="button" aria-pressed={tab === "stickers"} onClick={() => setTab("stickers")}>Door stickers</button>
        </nav>
        <span className="maint__live" role="status">{error ? "Offline" : reports ? "Live" : "Connecting…"}</span>
        <button type="button" className="cims-btn" onClick={onClose}>Back to map</button>
      </header>

      {!allowed ? (
        <div className="maint__gate">
          <h2 className="cims-caps">Maintenance access</h2>
          <p>Sign in with the maintenance demo account to see the Facilities queue.</p>
          <button type="button" className="cims-btn cims-btn--primary" onClick={openDialog}>Sign in</button>
        </div>
      ) : tab === "stickers" ? (
        <div className="maint__stickers"><DoorStickers /></div>
      ) : (
        <div className="maint__body">
          <nav className="maint__crews" aria-label="Crew">
            <p className="maint__legend cims-caps">Crew</p>
            {[{ id: ALL, label: "All crews" }, ...CREWS].map((c) => (
              <button key={c.id} type="button" className="maint__crew" aria-pressed={crew === c.id} style={{ "--crew": c.id === ALL ? "var(--navy)" : `var(--crew-${c.id})` } as React.CSSProperties} onClick={() => setCrew(c.id)}>
                <span className="maint__crew-name">{c.label}</span>
                <span className="maint__crew-count" title="Not finished yet">{counts[c.id]}</span>
              </button>
            ))}
            <p className="maint__help cims-muted">Numbers are reports not finished yet. Card colors: <b className="maint__k maint__k--open">red</b> new, <b className="maint__k maint__k--routed">gold</b> assigned, <b className="maint__k maint__k--in_progress">blue</b> in progress, <b className="maint__k maint__k--resolved">green</b> done.</p>
          </nav>
          <main className="maint__main">
            {(error || problem) && <p className="police__error" role="alert">{error ?? problem}</p>}
            <UnclaimedReports reports={unclaimed} team="Facilities" />
            {!reports && !error && <p className="cims-empty" role="status">Loading queue…</p>}
            <div className="maint__board">
              {COLUMNS.map((col) => {
                const list = byColumn(col.id);
                return (
                  <section key={col.id} className={`maint__col maint__col--${col.id}`} aria-label={col.label}>
                    <h2 className="maint__colhead"><span>{col.label}</span><span className="maint__colcount">{list.length}</span></h2>
                    <p className="maint__colhint cims-muted">{col.hint}</p>
                    <ul className="maint__cards">
                      {list.slice(0, col.id === "done" ? 12 : 100).map((r) => <Card key={r.id} r={r} fresh={fresh.has(r.id)} onSet={change} />)}
                    </ul>
                    {list.length === 0 && <p className="maint__empty cims-muted">Nothing here.</p>}
                  </section>
                );
              })}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
