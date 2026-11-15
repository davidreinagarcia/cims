/** @file Step 3 of the report flow: confirmation, status timeline (Open → Routed → In progress → Resolved) and shareable link. */
import { useEffect, useRef, useState } from "react";
import { requestBookingsView } from "../../indoor/handoff";
import { STATUS_FLOW, STATUS_LABEL, reportsService, type IssueReport } from "../../lib/reports";
import ReportSummary, { formatWhen } from "./ReportSummary";

/** Props for the status page. */
export interface ReportStatusViewProps {
  reportId: string;
  /** True right after this client filed the report (shows the confirmation wording). */
  justFiled: boolean;
  onAnother: () => void;
}

/** Status page of one report (PRD US-10.3), always carrying the "Prototype: not sent" label. */
export default function ReportStatusView({ reportId, justFiled, onAnother }: ReportStatusViewProps) {
  const [report, setReport] = useState<IssueReport | null | undefined>(undefined);
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    setReport(undefined);
    reportsService.get(reportId).then((r) => live && setReport(r), () => live && setReport(null));
    return () => { live = false; };
  }, [reportId]);

  if (report === undefined) return <p className="cims-empty" role="status">Loading report…</p>;
  if (report === null) {
    return (
      <div className="cims-empty">
        <p role="status">
          Report <span className="cims-mono">{reportId}</span> isn't on this device. Prototype reports are stored only
          in the browser that filed them.
        </p>
        <button type="button" className="cims-btn" onClick={onAnother}>Report an issue</button>
      </div>
    );
  }

  const link = `${window.location.origin}${window.location.pathname}?panel=report&report=${encodeURIComponent(report.id)}`;
  const current = STATUS_FLOW.indexOf(report.status);
  const whenFor = (status: string) => [...report.history].reverse().find((e) => e.status === status)?.at;
  const duplicate = report.status === "duplicate";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied("yes");
    } catch {
      // Clipboard API needs HTTPS + permission; fall back to copying the selected field.
      linkRef.current?.select();
      setCopied(document.execCommand("copy") ? "yes" : "failed");
    }
  }

  return (
    <div className="cims-report__form">
      <section className="cims-section">
        <h2 className="cims-section__title cims-caps">{justFiled ? "Report received" : "Report status"}</h2>
        <p className="cims-tag cims-tag--alert cims-report__proto">
          <span aria-hidden="true">⚠</span> Prototype: not sent to Facilities/IT yet
        </p>
        <ReportSummary report={report} />
        {report.photoDataUrl && (
          <div className="cims-report__photo"><img src={report.photoDataUrl} alt="Photo attached to this report" /></div>
        )}
        <p><span className="cims-tag">Routes to: {report.openToAll ? "All teams (waiting for one to claim it)" : report.team}</span></p>
      </section>

      <section className="cims-section">
        <h2 className="cims-section__title cims-caps">Status</h2>
        <ol className="cims-report__timeline">
          {STATUS_FLOW.map((status, i) => {
            const at = whenFor(status);
            const state = duplicate ? (at ? "done" : "skipped") : i < current ? "done" : i === current ? "current" : "pending";
            return (
              <li key={status} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                <span className="cims-report__dot" aria-hidden="true">{state === "done" ? "✓" : ""}</span>
                <span className="cims-caps">{STATUS_LABEL[status]}</span>
                <span className="cims-mono cims-muted">
                  {state === "current" && "Current · "}
                  {state === "pending" ? "Pending" : state === "skipped" ? "Skipped" : at ? formatWhen(at) : "Done"}
                </span>
              </li>
            );
          })}
          {duplicate && (
            <li data-state="current" aria-current="step">
              <span className="cims-report__dot" aria-hidden="true" />
              <span className="cims-caps">{STATUS_LABEL.duplicate}</span>
              <span className="cims-mono cims-muted">Current · {formatWhen(whenFor("duplicate") ?? report.createdAt)}</span>
            </li>
          )}
        </ol>
      </section>

      <section className="cims-section">
        <h2 className="cims-section__title cims-caps">Status link</h2>
        <div className="cims-field">
          <input ref={linkRef} readOnly value={link} aria-label="Status link" onFocus={(e) => e.target.select()} />
        </div>
        <p className="cims-muted cims-report__note">Prototype: this link only opens in this browser.</p>
        <div className="cims-actions">
          <button type="button" className="cims-btn" onClick={copy}>Copy link</button>
          <button type="button" className="cims-btn cims-btn--primary" onClick={onAnother}>Report another</button>
          <button type="button" className="cims-btn" onClick={requestBookingsView}>Go back to bookings</button>
        </div>
        <p role="status" className="cims-report__note">
          {copied === "yes" && "✓ Link copied."}
          {copied === "failed" && "Couldn't copy automatically. Select the link above and copy it."}
        </p>
      </section>
    </div>
  );
}
