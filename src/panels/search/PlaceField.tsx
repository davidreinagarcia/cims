/** @file One place input with a short suggestion list, used for the From and To fields of directions. */
import { useId, useState, type KeyboardEvent } from "react";
import type { BuildingIndex } from "../../lib/buildings";
import type { CampusSearchResult } from "../../lib/search";
import { suggest } from "../../lib/suggest";

/** A labelled combobox that reports the chosen result, or null once the text is edited again. */
export default function PlaceField({ label, placeholder, buildings, picked, onPick }: {
  label: string; placeholder: string; buildings: BuildingIndex | null; picked: CampusSearchResult | null; onPick: (result: CampusSearchResult | null) => void;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const shown = picked ? picked.name : text;
  const options = open && !picked ? suggest(text, buildings, 5) : [];
  const choose = (result: CampusSearchResult) => { onPick(result); setOpen(false); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length) setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if (event.key === "Enter" && options[active]) { event.preventDefault(); choose(options[active]); }
    else if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
  };
  return <div className="place-field">
    <label className="cims-caps" htmlFor={id}>{label}</label>
    <div className="cims-field">
      <input id={id} role="combobox" autoComplete="off" aria-expanded={options.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={options[active] ? `${id}-${active}` : undefined} placeholder={placeholder} value={shown}
        onChange={(event) => { if (picked) onPick(null); setText(event.target.value); setActive(0); setOpen(true); }}
        onFocus={(event) => { setOpen(true); if (picked) event.target.select(); }} onBlur={() => setOpen(false)} onKeyDown={onKeyDown} />
    </div>
    <div id={`${id}-list`} role="listbox" aria-label={`${label} suggestions`} className="cims-results place-field__list" hidden={!options.length}>
      {options.map((result, index) => <button key={`${result.kind}:${result.id}`} id={`${id}-${index}`} type="button" role="option" tabIndex={-1}
        className="cims-result" data-active={index === active} aria-selected={index === active}
        onMouseDown={(event) => event.preventDefault()} onClick={() => choose(result)}>
        <span><span className="cims-result__title">{result.name}</span><br /><span className="cims-result__meta">{result.meta}</span></span>
      </button>)}
    </div>
  </div>;
}
