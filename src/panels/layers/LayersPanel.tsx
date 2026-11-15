/** @file Layer panel (PRD F-02): category toggles, sub-type tree and legend. Chips row on phones. */
import { useMemo, useState, type CSSProperties } from "react";
import Glyph from "../../components/Glyph";
import { LAYER_CATALOG, type LayerCategory } from "../../lib/layerCatalog";
import { transitStops } from "../../lib/transit";
import { places } from "../../lib/places";
import { OTHER_SUBTYPE } from "../../map/layerFilters";
import { useLayerFilters } from "../../state/layerFilters";
import "./layers.css";

const catStyle = (c: LayerCategory) => ({ "--cat": `var(${c.cssVar})` }) as CSSProperties;

/** Number of places per category and per category+subtype, for the counts and the "no data yet" state. */
function useCounts() {
  return useMemo(() => {
    const byCat: Record<string, number> = {};
    const bySub: Record<string, number> = {};
    for (const f of places.features) {
      const { category, subtype } = f.properties;
      byCat[category] = (byCat[category] ?? 0) + 1;
      const key = `${category}/${subtype ?? OTHER_SUBTYPE}`;
      bySub[key] = (bySub[key] ?? 0) + 1;
    }
    byCat.transport = (byCat.transport ?? 0) + transitStops.length;
    bySub[`transport/${OTHER_SUBTYPE}`] = (bySub[`transport/${OTHER_SUBTYPE}`] ?? 0) + transitStops.length;
    return { byCat, bySub };
  }, []);
}

/**
 * The layer panel. Mount inside the sidebar's flex column. On phones the chips row is the quick
 * toggle and the panel (with sub-types) starts collapsed.
 */
export default function LayersPanel() {
  const { isOn, isSubtypeOn, toggleCategory, toggleSubtype } = useLayerFilters();
  const { byCat, bySub } = useCounts();
  const [open, setOpen] = useState(() => !window.matchMedia("(max-width: 700px)").matches);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const withData = LAYER_CATALOG.filter((c) => byCat[c.id]);
  const onCount = withData.filter((c) => isOn(c.id)).length;

  return (
    <div className="layers">
      <div className="cims-chips layers__chips" role="group" aria-label="Quick layer toggles">
        {LAYER_CATALOG.map((c) => (
          <button
            key={c.id}
            className="cims-chip"
            style={catStyle(c)}
            aria-pressed={isOn(c.id)}
            disabled={!byCat[c.id]}
            onClick={() => toggleCategory(c.id)}
          >
            <span className="cims-glyph" style={{ width: 18, height: 18 }}>
              <Glyph id={c.id} size={18} />
            </span>
            {c.label}
          </button>
        ))}
      </div>

      <section className="layers__panel">
        <button className="layers__head" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="cims-caps">Layers</span>
          <span className="cims-mono">
            {onCount}/{withData.length} on
          </span>
        </button>
        {open && (
          <ul className="layers__list">
            {LAYER_CATALOG.map((c) => {
              const count = byCat[c.id] ?? 0;
              const hasData = count > 0;
              const canExpand = c.subtypes.length > 0 && hasData;
              const isExpanded = !!expanded[c.id] && canExpand;
              const subs = [...c.subtypes, ...((bySub[`${c.id}/${OTHER_SUBTYPE}`] ?? 0) > 0 ? [{ id: OTHER_SUBTYPE, label: "Other" }] : [])];
              return (
                <li key={c.id} className={hasData ? "" : "layers__empty"} style={catStyle(c)}>
                  <div className="cims-layer">
                    <input
                      id={`layer-${c.id}`}
                      type="checkbox"
                      className="cims-check"
                      checked={isOn(c.id) && hasData}
                      disabled={!hasData}
                      onChange={() => toggleCategory(c.id)}
                    />
                    <span className="cims-glyph">
                      <Glyph id={c.id} />
                    </span>
                    <label htmlFor={`layer-${c.id}`} className="cims-layer__label">
                      {c.label}{" "}
                      <span className="cims-mono cims-muted">{hasData ? count : "no data yet"}</span>
                    </label>
                    {canExpand && (
                      <button
                        className="layers__expand"
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Hide" : "Show"} ${c.label} sub-types`}
                        onClick={() => setExpanded({ ...expanded, [c.id]: !isExpanded })}
                      >
                        {isExpanded ? "−" : "+"}
                      </button>
                    )}
                  </div>
                  {isExpanded && (
                    <ul className="cims-sublayers">
                      {subs.map((s) => (
                        <li key={s.id}>
                          <input
                            id={`layer-${c.id}-${s.id}`}
                            type="checkbox"
                            className="cims-check"
                            checked={isSubtypeOn(c.id, s.id)}
                            onChange={() => toggleSubtype(c.id, s.id)}
                          />
                          <label htmlFor={`layer-${c.id}-${s.id}`}>
                            {s.label}{" "}
                            <span className="cims-mono cims-muted">{bySub[`${c.id}/${s.id}`] ?? 0}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
