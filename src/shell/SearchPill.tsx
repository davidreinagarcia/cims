/** @file Floating search pill: CIMS wordmark + the existing SearchPanel (field in the pill, results drop down under it) + Route or account. */
import type { ReactNode } from "react";
import SearchPanel from "../panels/search/SearchPanel";
import { Icon } from "./icons";

/** The pill. SearchPanel is mounted unchanged; CSS grid puts its field in the pill row and its list in the dropdown row. */
export default function SearchPill({ showResults, onQuery, onRoute, trailing }: {
  /** Show the results dropdown (there is a query and nothing is selected). */
  showResults: boolean;
  /** Reports whether the field has text, so the shell knows when the dropdown is open. */
  onQuery: (hasQuery: boolean) => void;
  /** Desktop: the Route button. Phones use the Route FAB instead. */
  onRoute?: () => void;
  /** Phones: the account avatar inside the pill. */
  trailing?: ReactNode;
}) {
  return (
    <div className="shell-search" data-results={showResults}
      onInput={(event) => { if (event.target instanceof HTMLInputElement) onQuery(event.target.value.trim() !== ""); }}
      onKeyDown={(event) => { if (event.key === "Escape" && event.target instanceof HTMLInputElement) onQuery(false); }}>
      <h1 className="shell-search__wordmark">CIMS</h1>
      <SearchPanel />
      {onRoute && (
        <button type="button" className="shell-search__route" onClick={onRoute} aria-label="Route: directions between two places">
          <Icon name="route" />
        </button>
      )}
      {trailing && <div className="shell-search__trailing">{trailing}</div>}
    </div>
  );
}
