/** @file One keyboard accessible room picker across every available building level. */
import { useEffect, useId, useRef, useState } from "react";
import type { IndoorBuilding, IndoorSpace, RoomFact } from "./types";

/** Browses rooms by level on focus and chooses either a schematic space or published room fact. */
export default function RoomSearch({ building, onChoose, onChooseRoom }: { building: IndoorBuilding; onChoose?: (space: IndoorSpace) => void; onChooseRoom?: (room: RoomFact) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const tokens = query.toLowerCase().trim().split(/\s+/);
  const roomsOnly = building.status === "rooms-only";
  const rooms = roomsOnly ? [...building.levels.map((level) => ({ id: level.id, name: level.name, label: level.label })),
    { id: null, name: "Level not listed", label: "?" }].flatMap((level) => (building.rooms ?? [])
      .filter((room) => room.level === level.id && tokens.every((token) => `${room.room} ${room.name} ${room.type} ${level.name} ${building.title} CULC Clough`.toLowerCase().includes(token)))
      .sort((a, b) => Number(b.room.toLowerCase() === query.trim().toLowerCase()) - Number(a.room.toLowerCase() === query.trim().toLowerCase()))
      .map((room) => ({ id: room.id, name: `Room ${room.room}`, meta: [room.name, room.capacity != null ? `${room.capacity} seats` : ""].filter(Boolean).join(", "),
        level, pick: () => onChooseRoom?.(room) })))
    : building.levels.flatMap((level) => level.available ? level.spaces
      .filter((space) => space.door && space.type !== "void" && tokens.every((token) => `${space.name} ${space.type} ${level.name}`.toLowerCase().includes(token)))
      .map((space) => ({ id: space.id, name: space.name, meta: space.type, level, pick: () => onChoose?.(space) })) : []);
  const choose = (pick: () => void) => { pick(); setQuery(""); setOpen(false); input.current?.focus(); };

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.altKey
        && !target.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) {
        event.preventDefault(); input.current?.focus(); setOpen(true);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (open) list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  return <div className="building-view__search" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <label className="cims-caps" htmlFor={id}>{roomsOnly ? "Room finder" : "Where to?"}</label>
    <div className="cims-field">
      <span className="building-view__magnifier" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></svg></span>
      <input ref={input} id={id} type="search" role="combobox" autoComplete="off" aria-autocomplete="list"
        aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && rooms[active] ? `${id}-${active}` : undefined}
        placeholder={roomsOnly ? "Search a room, e.g. 152" : "Search a room, e.g. Auditorium"} value={query}
        onFocus={() => { setOpen(true); setActive(0); }}
        onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
          else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setOpen(true);
            if (rooms.length) setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + rooms.length) % rooms.length);
          } else if (event.key === "Enter" && rooms[active]) { event.preventDefault(); choose(rooms[active].pick); }
        }} />
    </div>
    {open && <div ref={list} id={`${id}-list`} role="listbox" aria-label="Rooms in this building" className="building-view__matches cims-results">
      {rooms.map(({ id: roomId, name, meta, level, pick }, index) => <div key={roomId}>
        {(!index || rooms[index - 1].level.id !== level.id) && <div className="cims-results__group" aria-hidden="true">{level.name}</div>}
        <button id={`${id}-${index}`} type="button" role="option" aria-selected={index === active} tabIndex={-1}
          className="building-view__room-result" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(pick)}>
          <span>{name}<small className="cims-muted">{meta}</small></span><span className="cims-tag">{level.label}</span>
        </button>
      </div>)}
      {!rooms.length && <p className="cims-empty" role="status">No rooms match your search.</p>}
    </div>}
  </div>;
}
