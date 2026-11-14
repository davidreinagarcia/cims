/** @file Sidebar shell: survey-style header plus the panels. Add new panels here (src/panels/). */
import { useId, useRef, useState } from "react";
import BulletinPanel from "../panels/bulletin/BulletinPanel";
import PlaceCard from "../panels/building-card/PlaceCard";
import LayersPanel from "../panels/layers/LayersPanel";
import SearchPanel from "../panels/search/SearchPanel";
import "./Sidebar.css";

/** Left column (bottom sheet on phones) that hosts the panels. */
export default function Sidebar() {
  const [tab, setTab] = useState(0);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <aside className="sidebar">
      <header className="cims-header">
        <h1 className="cims-header__title">CIMS</h1>
        <span className="cims-header__sub">
          Georgia Tech
          <br />
          Campus Map
        </span>
      </header>
      <div className="sidebar__tabs" role="tablist" aria-label="Campus panels">
        {["Explore", "Bulletin"].map((label, index) => (
          <button key={label} type="button" role="tab" id={`${id}-tab-${index}`}
            aria-selected={tab === index} aria-controls={`${id}-panel-${index}`}
            tabIndex={tab === index ? 0 : -1} ref={(element) => { tabs.current[index] = element; }}
            onClick={() => setTab(index)} onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
              setTab(next);
              tabs.current[next]?.focus();
            }}>{label}</button>
        ))}
      </div>
      <div className="sidebar__panel" role="tabpanel" id={`${id}-panel-0`} aria-labelledby={`${id}-tab-0`} hidden={tab !== 0}>
        <SearchPanel />
        <LayersPanel />
        <PlaceCard />
      </div>
      <div className="sidebar__panel" role="tabpanel" id={`${id}-panel-1`} aria-labelledby={`${id}-tab-1`} hidden={tab !== 1}>
        {tab === 1 && <BulletinPanel onShowMap={() => {
          setTab(0);
          tabs.current[0]?.focus();
        }} />}
      </div>
    </aside>
  );
}
