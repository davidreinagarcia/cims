/** @file Desktop left rail: menu drawer (about, sign in/out, data corrections) and the Explore/Rooms/Report/Bulletin switch. */
import { useEffect, useRef, useState } from "react";
import { CORRECTION_URL } from "../config";
import { useAuth } from "../state/auth";
import { Icon, NAV_ITEMS, moveFocus, type ShellPanel } from "./icons";

/** Thin full-height rail. Arrow keys move between items; the active one carries the pill highlight. */
export default function Rail({ panel, onPanel, onPolice }: { panel: ShellPanel; onPanel: (panel: ShellPanel) => void; onPolice: () => void }) {
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <nav className="shell-rail" aria-label="Main">
      <button ref={menuButton} type="button" className="shell-rail__menu" aria-label="Menu" aria-expanded={menu}
        aria-controls="shell-drawer" onClick={() => setMenu(!menu)}>
        <Icon name="menu" />
      </button>
      <div className="shell-rail__items" onKeyDown={(event) => moveFocus(event, true)}>
        {NAV_ITEMS.map((item) => (
          <button key={item.id} type="button" data-nav-item data-nav={item.id} className="shell-navitem" aria-pressed={panel === item.id}
            aria-haspopup={item.id === "bulletin" ? "dialog" : undefined}
            tabIndex={panel === item.id || (panel === "route" && item.id === "explore") ? 0 : -1}
            onClick={() => onPanel(item.id)}>
            <span className="shell-navitem__icon"><Icon name={item.icon} /></span>
            <span className="shell-navitem__label">{item.label}</span>
          </button>
        ))}
      </div>
      {menu && <Drawer onPolice={onPolice} onClose={() => { setMenu(false); menuButton.current?.focus(); }} />}
    </nav>
  );
}

function Drawer({ onClose, onPolice }: { onClose: () => void; onPolice: () => void }) {
  const { session, openDialog, signOut } = useAuth();
  const root = useRef<HTMLDivElement>(null);
  const [about, setAbout] = useState(false);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    root.current?.querySelector<HTMLElement>("button, a")?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!root.current?.contains(target) && !target.closest(".shell-rail__menu")) close.current();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return (
    <div ref={root} id="shell-drawer" className="shell-drawer" role="group" aria-label="Menu"
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}>
      <p className="shell-drawer__title cims-caps">CIMS</p>
      <button type="button" className="shell-drawer__item" aria-expanded={about} onClick={() => setAbout(!about)}>About</button>
      {about && <p className="shell-drawer__about">Campus Interactive Map System: a map of Georgia Tech's campus, its buildings, rooms and places.</p>}
      {session
        ? <button type="button" className="shell-drawer__item" onClick={() => { onClose(); void signOut(); }}>Sign out <span className="cims-status">DEMO</span></button>
        : <button type="button" className="shell-drawer__item" onClick={() => { onClose(); openDialog(); }}>Sign in <span className="cims-status">DEMO</span></button>}
      <button type="button" className="shell-drawer__item" onClick={() => { onClose(); onPolice(); }}>GTPD alert console</button>
      <a className="shell-drawer__item" href={CORRECTION_URL} target="_blank" rel="noopener noreferrer">Data corrections</a>
    </div>
  );
}
