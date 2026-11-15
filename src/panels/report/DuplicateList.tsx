/** @file Step 2 of the report flow: open reports for the same place and category, with "Me too +1". */
import type { IssueReport } from "../../lib/reports";
import ReportSummary from "./ReportSummary";

/** Props for the "Already reported?" step. */
export interface DuplicateListProps {
  reports: IssueReport[];
  busy: boolean;
  onPlusOne: (id: string) => void;
  onView: (id: string) => void;
  onSubmitNew: () => void;
  onBack: () => void;
}

/** Lists matching open reports so the user can add a +1 instead of filing a duplicate (PRD US-10.2). */
export default function DuplicateList({ reports, busy, onPlusOne, onView, onSubmitNew, onBack }: DuplicateListProps) {
  return (
    <div className="cims-report__form">
      <section className="cims-section">
        <h2 className="cims-section__title cims-caps">Already reported?</h2>
        <p className="cims-muted">
          {reports.length === 1 ? "There is 1 open report" : `There are ${reports.length} open reports`} for this
          place and category. If one is your problem, add a “Me too”. If yours is different, submit a new one.
        </p>
        <ul className="cims-report__list">
          {reports.map((report) => (
            <li key={report.id}>
              <ReportSummary report={report} />
              <div className="cims-actions">
                <button
                  type="button"
                  className="cims-btn cims-btn--primary"
                  disabled={busy || report.viewerPlusOned}
                  onClick={() => onPlusOne(report.id)}
                >
                  {report.viewerPlusOned ? "✓ Added" : "Me too +1"}
                </button>
                <button type="button" className="cims-btn" onClick={() => onView(report.id)}>
                  View status
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="cims-report__footer cims-actions">
        <button type="button" className="cims-btn" onClick={onBack}>Back</button>
        <button type="button" className="cims-btn" disabled={busy} onClick={onSubmitNew}>
          Submit new
        </button>
      </div>
    </div>
  );
}
