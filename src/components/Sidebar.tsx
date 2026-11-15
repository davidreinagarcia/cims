/** @file Sidebar shell: survey-style header plus the panels. Add new panels here (src/panels/). */
import AccountChip from "../panels/account/AccountChip";
import { useId, useRef, useState } from "react";
import BulletinPanel from "../panels/bulletin/BulletinPanel";
import BuildingCard from "../panels/building-card/BuildingCard";
import PlaceCard from "../panels/building-card/PlaceCard";
import LayersPanel from "../panels/layers/LayersPanel";
import RoomFinderPanel from "../panels/rooms/RoomFinderPanel";
import SearchPanel from "../panels/search/SearchPanel";
import "./Sidebar.css";

// "Room finder" (not just "Rooms"): Explore's search already lists every room, including CULC's
// published facts (T-21); this tab is specifically the bookable-availability search over Kendeda's
// demo seed (F-11), so the label should not read as a second, competing way to find any room.
const TABS = ["Explore", "Bulletin", "Room finder"];

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
        <nav className="cims-header__nav" aria-label="Account"><AccountChip /></nav>
      </header>
      <div className="sidebar__tabs" role="tablist" aria-label="Campus panels">
        {TABS.map((label, index) => (
          <button key={label} type="button" role="tab" id={`${id}-tab-${index}`}
            aria-selected={tab === index} aria-controls={`${id}-panel-${index}`}
            tabIndex={tab === index ? 0 : -1} ref={(element) => { tabs.current[index] = element; }}
            onClick={() => setTab(index)} onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const last = TABS.length - 1;
              const next = event.key === "Home" ? 0 : event.key === "End" ? last
                : (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
              setTab(next);
              tabs.current[next]?.focus();
            }}>{label}</button>
        ))}
      </div>
      <div className="sidebar__panel" role="tabpanel" id={`${id}-panel-0`} aria-labelledby={`${id}-tab-0`} hidden={tab !== 0}>
        <SearchPanel />
        <LayersPanel />
        <PlaceCard />
        <BuildingCard />
      </div>
      <div className="sidebar__panel" role="tabpanel" id={`${id}-panel-1`} aria-labelledby={`${id}-tab-1`} hidden={tab !== 1}>
        {tab === 1 && <BulletinPanel onShowMap={() => {
          setTab(0);
          tabs.current[0]?.focus();
        }} />}
      </div>
      <div className="sidebar__panel" role="tabpanel" id={`${id}-panel-2`} aria-labelledby={`${id}-tab-2`} hidden={tab !== 2}>
        {tab === 2 && <RoomFinderPanel />}
      </div>
    </aside>
  );
}
