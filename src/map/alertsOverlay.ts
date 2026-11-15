/** @file Draws live GTPD alarms on a MapLibre map: a red danger circle, an expanding warning ripple and a labeled center beacon. Used by the main map layer and the police map. */
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { circleRing, subscribeAlerts, type CampusAlert } from "../lib/alerts";

const AREAS = "cims-alert-areas";
const RIPPLE = "cims-alert-ripple";
const CENTERS = "cims-alert-centers";
const DANGER = "#B42318";
const DRILL = "#B7791F";
const FONT = ["Open Sans Semibold"];
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

const colorOf: unknown = ["case", ["get", "test"], DRILL, DANGER];

/** Options for the overlay. */
export interface AlertsOverlayOptions {
  /** Fly to alarms that appear while the page is open, and to ones the banner asks for. */
  fly?: boolean;
}

/** Fits the camera to an alarm circle with room around it. */
export function flyToAlert(map: MapLibreMap, alert: CampusAlert): void {
  const ring = circleRing(alert.center, alert.radiusM, 8);
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], {
    padding: { top: 140, bottom: 140, left: 120, right: 120 }, duration: 900, maxZoom: 18, pitch: 0, bearing: 0,
  });
}

/** Adds the alarm layers to a map whose style is ready and keeps them in sync with the live store. Returns a remover. */
export function addAlertsOverlay(map: MapLibreMap, options: AlertsOverlayOptions = {}): () => void {
  let removed = false;
  let active: CampusAlert[] = [];
  let seen: Set<string> | null = null; // null until the first snapshot, so alarms already running at load don't yank the camera
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  map.addSource(AREAS, { type: "geojson", data: EMPTY });
  map.addSource(RIPPLE, { type: "geojson", data: EMPTY });
  map.addSource(CENTERS, { type: "geojson", data: EMPTY });
  map.addLayer({ id: "cims-alert-fill", type: "fill", source: AREAS, paint: { "fill-color": colorOf as string, "fill-opacity": 0.26 } });
  map.addLayer({
    id: "cims-alert-edge", type: "line", source: AREAS,
    paint: { "line-color": colorOf as string, "line-width": 3, "line-dasharray": [2, 1.2] },
  });
  map.addLayer({
    id: "cims-alert-ripple", type: "line", source: RIPPLE,
    paint: { "line-color": colorOf as string, "line-width": 2.5, "line-opacity": ["get", "o"] },
  });
  map.addLayer({
    id: "cims-alert-center", type: "circle", source: CENTERS,
    paint: { "circle-radius": 9, "circle-color": colorOf as string, "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 3 },
  });
  map.addLayer({
    id: "cims-alert-label", type: "symbol", source: CENTERS,
    layout: { "text-field": ["get", "label"], "text-font": FONT, "text-size": 14, "text-offset": [0, 1.6], "text-anchor": "top", "text-allow-overlap": true, "text-max-width": 14 },
    paint: { "text-color": "#FFFFFF", "text-halo-color": colorOf as string, "text-halo-width": 2.2 },
  });

  const src = (id: string) => map.getSource(id) as GeoJSONSource | undefined;
  const polygons = (scale = 1, opacity?: number): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: active.map((a) => ({
      type: "Feature",
      properties: { id: a.id, test: a.test, o: opacity ?? 1 },
      geometry: { type: "Polygon", coordinates: [circleRing(a.center, a.radiusM * scale)] },
    })),
  });
  const draw = () => {
    src(AREAS)?.setData(polygons());
    src(CENTERS)?.setData({
      type: "FeatureCollection",
      features: active.map((a) => ({
        type: "Feature",
        properties: { id: a.id, test: a.test, label: `${a.test ? "TEST: " : ""}${a.title.toUpperCase()}` },
        geometry: { type: "Point", coordinates: a.center },
      })),
    });
    if (reduced) src(RIPPLE)?.setData(EMPTY);
  };

  const unsubscribe = subscribeAlerts((state) => {
    if (removed) return;
    active = state.alerts.filter((a) => a.status === "active");
    const ids = new Set(active.map((a) => a.id));
    if (options.fly && seen && state.status === "live") {
      const fresh = active.find((a) => !seen!.has(a.id));
      if (fresh) flyToAlert(map, fresh);
    }
    if (state.status === "live") seen = ids;
    draw();
  });

  const onFocus = (event: Event) => { if (options.fly) flyToAlert(map, (event as CustomEvent<CampusAlert>).detail); };
  window.addEventListener("cims:focus-alert", onFocus);

  // Pulse: the fill breathes and a ring grows out of the circle edge. ~12 fps is plenty and keeps phones cool.
  let raf = 0;
  let last = 0;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (document.hidden || active.length === 0 || now - last < 80) return;
    last = now;
    const phase = (now % 2200) / 2200;
    map.setPaintProperty("cims-alert-fill", "fill-opacity", 0.2 + 0.14 * Math.sin(phase * Math.PI * 2) ** 2);
    src(RIPPLE)?.setData(polygons(1 + phase * 0.35, 0.9 * (1 - phase)));
  };
  if (!reduced) raf = requestAnimationFrame(tick);

  return () => {
    removed = true;
    cancelAnimationFrame(raf);
    unsubscribe();
    window.removeEventListener("cims:focus-alert", onFocus);
    for (const id of ["cims-alert-label", "cims-alert-center", "cims-alert-ripple", "cims-alert-edge", "cims-alert-fill"]) if (map.getLayer(id)) map.removeLayer(id);
    for (const id of [AREAS, RIPPLE, CENTERS]) if (map.getSource(id)) map.removeSource(id);
  };
}
