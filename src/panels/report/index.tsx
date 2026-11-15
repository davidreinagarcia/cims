/** @file Report panel root, mounted in Shell's "report" slot: the flow (prefilled from a selection or a shared link) or, at ?staff=1, the staff queue. */
import { useCallback, useEffect, useState } from "react";
import { STAFF_ROLES } from "../../auth/types";
import { useAuth } from "../../state/auth";
import { useSelection } from "../../state/selection";
import "./report.css";
import PoliceReportFlow from "./PoliceReportFlow";
import ReportFlow from "./ReportFlow";
import StaffQueue from "./StaffQueue";
import { locationForId, locationFromParams } from "./location";

/** Changes the query string without reloading, so a filed report's status link and the staff team filter stay shareable. */
export type Navigate = (params: URLSearchParams | null) => void;

/**
 * Mounts the 3-step report flow, or (unlisted, ?staff=1) the staff queue; the floating card / bottom
 * sheet around it already provides the "Report" title and close button (see src/shell/Shell.tsx).
 */
export default function ReportPanel({ onClose }: { onClose: () => void }) {
  const { selection } = useSelection();
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onChange = () => setSearch(window.location.search);
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);

  const navigate = useCallback<Navigate>((params) => {
    if (!params) { onClose(); return; }
    window.history.pushState(null, "", `?${params.toString()}`);
    setSearch(window.location.search);
  }, [onClose]);

  const params = new URLSearchParams(search);
  if (params.get("staff") === "1") return <StaffGate />;

  // Maintenance or police: one toggle on top, the kind lives in the URL (?kind=police) so status links are shareable.
  const police = params.get("kind") === "police";
  const choose = (kind: "maintenance" | "police") => {
    const next = new URLSearchParams({ panel: "report" });
    if (kind === "police") next.set("kind", "police");
    navigate(next);
  };
  const toggle = (
    <div className="cims-report__kind" role="group" aria-label="What are you reporting?">
      <button type="button" className="cims-btn" aria-pressed={!police} onClick={() => choose("maintenance")}>Maintenance</button>
      <button type="button" className="cims-btn cims-btn--police" aria-pressed={police} onClick={() => choose("police")}>Notify police</button>
    </div>
  );
  if (police) return <>{toggle}<div className="cims-report__body"><PoliceReportFlow tipId={params.get("tip")} navigate={navigate} /></div></>;

  // A place/building card's "Report an issue" selects { kind: "report", id }; a shared status link falls back to the URL.
  // The indoor room card adds the floor and room: "buildingId|floor|room".
  const [reportId, reportFloor, reportRoom] = selection?.kind === "report" ? selection.id.split("|") : [];
  const location = selection?.kind === "report" ? locationForId(reportId, reportFloor || null, reportRoom || null) : locationFromParams(params);
  return <>{toggle}<ReportFlow location={location} reportId={params.get("report")} navigate={navigate} /></>;
}

/** Blocks the staff queue (US-10.4) behind the staff accounts (maintenance, IT, police, moderator); the URL itself stays unlisted. */
function StaffGate() {
  const { session, openDialog } = useAuth();
  if (session && STAFF_ROLES.includes(session.role)) return <StaffQueue role={session.role} />;
  return (
    <div className="cims-report__body">
      <p className="cims-empty" role="status">
        Staff queue: sign in with a maintenance, IT, police or moderator account to continue.
      </p>
      <div className="cims-actions">
        <button type="button" className="cims-btn cims-btn--primary" onClick={openDialog}>
          Sign in
        </button>
      </div>
    </div>
  );
}
