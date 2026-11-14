/** @file Sidebar shell: survey-style header plus the panels. Add new panels here (src/panels/). */
import AccountChip from "../panels/account/AccountChip";
import PlaceCard from "../panels/building-card/PlaceCard";
import LayersPanel from "../panels/layers/LayersPanel";
import SearchPanel from "../panels/search/SearchPanel";
import "./Sidebar.css";

/** Left column (bottom sheet on phones) that hosts the panels. */
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <header className="cims-header">
        <h1 className="cims-header__title">CIMS</h1>
        <span className="cims-header__sub">
          Georgia Tech
          <br />
          Campus Map
        </span>
        <nav className="cims-header__nav" aria-label="Account"><AccountChip /></nav>
      </header>
      <SearchPanel />
      <LayersPanel />
      <PlaceCard />
    </aside>
  );
}
