/** @file Phone bottom sheet above the tab bar: hosts the same panels as the desktop card, with peek / half / full snaps. */
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { Icon } from "./icons";

/** Sheet heights, smallest first. */
export type SheetSnap = "peek" | "half" | "full";
const ORDER: SheetSnap[] = ["peek", "half", "full"];
const PEEK_PX = 88;

/** Pixel height of each snap right now (full stops under the search pill). */
function snapHeights(sheet: HTMLElement): Record<SheetSnap, number> {
  const bottom = sheet.getBoundingClientRect().bottom;
  const pill = document.querySelector(".shell-search")?.getBoundingClientRect().bottom ?? 64;
  const full = Math.max(PEEK_PX, bottom - pill - 8);
  return { peek: PEEK_PX, half: Math.min(full, Math.round(window.innerHeight * 0.5)), full };
}

/** Drag or tap the handle (or press Enter/Space on it) to move between snaps; arrow keys step up and down. Opens at half. */
export default function BottomSheet({ title, contentKey, snap, onSnap, onClose, children }: {
  title: string;
  /** Changes when the content changes, so the sheet reopens at half. */
  contentKey: string;
  snap: SheetSnap;
  onSnap: (snap: SheetSnap) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const sheet = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  useEffect(() => onSnap("half"), [contentKey]);

  const step = (direction: 1 | -1) => onSnap(ORDER[Math.min(2, Math.max(0, ORDER.indexOf(snap) + direction))]);
  // Tap, Enter, Space and screen-reader activation all arrive as a click; a click that ends a drag is swallowed.
  const dragged = useRef(false);
  const click = (event: MouseEvent<HTMLButtonElement>) => {
    const afterDrag = dragged.current;
    dragged.current = false;
    if (afterDrag && event.detail !== 0) return; // detail 0 = keyboard / assistive tech, never part of a drag
    onSnap(snap === "full" ? "peek" : ORDER[ORDER.indexOf(snap) + 1]);
  };
  const down = (event: PointerEvent<HTMLButtonElement>) => {
    dragged.current = false;
    drag.current = { y: event.clientY, h: sheet.current!.getBoundingClientRect().height, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - event.clientY;
    if (Math.abs(dy) > 6) d.moved = true;
    if (d.moved) setDragHeight(Math.max(PEEK_PX, Math.min(snapHeights(sheet.current!).full, d.h + dy)));
  };
  const up = (event: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return; // a plain tap: the click handler does it
    dragged.current = event.type === "pointerup"; // a cancelled drag gets no click to swallow
    const heights = snapHeights(sheet.current!);
    const current = dragHeight ?? d.h;
    setDragHeight(null);
    onSnap(ORDER.reduce((best, s) => Math.abs(heights[s] - current) < Math.abs(heights[best] - current) ? s : best, "peek" as SheetSnap));
  };

  return (
    <section ref={sheet} className="shell-sheet" data-snap={snap} aria-label={title} tabIndex={-1}
      style={dragHeight == null ? undefined : { height: dragHeight, transition: "none" }}>
      <header className="shell-sheet__head">
        <button type="button" className="shell-sheet__handle" aria-label={`${title}: ${snap === "full" ? "collapse" : "expand"} sheet`}
          onClick={click} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") { event.preventDefault(); step(1); }
            else if (event.key === "ArrowDown") { event.preventDefault(); step(-1); }
          }}>
          <span className="shell-sheet__grip" aria-hidden="true" />
          <span className="shell-sheet__title cims-caps">{title}</span>
        </button>
        <button type="button" className="shell-iconbtn" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>
          <Icon name="close" size={20} />
        </button>
      </header>
      <div className="shell-sheet__body" hidden={snap === "peek"}>{children}</div>
    </section>
  );
}
