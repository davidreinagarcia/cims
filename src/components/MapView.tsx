/** @file Map host: creates the MapLibre map, loads every layer module from src/map/layers/ and feeds them the selection and layer filters. */
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { CAMPUS } from "../config";
import { baseStyle } from "../map/baseStyle";
import { NorthArrow } from "../map/furniture/NorthArrow";
import { ScaleBox } from "../map/furniture/ScaleBox";
import { ViewToggle } from "../map/furniture/ViewToggle";
import { loadLayers } from "../map/loadLayers";
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
    const map = new maplibregl.Map({
      container: container.current!,
      center: CAMPUS.center,
      zoom: CAMPUS.zoom,
      pitch: CAMPUS.pitch,
      bearing: CAMPUS.bearing,
      maxBounds: CAMPUS.bounds,
      style: baseStyle,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new ViewToggle(), "top-right");
    map.addControl(new ScaleBox(), "bottom-right");
    map.addControl(new NorthArrow(), "bottom-left");

    // style.load (not "load") so layers appear without waiting for every tile.
    let alive = true; // a map removed before its style loaded (React StrictMode remount) must not get layers
    map.on("style.load", () => {
      if (!alive) return;
      const ctx = { select: (s: Parameters<typeof select>[0]) => latest.current.select(s) };
      handles.current = loadLayers().map((layer) => layer.addTo(map, ctx));
      handles.current.forEach((h) => {
        h.update?.(latest.current.selection);
        h.setFilters?.(latest.current.filters);
      });
    });

    (window as unknown as { __map?: unknown }).__map = map; // handy for debugging in the console
    return () => {
      alive = false;
      handles.current.forEach((h) => h.remove());
      handles.current = [];
      map.remove();
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
