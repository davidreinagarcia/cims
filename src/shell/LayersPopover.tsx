/** @file Layers tile on the map plus the popover that holds the full LayersPanel (legend, sub-filters, counts). */
import { useEffect, useRef, useState } from "react";
import LayersPanel from "../panels/layers/LayersPanel";
import { useCulture } from "../culture/store";
import { Icon } from "./icons";

/** Tile that opens the legend popover. Esc or a click outside closes it and returns focus to the tile. */
export default function LayersPopover() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tile = useRef<HTMLButtonElement>(null);
  const culture = useCulture().on;
  useEffect(() => { if (culture) setOpen(false); }, [culture]); // GT Culture closes the legend
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>(".shell-popover button")?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const close = () => { setOpen(false); tile.current?.focus(); };
  return (
    <div ref={root} className="shell-layers" onKeyDown={(event) => {
      if (event.key === "Escape" && open) { event.preventDefault(); close(); }
    }}>
      {open && (
        <div id="shell-layers-popover" className="shell-popover" role="dialog" aria-label="Map layers">
          <header className="shell-popover__head">
            <span className="cims-caps">Legend</span>
            <button type="button" className="shell-iconbtn" aria-label="Close layers" onClick={close}><Icon name="close" size={20} /></button>
          </header>
          <LayersPanel />
        </div>
      )}
      <button ref={tile} type="button" className="shell-layers__tile" aria-expanded={open} aria-controls="shell-layers-popover"
        onClick={() => setOpen(!open)}>
        <Icon name="layers" />
        <span className="shell-layers__label">Layers</span>
      </button>
    </div>
  );
}
