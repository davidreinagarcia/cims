/** @file Grouped place search with ranked highlights and keyboard selection. */
import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Glyph from "../../components/Glyph";
import { places } from "../../lib/places";
import { searchPlaces, type MatchRange } from "../../lib/search";
import { useSelection } from "../../state/selection";
import "./search.css";

function highlight(text: string, ranges: MatchRange[] = []) {
  let end = 0;
  const parts = ranges.map(([start, nextEnd]) => {
    const before = text.slice(end, start);
    end = nextEnd;
    return <Fragment key={start}>{before}<mark>{text.slice(start, nextEnd)}</mark></Fragment>;
  });
  return <>{parts}{text.slice(end)}</>;
}

/** Renders search and grouped results as siblings so sidebar CSS order can place panels between them. */
export default function SearchPanel() {
  const { selection, select } = useSelection();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const listId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchPlaces(query, places.features), [query]);
  const groups = useMemo(() => {
    const grouped = new Map<string, typeof results>();
    for (const result of results) {
      const group = grouped.get(result.group) ?? [];
      group.push(result);
      grouped.set(result.group, group);
    }
    return Array.from(grouped);
  }, [results]);
  const ordered = useMemo(() => groups.flatMap(([, items]) => items), [groups]);
  const activeResult = ordered[active];
  const optionId = (id: string) => `${listId}-${id}`;
  const selectedId = selection?.kind === "place" ? selection.id : null;

  useEffect(() => {
    if (focused && active >= 0) {
      listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
    }
  }, [active, focused, results]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      setActive(-1);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!ordered.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => current < 0
        ? step > 0 ? 0 : ordered.length - 1
        : (current + step + ordered.length) % ordered.length);
    } else if (event.key === "Enter" && activeResult) {
      event.preventDefault();
      select({ kind: "place", id: activeResult.place.properties.id });
    }
  }

  return (
    <>
      <div className="search cims-field">
        <input
          role="combobox"
          aria-label="Search places"
          aria-autocomplete="list"
          aria-expanded={true}
          aria-controls={listId}
          aria-activedescendant={focused && activeResult ? optionId(activeResult.place.properties.id) : undefined}
          placeholder="Search places..."
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <span className="cims-field__btn" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="10.5" cy="10.5" r="6" />
            <path d="M15 15l5 5" />
          </svg>
        </span>
      </div>
      <div className="list cims-results" id={listId} role="listbox" aria-label="Search results" ref={listRef}>
        {groups.map(([group, items]) => (
          <div key={group} role="group" aria-label={group}>
            <div className="cims-results__group" aria-hidden="true">{group}</div>
            {items.map(({ place, matches }) => {
              const { id, name, category } = place.properties;
              const nameMatch = matches.find((match) => match.field === "name");
              const aliasMatch = matches.find((match) => match.field === "alias");
              const categoryMatch = matches.find((match) => match.field === "category");
              const isActive = focused && activeResult?.place.properties.id === id;
              return (
                <button
                  key={id}
                  id={optionId(id)}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  className="cims-result"
                  data-active={isActive}
                  aria-selected={focused && activeResult ? isActive : id === selectedId}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setActive(ordered.findIndex((result) => result.place.properties.id === id));
                    select({ kind: "place", id });
                  }}
                >
                  <span className="cims-glyph" aria-hidden="true"><Glyph id="building" /></span>
                  <span>
                    <span className="cims-result__title">{highlight(name, nameMatch?.ranges)}</span>
                    <br />
                    <span className="cims-result__meta">
                      {aliasMatch && <>{highlight(aliasMatch.text, aliasMatch.ranges)}<br /></>}
                      {highlight(category, categoryMatch?.ranges)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {results.length === 0 && (
        <div className="search-empty cims-empty" role="status">
          <strong>No results</strong>
          <span>Check the spelling or browse the layers</span>
        </div>
      )}
    </>
  );
}
