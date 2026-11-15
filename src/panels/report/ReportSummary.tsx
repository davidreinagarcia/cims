/** @file Shared summary block for one report: category, location, text, "Sample" label and +1 count. */
import { routeFor } from "../../lib/issue-routing";
import { STATUS_LABEL, type IssueReport } from "../../lib/reports";
import { locationParts } from "./location";

/** Formats an ISO timestamp for display in the viewer's locale. */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Category, place, description and tags of a report; used by the duplicates list, status page and staff queue. */
export default function ReportSummary({ report, showLocation = true }: { report: IssueReport; showLocation?: boolean }) {
  const parts = locationParts(report.location);
  return (
    <div className="cims-report__summary">
      <p className="cims-report__summary-title">
        <strong>{routeFor(report.category).label}</strong>
        {report.sample && <span className="cims-tag">Sample</span>}
        <span className="cims-tag">{STATUS_LABEL[report.status]}</span>
      </p>
      <p className="cims-breadcrumb">
        {(showLocation ? parts : parts.slice(1)).map((part, i) => <span key={i}>{part}</span>)}
      </p>
      {report.equipment && <p><span className="cims-muted">Equipment:</span> {report.equipment}</p>}
      {report.description && <p>{report.description}</p>}
      <p className="cims-mono cims-muted">
        {report.id} · {formatWhen(report.createdAt)} · +{report.plusOnes} me too
      </p>
    </div>
  );
}
