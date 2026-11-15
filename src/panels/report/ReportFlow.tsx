/** @file The 3-step report flow: details → "Already reported?" → status. Talks to ReportsService only. */
import { useEffect, useRef, useState } from "react";
import { reportsService, type IssueReport, type NewIssueReport, type ReportLocation } from "../../lib/reports";
import { useAuth } from "../../state/auth";
import DuplicateList from "./DuplicateList";
import ReportForm from "./ReportForm";
import ReportStatusView from "./ReportStatusView";
import type { Navigate } from "./index";

/** Props for the report flow. */
export interface ReportFlowProps {
  /** Prefilled location (building › floor › room, or an outdoor pin); null asks the user to pick a building. */
  location: ReportLocation | null;
  /** When set, the flow opens directly on that report's status (shareable link). */
  reportId: string | null;
  /** Updates the URL (status link, close). */
  navigate: Navigate;
}

const STEPS = ["Details", "Already reported?", "Status"];

/** Report-an-issue flow (PRD US-10.1 to US-10.3). Filing and "+1" need a signed-in demo account (F-21). */
export default function ReportFlow({ location, reportId, navigate }: ReportFlowProps) {
  const { session, requireAuth } = useAuth();
  const [draft, setDraft] = useState<NewIssueReport | null>(null);
  const [matches, setMatches] = useState<IssueReport[] | null>(null);
  const [justFiled, setJustFiled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const top = useRef<HTMLOListElement>(null);

  const step = reportId ? 2 : matches ? 1 : 0;
  const mounted = useRef(false);
  useEffect(() => {
    // Move focus to the top of the panel when the step changes, so keyboard and screen-reader users follow along.
    if (mounted.current) top.current?.focus();
    mounted.current = true;
  }, [step]);

  /** Runs a service call with shared busy/error handling. */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError("Something went wrong saving on this device. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const showStatus = (id: string) => {
    const params = new URLSearchParams({ panel: "report", report: id });
    navigate(params);
  };

  const submit = (input: NewIssueReport) =>
    run(async () => {
      const report = await reportsService.create(input);
      setJustFiled(true);
      showStatus(report.id);
    });

  // Every write goes through the F-21 sign-in gate: signed out, this opens the dialog and resumes after sign-in.
  const onContinue = (input: NewIssueReport) =>
    requireAuth(() =>
      run(async () => {
        setDraft(input);
        const near = await reportsService.listNear(input.location, input.category);
        if (near.length > 0) setMatches(near);
        else await submit(input);
      }),
    );

  const onPlusOne = (id: string) =>
    requireAuth(() =>
      run(async () => {
        const updated = await reportsService.plusOne(id);
        setMatches((list) => list?.map((r) => (r.id === id ? updated : r)) ?? null);
      }),
    );

  const startOver = () => {
    setDraft(null);
    setMatches(null);
    setJustFiled(false);
    navigate(new URLSearchParams({ panel: "report" }));
  };

  return (
    <div className="cims-report__body">
      <ol className="cims-report__steps" ref={top} tabIndex={-1} aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined}>
            <span className={`cims-badge${i === step ? " cims-badge--navy" : ""}`}>{i + 1}</span>
            <span className="cims-caps">{label}</span>
          </li>
        ))}
      </ol>

      {!session && (
        <p className="cims-muted cims-report__note" role="status">
          Signed out: you can fill this in, but filing or adding "Me too" asks for a demo sign-in first.
        </p>
      )}

      {error && (
        <p className="cims-report__error" role="alert">
          <strong>Error:</strong> {error}
        </p>
      )}

      {reportId ? (
        <ReportStatusView reportId={reportId} justFiled={justFiled} onAnother={startOver} />
      ) : matches && draft ? (
        <DuplicateList
          reports={matches}
          busy={busy}
          onPlusOne={onPlusOne}
          onView={showStatus}
          onSubmitNew={() => requireAuth(() => submit(draft))}
          onBack={() => setMatches(null)}
        />
      ) : (
        <ReportForm location={location} draft={draft} busy={busy} onContinue={onContinue} />
      )}
    </div>
  );
}
