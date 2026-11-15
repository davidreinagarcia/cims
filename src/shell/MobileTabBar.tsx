/** @file Phone bottom dock (replaces the rail under 768px): floating pill with the seven destinations; the active one expands to icon + label, the rest stay icons. */
import { useEffect, useRef } from "react";
import { Icon, NAV_ITEMS, moveFocus, type ShellPanel } from "./icons";

/** Floating dock above the safe-area inset. Scrolls sideways when it must; the active tab slides into view. Left/right arrows move between tabs. */
export default function MobileTabBar({ panel, onPanel }: { panel: ShellPanel; onPanel: (panel: ShellPanel) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const active = panel === "route" ? "explore" : panel;

  useEffect(() => {
    const el = track.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !track.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Wait one frame so the expanded width is known, then centre the active tab.
    requestAnimationFrame(() => {
      const box = track.current;
      if (box) box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
    });
  }, [active]);

  return (
    <nav className="shell-tabbar" aria-label="Main" onKeyDown={(event) => moveFocus(event, false)}>
      <div className="shell-dock" ref={track}>
        {NAV_ITEMS.map((item) => (
          <button key={item.id} type="button" data-nav-item data-nav={item.id} className="shell-dockitem" aria-pressed={active === item.id}
            aria-label={item.label}
            aria-haspopup={item.id === "bulletin" || item.id === "buzzprint" ? "dialog" : undefined}
            tabIndex={active === item.id ? 0 : -1}
            onClick={() => { navigator.vibrate?.(8); onPanel(item.id); }}>
            <span className="shell-dockitem__icon"><Icon name={item.icon} /></span>
            <span className="shell-dockitem__label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
