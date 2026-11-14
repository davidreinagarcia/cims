import { useMemo, useState } from "react";
import { places } from "../lib/places";

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function Sidebar({ selectedId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.features.filter((f) => !q || f.properties.name.toLowerCase().includes(q));
  }, [query]);
  const selected = places.features.find((f) => f.properties.id === selectedId);

  return (
    <aside className="sidebar">
      <header>
        <h1>CIMS</h1>
        <p>Campus Interactive Map System</p>
      </header>
      <input
        className="search"
        placeholder="Search places..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {selected && (
        <div className="detail">
          <h2>{selected.properties.name}</h2>
          <span className="tag">{selected.properties.category}</span>
          <p>{selected.properties.description}</p>
          <button onClick={() => onSelect(null)}>Close</button>
        </div>
      )}
      <ul className="list">
        {results.map((f) => (
          <li key={f.properties.id}>
            <button
              className={f.properties.id === selectedId ? "active" : ""}
              onClick={() => onSelect(f.properties.id)}
            >
              {f.properties.name}
              <small>{f.properties.category}</small>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="empty">No results</li>}
      </ul>
    </aside>
  );
}
