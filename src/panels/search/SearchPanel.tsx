/** @file Search box and clickable list of places. Rooms and buildings join the list in T-14. */
import { useMemo, useState } from "react";
import { places } from "../../lib/places";
import { useSelection } from "../../state/selection";
import "./search.css";

/**
 * Renders the search input and the result list as two siblings (CSS `order` places the detail card
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
      <input
        className="search"
        placeholder="Search places..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="list">
        {results.map((f) => (
          <li key={f.properties.id}>
            <button
              className={f.properties.id === selectedId ? "active" : ""}
              onClick={() => select({ kind: "place", id: f.properties.id })}
            >
              {f.properties.name}
              <small>{f.properties.category}</small>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="empty">No results</li>}
      </ul>
    </>
  );
}
