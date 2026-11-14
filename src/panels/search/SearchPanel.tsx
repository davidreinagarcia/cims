/** @file Search box and clickable list of places. Rooms and buildings join the list in T-14. */
import { Fragment, useMemo, useState } from "react";
import Glyph from "../../components/Glyph";
import { places } from "../../lib/places";
import { useSelection } from "../../state/selection";
import "./search.css";

/** Wraps the part of `text` that matches `query` in <mark> (gold underline, never gold text). */
function highlight(text: string, query: string) {
  const q = query.trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return text;
  return (
    <Fragment>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </Fragment>
  );
}

/**
 * Renders the search field and the result list as two siblings (CSS `order` places the detail card
 * between them), so it must be mounted inside the sidebar's flex column.
 */
export default function SearchPanel() {
  const { selection, select } = useSelection();
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.features.filter((f) => !q || f.properties.name.toLowerCase().includes(q));
  }, [query]);
  const selectedId = selection?.kind === "place" ? selection.id : null;

  return (
    <>
      <div className="search cims-field">
        <input
          aria-label="Search places"
          placeholder="Search places..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="cims-field__btn" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="10.5" cy="10.5" r="6" />
            <path d="M15 15l5 5" />
          </svg>
        </span>
      </div>
      <ul className="list cims-results">
        {results.length > 0 && <li className="cims-results__group">Places</li>}
        {results.map((f) => (
          <li key={f.properties.id}>
            <button
              className="cims-result"
              aria-selected={f.properties.id === selectedId}
              onClick={() => select({ kind: "place", id: f.properties.id })}
            >
              <span className="cims-glyph">
                <Glyph id="building" />
              </span>
              <span>
                <span className="cims-result__title">{highlight(f.properties.name, query)}</span>
                <br />
                <span className="cims-result__meta">{f.properties.category}</span>
              </span>
            </button>
          </li>
        ))}
        {results.length === 0 && (
          <li>
            <div className="cims-empty">No places match "{query.trim()}"</div>
          </li>
        )}
      </ul>
    </>
  );
}
