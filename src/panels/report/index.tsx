/** @file Report panel entry: mounts the report flow (?panel=report) or the staff queue (?panel=staff) from the URL. */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../state/auth";
import "./report.css";
import ReportFlow from "./ReportFlow";
import StaffQueue from "./StaffQueue";
import { locationFromParams } from "./location";

/** Changes the query string without reloading; pass null to close the panel. */
export type Navigate = (params: URLSearchParams | null) => void;

/** Fired when something outside this module changes the URL (see openReportPanel); ReportPanelRoute re-reads it. */
const NAV_EVENT = "cims:report-nav";

/** Query params accepted by openReportPanel: panel plus a location (building/floor/room, or lng/lat). */
export type ReportPanelParams = Record<string, string>;

/**
 * Opens the report panel at a location, from any other lane's code (e.g. a building card's
 * "Report an issue" button): pushes the query string, then tells ReportPanelRoute to re-read it.
 */
export function openReportPanel(params: ReportPanelParams): void {
  const search = new URLSearchParams(params).toString();
  window.history.pushState(null, "", search ? `?${search}` : window.location.pathname);
  window.dispatchEvent(new Event(NAV_EVENT));
}

/** Renders nothing unless the URL has ?panel=report or ?panel=staff; the only piece App.tsx mounts. */
export default function ReportPanelRoute() {
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onChange = () => setSearch(window.location.search);
    window.addEventListener("popstate", onChange);
    window.addEventListener(NAV_EVENT, onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener(NAV_EVENT, onChange);
    };
  }, []);

  const navigate = useCallback<Navigate>((params) => {
    const query = params?.toString();
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
    setSearch(window.location.search);
  }, []);

  const params = new URLSearchParams(search);
  const panel = params.get("panel");
  if (panel !== "report" && panel !== "staff") return null;
  const staff = panel === "staff";

  return (
    <div
      className={`cims cims-grain cims-report${staff ? " cims-report--wide" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-label={staff ? "Staff report queue" : "Report an issue"}
    >
      <header className="cims-header cims-report__header">
        <p className="cims-header__title">CIMS</p>
        <span className="cims-header__sub">{staff ? "Staff queue" : "Report an issue"}</span>
        <button type="button" className="cims-btn cims-report__close" onClick={() => navigate(null)}>
          Close
        </button>
      </header>
      {staff ? (
        <StaffGate />
      ) : (
        <ReportFlow
          location={locationFromParams(params)}
          reportId={params.get("report")}
          navigate={navigate}
        />
      )}
    </div>
  );
}

/** Blocks the staff queue (US-10.4) behind the demo "staff" role; the URL itself stays unlisted. */
function StaffGate() {
  const { session, openDialog } = useAuth();
  if (session?.role === "staff") return <StaffQueue />;
  return (
    <div className="cims-report__body">
      <p className="cims-empty" role="status">
        Staff queue: sign in with the Demo Facilities Staff persona to continue.
      </p>
      <div className="cims-actions">
        <button type="button" className="cims-btn cims-btn--primary" onClick={openDialog}>
          Sign in
        </button>
      </div>
    </div>
  );
}
