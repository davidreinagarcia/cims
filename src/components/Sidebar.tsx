/** @file Sidebar shell: branded header plus the panels. Add new panels here (src/panels/). */
import PlaceCard from "../panels/building-card/PlaceCard";
import SearchPanel from "../panels/search/SearchPanel";
import "./Sidebar.css";

/** Left column (bottom sheet on phones) that hosts the panels. */
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <header>
        <h1>CIMS</h1>
        <p>Campus Interactive Map System</p>
      </header>
      <SearchPanel />
      <PlaceCard />
    </aside>
  );
}
