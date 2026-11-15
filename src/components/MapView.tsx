/** @file Map host: loads MapLibre on demand, creates the map, loads every layer module from src/map/layers/ and feeds them the selection and layer filters. */
import { useEffect, useRef } from "react";
import { CAMPUS } from "../config";
import { baseStyle } from "../map/baseStyle";
import { NorthArrow } from "../map/furniture/NorthArrow";
import { ScaleBox } from "../map/furniture/ScaleBox";
import { ViewToggle } from "../map/furniture/ViewToggle";
import { loadLayers } from "../map/loadLayers";
import { loadMapLibre } from "../map/maplibre";
import type { LayerHandle } from "../map/types";
import { useLayerFilters } from "../state/layerFilters";
import { useSelection } from "../state/selection";

/** The interactive map. Knows nothing about what is drawn: layers do that. */
export default function MapView() {
  const { selection, select } = useSelection();
  const { filters } = useLayerFilters();
  const container = useRef<HTMLDivElement>(null);
  const handles = useRef<LayerHandle[]>([]);
  const latest = useRef({ selection, select, filters });
  latest.current = { selection, select, filters };

  useEffect(() => {
    let alive = true; // unmounted (or a StrictMode remount) before the library arrived or the style loaded: do nothing
    let map: import("maplibre-gl").Map | undefined;
    void loadMapLibre().then((maplibregl) => {
      if (!alive) return;
      map = new maplibregl.Map({
        container: container.current!,
        center: CAMPUS.center,
        zoom: CAMPUS.zoom,
        pitch: CAMPUS.pitch,
        bearing: CAMPUS.bearing,
        maxBounds: CAMPUS.bounds,
        style: baseStyle,
        attributionControl: false,
      });
      const m = map;
      // Attribution (legal, always reachable): expanded on desktop; on phones (< 768px) the compact ⓘ button,
      // collapsed once the map has loaded (MapLibre opens it by default), tap ⓘ to read it.
      const phone = window.matchMedia("(max-width: 767px)").matches;
      m.addControl(new maplibregl.AttributionControl({
        compact: phone,
        customAttribution: '<a href="https://maplibre.org/" target="_blank" rel="noopener">MapLibre</a>', // same credit as the default control
      }), "bottom-right");
      if (phone) m.once("load", () => {
        const attrib = m.getContainer().querySelector(".maplibregl-ctrl-attrib");
        attrib?.classList.remove("maplibregl-compact-show");
        attrib?.removeAttribute("open");
      });
      // Bottom corners stack upward (each new control goes on top), so add bottom-right controls from the bottom up:
      // scale box, compass, 2D/3D, zoom (APP-SHELL.md §7). The top of the map stays free for the floating search UI.
      m.addControl(new ScaleBox(), "bottom-right");
      m.addControl(new maplibregl.NavigationControl({ showZoom: false }), "bottom-right");
      m.addControl(new ViewToggle(), "bottom-right");
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      m.addControl(new NorthArrow(), "bottom-left");

      // style.load (not "load") so layers appear without waiting for every tile.
      m.on("style.load", () => {
        if (!alive) return;
        const ctx = { select: (s: Parameters<typeof select>[0]) => latest.current.select(s) };
        handles.current = loadLayers().map((layer) => layer.addTo(m, ctx));
        handles.current.forEach((h) => {
          h.update?.(latest.current.selection);
          h.setFilters?.(latest.current.filters);
        });
      });

      (window as unknown as { __map?: unknown }).__map = m; // handy for debugging in the console
    });
    return () => {
      alive = false;
      handles.current.forEach((h) => h.remove());
      handles.current = [];
      map?.remove();
    };
  }, []);

  useEffect(() => {
    handles.current.forEach((h) => h.update?.(selection));
  }, [selection]);

  useEffect(() => {
    handles.current.forEach((h) => h.setFilters?.(filters));
  }, [filters]);

  return <div ref={container} className="map" />;
}
