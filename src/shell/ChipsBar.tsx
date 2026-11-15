/** @file Floating row of category chips: quick layer toggles wired to the shared layer-filter state. Scrolls sideways, never wraps. */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Glyph from "../components/Glyph";
import { LAYER_CATALOG } from "../lib/layerCatalog";
import { places } from "../lib/places";
import { useLayerFilters } from "../state/layerFilters";
import { Icon } from "./icons";

const withData = new Set(places.features.map((feature) => feature.properties.category));

/** One pill per layer category; pressed = layer on. Categories without data are disabled, like in the Layers panel. */
export default function ChipsBar() {
  const { isOn, toggleCategory } = useLayerFilters();
  const row = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft > 4, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => { el.removeEventListener("scroll", update); observer.disconnect(); };
  }, []);
  const scroll = (direction: 1 | -1) => row.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  return (
    <div className="shell-chips" data-start={edges.start} data-end={edges.end}>
      <div ref={row} className="shell-chips__row" role="group" aria-label="Quick layer toggles">
        {LAYER_CATALOG.map((layer) => (
          <button key={layer.id} type="button" className="shell-chip" aria-pressed={isOn(layer.id) && withData.has(layer.id)}
            disabled={!withData.has(layer.id)} title={withData.has(layer.id) ? undefined : "No data yet"}
            style={{ "--cat": `var(${layer.cssVar})` } as CSSProperties} onClick={() => toggleCategory(layer.id)}>
            <span className="shell-chip__glyph"><Glyph id={layer.id} size={16} /></span>
            {layer.label}
          </button>
        ))}
      </div>
      {edges.start && <button type="button" tabIndex={-1} aria-hidden="true" className="shell-chips__arrow shell-chips__arrow--start" onClick={() => scroll(-1)}><Icon name="left" size={18} /></button>}
      {edges.end && <button type="button" tabIndex={-1} aria-hidden="true" className="shell-chips__arrow shell-chips__arrow--end" onClick={() => scroll(1)}><Icon name="right" size={18} /></button>}
    </div>
  );
}
