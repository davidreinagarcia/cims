/** @file "Open to all teams" strip: reports whose team is unknown, with a Claim button; the first team to claim takes it and the others stop seeing it. */
import { useState } from "react";
import type { Team } from "../../lib/issue-routing";
import { reportsService, type IssueReport } from "../../lib/reports";
import ReportSummary from "./ReportSummary";

/** Lists unclaimed reports for a team's dashboard; `onError` shows a rule rejection (e.g. someone claimed it first). */
export default function UnclaimedReports({ reports, team, className = "" }: { reports: IssueReport[]; team: Team | null; className?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  if (reports.length === 0) return null;
  const claim = async (id: string) => {
    if (!team) return;
    setBusy(id); setProblem(null);
    try { await reportsService.claim(id, team); } catch (e) { setProblem(e instanceof Error ? e.message : "Could not claim it."); } finally { setBusy(null); }
  };
  return (
    <section className={`unclaimed ${className}`} aria-label="Open to all teams">
      <h2 className="cims-section__title cims-caps">Unassigned · open to all teams ({reports.length})</h2>
      <p className="cims-muted">The reporter didn't know who handles these. Claim one to make it yours; the other teams stop seeing it.</p>
      {problem && <p className="police__error" role="alert">{problem}</p>}
      <ul className="unclaimed__list">
        {reports.map((r) => (
          <li key={r.id} className="unclaimed__item">
            <ReportSummary report={r} />
            <button type="button" className="cims-btn cims-btn--primary" disabled={!team || busy === r.id} onClick={() => claim(r.id)}>
              {busy === r.id ? "Claiming…" : team ? `Claim for ${team}` : "Team accounts only"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
