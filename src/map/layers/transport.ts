/** @file Transport layer (F-09): GT bus routes as sage double lines, stops using shared selection, and live buses polled while the layer is on. */
import { type FilterSpecification, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import type { MapLayer } from "../types";
import { buildMapFilter, isVisible } from "../layerFilters";
import { INK, PAPER, GOLD, CAT_TRANSPORT } from "../palette";
import { fetchBuses } from "../transitLive";
import { transit } from "../../lib/transit";
import "../transport.css";

const SOURCE = "transit";
const LIVE = "transit-live";
const ROUTES = "transit-routes";
const ROUTE_NAMES = "transit-route-names";
const STOPS = "transit-stops";
const STOP_NAMES = "transit-stop-names";
const BUSES = "transit-buses";
const POLL_MS = 10_000;
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

const ofKind = (kind: string): FilterSpecification => ["==", ["get", "kind"], kind];
const LABEL_FONT = ["Open Sans Semibold"];
const labelPaint = { "text-color": INK, "text-halo-color": PAPER, "text-halo-width": 1.5 };

const transport: MapLayer = {
  id: "transport",
  order: 7, // above the buildings (5), below the pins (10)
  addTo(map, ctx) {
    let removed = false;
    let on = true;
    const routeNames = new Map<number, string>();
    let selectedId: string | null = null;
    let warned = false;

    map.addSource(SOURCE, { type: "geojson", data: transit });
    map.addSource(LIVE, { type: "geojson", data: EMPTY });
    for (const f of transit.features) if (f.properties.kind === "route" && f.properties.route_id !== undefined) routeNames.set(f.properties.route_id, f.properties.name);
    // Route lines go under the buildings when that layer exists, so they read as part of the ground.
    const ground = map.getLayer("buildings-flat") ? "buildings-flat" : undefined;
    map.addLayer(
      {
        id: ROUTES,
        type: "line",
        source: SOURCE,
        filter: ofKind("route"),
        layout: { "line-join": "round" },
        paint: { "line-color": CAT_TRANSPORT, "line-width": 1.25, "line-gap-width": ["interpolate", ["linear"], ["zoom"], 13, 1, 17, 3] },
      },
      ground,
    );
    map.addLayer({
      id: ROUTE_NAMES,
      type: "symbol",
      source: SOURCE,
      minzoom: 15,
      filter: ofKind("route"),
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 400,
        "text-field": ["get", "name"],
        "text-transform": "uppercase",
        "text-font": LABEL_FONT,
        "text-size": 10,
        "text-letter-spacing": 0.12,
      },
      paint: labelPaint,
    }, map.getLayer("buildings-label") ? "buildings-label" : undefined);
    map.addLayer({
      id: STOPS,
      type: "circle",
      source: SOURCE,
      minzoom: 14,
      filter: ofKind("stop"),
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 2.5, 17, 5],
        "circle-color": PAPER,
        "circle-stroke-color": CAT_TRANSPORT,
        "circle-stroke-width": 2,
      },
    });
    map.addLayer({
      id: STOP_NAMES,
      type: "symbol",
      source: SOURCE,
      minzoom: 16.5,
      filter: ofKind("stop"),
      layout: { "text-field": ["get", "name"], "text-font": LABEL_FONT, "text-size": 10, "text-anchor": "top", "text-offset": [0, 0.7], "text-max-width": 9, "text-optional": true },
      paint: labelPaint,
    });
    // Live buses: a solid sage disc with an ink ring and the route name.
    map.addLayer({
      id: BUSES,
      type: "symbol",
      source: LIVE,
      layout: {
        "text-field": ["get", "route"],
        "text-transform": "uppercase",
        "text-font": LABEL_FONT,
        "text-size": 10,
        "text-anchor": "left",
        "text-offset": [1, 0],
        "text-allow-overlap": true,
      },
      paint: labelPaint,
    });
    map.addLayer(
      {
        id: `${BUSES}-dot`,
        type: "circle",
        source: LIVE,
        paint: { "circle-radius": 6, "circle-color": CAT_TRANSPORT, "circle-stroke-color": INK, "circle-stroke-width": 1.5 },
      },
      BUSES,
    );
    const filtered = [ROUTES, ROUTE_NAMES, STOPS, STOP_NAMES];
    const live = [BUSES, `${BUSES}-dot`];

    // Poll only while the layer is on and the tab is visible. One request at a time: a slow tracker is waited
    // for, with a bounded timeout. A failed poll clears the buses instead of freezing them in place.
    let timer: number | undefined;
    let inFlight: AbortController | null = null;
    const setBuses = (features: GeoJSON.Feature[]) => (map.getSource(LIVE) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    const active = () => !removed && on && !document.hidden && navigator.onLine;
    const poll = async () => {
      if (!active() || !routeNames.size || inFlight) return;
      const request = (inFlight = new AbortController());
      const timeout = window.setTimeout(() => request.abort(), POLL_MS);
      try {
        const buses = await fetchBuses(routeNames, request.signal);
        if (active() && inFlight === request) { setBuses(buses); warned = false; }
      } catch (err) {
        if (!removed && inFlight === request) {
          setBuses([]);
          if ((err as Error).name !== "AbortError" && !warned) {
            console.warn("Live transit unavailable; static routes and stops remain available.");
            warned = true;
          }
        }
      } finally {
        window.clearTimeout(timeout);
        if (inFlight === request) inFlight = null;
      }
    };
    const stop = () => {
      window.clearInterval(timer);
      inFlight?.abort();
      inFlight = null;
      setBuses([]);
    };
    const start = () => {
      window.clearInterval(timer);
      void poll();
      timer = window.setInterval(poll, POLL_MS);
    };
    // Hidden tab: stop asking and drop the positions, so nothing stale is on screen when the user comes back.
    const onVisibility = () => (active() ? start() : stop());
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onVisibility);
    window.addEventListener("offline", onVisibility);

    const onStopClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.geometry.type !== "Point") return;
      // POI pins above a stop keep their existing click behavior.
      const layers = map.getStyle().layers.filter((layer) => layer.id.startsWith("places-")).map((layer) => layer.id);
      if (layers.length && map.queryRenderedFeatures(e.point, { layers }).length) return;
      ctx.select({ kind: "stop", id: String(f.properties.id) });
    };
    const onEnter = () => (map.getCanvas().style.cursor = "pointer");
    const onLeave = () => (map.getCanvas().style.cursor = "");
    map.on("click", STOPS, onStopClick);
    map.on("mouseenter", STOPS, onEnter);
    map.on("mouseleave", STOPS, onLeave);

    return {
      update(selection) {
        selectedId = selection?.kind === "stop" ? selection.id : null;
        map.setPaintProperty(STOPS, "circle-color", ["case", ["==", ["get", "id"], selectedId ?? ""], GOLD, PAPER]);
      },
      setFilters(filters) {
        const extra = buildMapFilter(filters);
        for (const id of filtered) {
          const kind = ofKind(id === ROUTES || id === ROUTE_NAMES ? "route" : "stop");
          map.setFilter(id, extra ? (["all", kind, extra] as FilterSpecification) : kind);
        }
        const next = isVisible(filters, "transport");
        for (const id of live) map.setLayoutProperty(id, "visibility", next ? "visible" : "none");
        if (next === on && timer !== undefined) return;
        on = next;
        if (on) start();
        else {
          stop();
          if (selectedId) ctx.select(null);
        }
      },
      remove() {
        removed = true;
        stop();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("online", onVisibility);
        window.removeEventListener("offline", onVisibility);
        map.off("click", STOPS, onStopClick);
        map.off("mouseenter", STOPS, onEnter);
        map.off("mouseleave", STOPS, onLeave);
        for (const id of [...live, ...filtered.slice().reverse()]) map.removeLayer(id);
        map.removeSource(LIVE);
        map.removeSource(SOURCE);
      },
    };
  },
};

/** Transport routes, selectable stops and fresh live positions using the shared layer controls. */
export default transport;
