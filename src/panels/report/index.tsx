/** @file Report panel entry: mounts the report flow (?panel=report) or the staff queue (?panel=staff) from the URL. */
import { useCallback, useEffect, useState } from "react";
import "../../styles/tokens.css";
import "../../styles/cims-ui.css";
import "./report.css";
import ReportFlow from "./ReportFlow";
import StaffQueue from "./StaffQueue";
import { locationFromParams } from "./location";

/** Changes the query string without reloading; pass null to close the panel. */
export type Navigate = (params: URLSearchParams | null) => void;

/** Renders nothing unless the URL has ?panel=report or ?panel=staff; the only piece App.tsx mounts. */
export default function ReportPanelRoute() {
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onPop = () => setSearch(window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
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
        <StaffQueue />
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
