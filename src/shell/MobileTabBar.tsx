/** @file Phone bottom tab bar (replaces the rail under 768px): Explore, Buses, Rooms, Report, Bulletin, Stories. */
import { Icon, NAV_ITEMS, moveFocus, type ShellPanel } from "./icons";

/** Fixed bottom bar above the safe-area inset. Left/right arrows move between tabs. */
export default function MobileTabBar({ panel, onPanel }: { panel: ShellPanel; onPanel: (panel: ShellPanel) => void }) {
  return (
    <nav className="shell-tabbar" aria-label="Main" onKeyDown={(event) => moveFocus(event, false)}>
      {NAV_ITEMS.map((item) => (
        <button key={item.id} type="button" data-nav-item data-nav={item.id} className="shell-navitem" aria-pressed={panel === item.id}
          aria-haspopup={item.id === "bulletin" ? "dialog" : undefined}
          tabIndex={panel === item.id || (panel === "route" && item.id === "explore") ? 0 : -1}
          onClick={() => onPanel(item.id)}>
          <span className="shell-navitem__icon"><Icon name={item.icon} /></span>
          <span className="shell-navitem__label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
