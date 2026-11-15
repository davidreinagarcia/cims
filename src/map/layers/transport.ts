/** @file Transport layer (F-09): GT bus routes as sage double lines, stops with a popup linking to the official tracker, and live buses polled while the layer is on. */
import maplibregl, { type FilterSpecification, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import type { MapLayer } from "../types";
import { buildMapFilter, isVisible } from "../layerFilters";
import { INK, PAPER, SAGE } from "../palette";
import { fetchBuses, TRACKER_URL } from "../transitLive";
import transitUrl from "../../data/transit.geojson?url";
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
  addTo(map) {
    let removed = false;
    let on = true;
    const routeNames = new Map<number, string>();
    const popup = new maplibregl.Popup({ className: "cims-stop-popup", offset: 8, maxWidth: "260px" });

    map.addSource(SOURCE, { type: "geojson", data: EMPTY });
    map.addSource(LIVE, { type: "geojson", data: EMPTY });
    // Route lines go under the buildings when that layer exists, so they read as part of the ground.
    const ground = map.getLayer("buildings-flat") ? "buildings-flat" : undefined;
    map.addLayer(
      {
        id: ROUTES,
        type: "line",
        source: SOURCE,
        filter: ofKind("route"),
        layout: { "line-join": "round" },
        paint: { "line-color": SAGE, "line-width": 1.25, "line-gap-width": ["interpolate", ["linear"], ["zoom"], 13, 1, 17, 3] },
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
      paint: { ...labelPaint, "text-color": SAGE },
    });
    map.addLayer({
      id: STOPS,
      type: "circle",
      source: SOURCE,
      minzoom: 14,
      filter: ofKind("stop"),
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 2.5, 17, 5],
        "circle-color": PAPER,
        "circle-stroke-color": SAGE,
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
        paint: { "circle-radius": 6, "circle-color": SAGE, "circle-stroke-color": INK, "circle-stroke-width": 1.5 },
      },
      BUSES,
    );
    const filtered = [ROUTES, ROUTE_NAMES, STOPS, STOP_NAMES];
    const live = [BUSES, `${BUSES}-dot`];

    // Poll only while the layer is on and the tab is visible. One request at a time: a slow tracker is waited
    // for, not aborted and re-asked. A failed poll clears the buses instead of freezing them in place.
    let timer: number | undefined;
    let inFlight: AbortController | null = null;
    let loading = false;
    const setBuses = (features: GeoJSON.Feature[]) => (map.getSource(LIVE) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    const active = () => !removed && on && !document.hidden;
    const poll = async () => {
      if (!active() || !routeNames.size || inFlight) return;
      const request = (inFlight = new AbortController());
      try {
        const buses = await fetchBuses(routeNames, request.signal);
        if (active()) setBuses(buses);
      } catch (err) {
        if ((err as Error).name !== "AbortError" && !removed) setBuses([]);
      } finally {
        if (inFlight === request) inFlight = null;
      }
    };
    const stop = () => {
      window.clearInterval(timer);
      inFlight?.abort();
      inFlight = null;
      setBuses([]);
    };
    // Routes and stops are loaded on first use and again on the next activation if that download failed.
    const loadStatic = async () => {
      if (routeNames.size || loading) return;
      loading = true;
      try {
        const data: GeoJSON.FeatureCollection = await (await fetch(transitUrl)).json();
        if (removed) return;
        for (const f of data.features) if (f.properties?.kind === "route") routeNames.set(f.properties.route_id, f.properties.name);
        (map.getSource(SOURCE) as GeoJSONSource).setData(data);
      } catch {
        // offline or a bad deploy: the layer stays empty and start() tries again next time
      } finally {
        loading = false;
      }
    };
    const start = () => {
      window.clearInterval(timer);
      void loadStatic().then(poll);
      timer = window.setInterval(poll, POLL_MS);
    };
    // Hidden tab: stop asking and drop the positions, so nothing stale is on screen when the user comes back.
    const onVisibility = () => (active() ? start() : stop());
    document.addEventListener("visibilitychange", onVisibility);
    if (active()) start();

    const onStopClick = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f || f.geometry.type !== "Point") return;
      const box = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = f.properties.name;
      const routes = document.createElement("span");
      routes.textContent = f.properties.routes;
      const link = document.createElement("a");
      link.href = TRACKER_URL;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Live arrivals on bus.gatech.edu";
      box.append(name, routes, link);
      popup.setLngLat(f.geometry.coordinates as [number, number]).setDOMContent(box).addTo(map);
    };
    const onEnter = () => (map.getCanvas().style.cursor = "pointer");
    const onLeave = () => (map.getCanvas().style.cursor = "");
    map.on("click", STOPS, onStopClick);
    map.on("mouseenter", STOPS, onEnter);
    map.on("mouseleave", STOPS, onLeave);

    return {
      setFilters(filters) {
        const extra = buildMapFilter(filters);
        for (const id of filtered) {
          const kind = ofKind(id === ROUTES || id === ROUTE_NAMES ? "route" : "stop");
          map.setFilter(id, extra ? (["all", kind, extra] as FilterSpecification) : kind);
        }
        const next = isVisible(filters, "transport");
        for (const id of live) map.setLayoutProperty(id, "visibility", next ? "visible" : "none");
        if (next === on) return;
        on = next;
        if (on) start();
        else {
          stop();
          popup.remove();
        }
      },
      remove() {
        removed = true;
        stop();
        popup.remove();
        document.removeEventListener("visibilitychange", onVisibility);
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

export default transport;
