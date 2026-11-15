/** @file Layer panel (PRD F-02): category toggles, sub-type tree and legend. Chips row on phones. */
import { useMemo, useState, type CSSProperties } from "react";
import Glyph from "../../components/Glyph";
import { LAYER_CATALOG, OVERLAY_CATALOG, type LayerCategory, type OverlayLayer } from "../../lib/layerCatalog";
import { places } from "../../lib/places";
import { OTHER_SUBTYPE } from "../../map/layerFilters";
import { setGuide } from "../../culture/store";
import { setHeat, useStories } from "../../stories/store";
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
    return { byCat, bySub };
  }, []);
}

const overlayStyle = (o: OverlayLayer) => ({ "--cat": `var(${o.cssVar})` }) as CSSProperties;

/** Small line icon for an overlay: warning triangle for alerts, a soft blob for the heat map. */
function OverlayGlyph({ id }: { id: OverlayLayer["id"] }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {id === "culture"
        ? <><path d="M5 4h14v11l-5 5H5Z" /><path d="M14 20v-5h5M8 9h8M8 12.5h5" /></>
        : id === "alerts"
        ? <><circle cx="12" cy="12" r="9" strokeDasharray="3 2" /><path d="M12 7.5v5M12 15.5v.5" /></>
        : <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="6.5" opacity="0.65" /><circle cx="12" cy="12" r="9.5" opacity="0.35" /></>}
    </svg>
  );
}

/** Toggle list for the live overlays (police alerts, social heat map): same look as the place layers. */
function Overlays() {
  const { isOn, toggleCategory } = useLayerFilters();
  const { heat } = useStories();
  const on = (o: OverlayLayer) => (o.id === "stories-heat" ? heat : isOn(o.id));
  const toggle = (o: OverlayLayer) => (o.id === "stories-heat" ? setHeat(!heat) : toggleCategory(o.id));
  return (
    <ul className="layers__list layers__overlays" aria-label="Live overlays">
      {OVERLAY_CATALOG.map((o) => (
        <li key={o.id} style={overlayStyle(o)}>
          <div className="cims-layer">
            <input id={`layer-${o.id}`} type="checkbox" className="cims-check" checked={on(o)} onChange={() => toggle(o)} />
            <span className="cims-glyph"><OverlayGlyph id={o.id} /></span>
            <label htmlFor={`layer-${o.id}`} className="cims-layer__label">
              {o.label} <span className="cims-muted layers__hint">{o.hint}</span>
            </label>
          </div>
        </li>
      ))}
      <li>
        <button type="button" className="cims-btn layers__guide" onClick={() => setGuide(true)}>West vs East: where to live?</button>
      </li>
    </ul>
  );
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
        {open && <Overlays />}
      </section>
    </div>
  );
}
