/** @file Story heat map (Snapchat style): more stories in one spot paint the zone redder; clicking it opens those stories. Also flies to a story's location on "View on map". */
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { MapLayer } from "../types";
import { ensureLoaded, getState, liveStories, openViewer, subscribe } from "../../stories/store";

const SOURCE = "stories";
const HEAT = "stories-heat";
const FOCUS_SOURCE = "stories-focus";
const FOCUS = "stories-focus-ring";
const PIN_LAYERS = ["places-pin", "places-pin-selected", "places-cluster"];
/** Blob radius in screen px by zoom; shared by the paint and the click test so what you see is what you can click. */
const RADIUS: [number, number][] = [[14, 22], [15, 32], [17, 60], [19, 110]];

function radiusAt(zoom: number): number {
  if (zoom <= RADIUS[0][0]) return RADIUS[0][1];
  for (let i = 1; i < RADIUS.length; i++) {
    const [z0, r0] = RADIUS[i - 1];
    const [z1, r1] = RADIUS[i];
    if (zoom <= z1) return r0 + ((zoom - z0) / (z1 - z0)) * (r1 - r0);
  }
  return RADIUS[RADIUS.length - 1][1];
}

const stories: MapLayer = {
  id: "stories",
  order: 8, // above buildings, below pins
  addTo(map: MapLibreMap, ctx) {
    const empty = { type: "FeatureCollection" as const, features: [] };
    map.addSource(SOURCE, { type: "geojson", data: empty });
    map.addSource(FOCUS_SOURCE, { type: "geojson", data: empty });
    map.addLayer({
      id: HEAT, type: "heatmap", source: SOURCE,
      paint: {
        "heatmap-weight": 0.5, // the Gaussian kernel peaks at ~0.4, so ~5 stories on one spot reach deep red
        "heatmap-intensity": 1,
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], ...RADIUS.flat()] as never,
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.9, 19, 0.6],
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(255,225,80,0)", 0.12, "rgba(255,225,80,0.5)", 0.35, "rgba(255,160,20,0.7)",
          0.65, "rgba(230,70,30,0.82)", 1, "rgba(160,15,15,0.92)"],
      },
    });
    map.addLayer({
      id: FOCUS, type: "circle", source: FOCUS_SOURCE,
      paint: { "circle-radius": 18, "circle-color": "rgba(179,163,105,0.25)", "circle-stroke-color": "#003057", "circle-stroke-width": 3 },
    });

    let focusTimer: number | undefined;
    let lastFocus = getState().focus?.nonce ?? 0;
    let lastHeat: boolean | undefined;
    const src = () => map.getSource(SOURCE) as GeoJSONSource | undefined;

    const sync = () => {
      const { stories: all, focus, heat } = getState();
      src()?.setData({
        type: "FeatureCollection",
        features: liveStories(all).map((s) => ({ type: "Feature" as const, properties: { id: s.id }, geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] } })),
      });
      if (heat !== lastHeat) { lastHeat = heat; map.setLayoutProperty(HEAT, "visibility", heat ? "visible" : "none"); }
      if (focus && focus.nonce !== lastFocus) {
        lastFocus = focus.nonce;
        (map.getSource(FOCUS_SOURCE) as GeoJSONSource).setData({ type: "Point", coordinates: [focus.lng, focus.lat] } as never);
        map.flyTo({ center: [focus.lng, focus.lat], zoom: 18.5, duration: 1400 });
        window.clearTimeout(focusTimer);
        focusTimer = window.setTimeout(() => (map.getSource(FOCUS_SOURCE) as GeoJSONSource | undefined)?.setData(empty as never), 9000);
      }
    };
    const unsubscribe = subscribe(sync);
    void ensureLoaded().then(sync);

    /** Stories whose blob covers the point (screen-space, same radius as the paint). */
    const storiesNear = (point: { x: number; y: number }) => {
      const r = radiusAt(map.getZoom()) * 0.75;
      return liveStories(getState().stories).filter((s) => {
        const p = map.project([s.lng, s.lat]);
        return Math.hypot(p.x - point.x, p.y - point.y) <= r;
      });
    };
    const overPin = (point: { x: number; y: number }) => {
      const layers = PIN_LAYERS.filter((id) => map.getLayer(id));
      return layers.length > 0 && map.queryRenderedFeatures([point.x, point.y], { layers }).length > 0;
    };
    const onClick = (e: { point: { x: number; y: number } }) => {
      if (!getState().heat || overPin(e.point)) return;
      const hits = storiesNear(e.point);
      if (!hits.length) return;
      ctx.select(null); // the building under the blob must not steal the panel
      openViewer(hits.map((s) => s.id));
    };
    const onMove = (e: { point: { x: number; y: number } }) => {
      if (!getState().heat) return;
      const canvas = map.getCanvas();
      if (storiesNear(e.point).length && !overPin(e.point)) canvas.style.cursor = "pointer";
      else if (canvas.style.cursor === "pointer" && !map.queryRenderedFeatures([e.point.x, e.point.y], { layers: PIN_LAYERS.filter((id) => map.getLayer(id)) }).length) canvas.style.cursor = "";
    };
    map.on("click", onClick);
    map.on("mousemove", onMove);

    return {
      remove() {
        unsubscribe();
        window.clearTimeout(focusTimer);
        map.off("click", onClick);
        map.off("mousemove", onMove);
        for (const id of [FOCUS, HEAT]) if (map.getLayer(id)) map.removeLayer(id);
        for (const id of [FOCUS_SOURCE, SOURCE]) if (map.getSource(id)) map.removeSource(id);
      },
    };
  },
};

export default stories;
