/** @file Staff queue (US-10.4, demo persona): reports for one team, grouped by building, sorted by +1, with a status dropdown. */
import { useCallback, useEffect, useState } from "react";
import { staffTeam, type Role } from "../../auth/types";
import { TEAMS, type Team } from "../../lib/issue-routing";
import { STATUS_LABEL, reportsService, type IssueReport, type ReportStatus } from "../../lib/reports";
import ReportSummary from "./ReportSummary";

const STATUSES = Object.keys(STATUS_LABEL) as ReportStatus[];

/** Groups reports by building (most +1s first, in groups and inside each group). */
function groupByBuilding(reports: IssueReport[]): { name: string; reports: IssueReport[] }[] {
  const groups = new Map<string, IssueReport[]>();
  for (const report of reports) {
    const name = report.location.buildingName ?? report.location.buildingId ?? "Outdoors (map pin)";
    groups.set(name, [...(groups.get(name) ?? []), report]);
  }
  const top = (list: IssueReport[]) => Math.max(...list.map((r) => r.plusOnes));
  return [...groups.entries()]
    .map(([name, list]) => ({ name, reports: list.sort((a, b) => b.plusOnes - a.plusOnes || a.createdAt.localeCompare(b.createdAt)) }))
    .sort((a, b) => top(b.reports) - top(a.reports) || a.name.localeCompare(b.name));
}

/** Staff view of the report queue. Unlisted in the MVP: reached with ?panel=staff (optionally &team=IT). */
export default function StaffQueue({ role }: { role: Role }) {
  const own = staffTeam(role); // staff only work their own team; moderators see all
  const [team, setTeam] = useState<Team>(() => {
    if (own) return own;
    const wanted = new URLSearchParams(window.location.search).get("team")?.toLowerCase();
    return TEAMS.find((t) => t.toLowerCase() === wanted) ?? TEAMS[0];
  });
  const [reports, setReports] = useState<IssueReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (which: Team) => {
    try {
      setReports(await reportsService.listByTeam(which));
      setError(null);
    } catch {
      setError("Couldn't load the queue.");
    }
  }, []);

  useEffect(() => {
    setReports(null);
    void load(team);
  }, [team, load]);

  async function changeStatus(id: string, status: ReportStatus) {
    try {
      await reportsService.setStatus(id, status);
      await load(team);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the new status.");
    }
  }

  const groups = reports ? groupByBuilding(reports) : [];

  return (
    <div className="cims-report__body">
      <section className="cims-section">
        <p className="cims-tag cims-tag--alert cims-report__proto">
          <span aria-hidden="true">⚠</span> Demo queue: not connected to real GT systems
        </p>
        <p className="cims-muted cims-report__note">
          Reports are shared through the backend. Records tagged “Sample” are made-up examples.
        </p>
        <div className="cims-report__teams" role="group" aria-label="Team">
          {TEAMS.filter((t) => !own || t === own).map((t) => (
            <button key={t} type="button" className="cims-btn" aria-pressed={t === team} onClick={() => setTeam(t)}>
              {t === team && <span aria-hidden="true">✓ </span>}{t}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="cims-report__error" role="alert"><strong>Error:</strong> {error}</p>}
      {!reports && !error && <p className="cims-empty" role="status">Loading queue…</p>}
      {reports && groups.length === 0 && <p className="cims-empty" role="status">No reports routed to {team}.</p>}

      {groups.map((group) => (
        <section key={group.name} className="cims-section">
          <h2 className="cims-section__title cims-caps">
            {group.name}
            <span className="cims-badge" aria-label={`${group.reports.length} reports`}>{group.reports.length}</span>
          </h2>
          <ul className="cims-report__list cims-report__list--queue">
            {group.reports.map((report) => (
              <li key={report.id}>
                <p className="cims-report__count">
                  <span className="cims-mono">+{report.plusOnes}</span>
                  <span className="cims-muted">me too</span>
                </p>
                <ReportSummary report={report} showLocation={false} />
                <label className="cims-report__label">
                  <span>Status</span>
                  <select
                    className="cims-report__control"
                    value={report.status}
                    onChange={(e) => changeStatus(report.id, e.target.value as ReportStatus)}
                  >
                    {STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
