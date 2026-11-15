/** @file Transport layer (F-09): GT bus routes in official colors, stops with a popup linking to the official tracker, and live buses polled while the layer is on. */
import maplibregl, { type FilterSpecification, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import type { MapLayer } from "../types";
import { buildMapFilter, isVisible } from "../layerFilters";
import { INK, PAPER, SAGE } from "../palette";
import { fetchBuses, TRACKER_URL, type BusFeature } from "../transitLive";
import { loadTransitNetwork } from "../../lib/transitNetwork";
import { onRouteHighlight } from "../../lib/transitHighlight";
import "../transport.css";

const SOURCE = "transit";
const LIVE = "transit-live";
const CASING = "transit-route-casing";
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

/** Rasterizes a flat top-down SVG bus at double resolution for a crisp one-pixel outline. */
async function busImage(color: string): Promise<HTMLImageElement> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="60" viewBox="0 0 18 30">
    <rect x="2.5" y="1.5" width="13" height="27" rx="3" fill="${color}" stroke="${INK}"/>
    <rect x="4" y="4" width="10" height="5" rx="1" fill="${INK}"/>
    <path d="M5 12v11M13 12v11" stroke="${PAPER}" stroke-width="2"/>
  </svg>`;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  return image;
}

const transport: MapLayer = {
  id: "transport",
  order: 7, // above the buildings (5), below the pins (10)
  addTo(map) {
    let removed = false;
    let on = true;
    const routeNames = new Map<number, string>();
    const routeIcons = new Map<number, string>();
    const images = new Set<string>();
    const popup = new maplibregl.Popup({ className: "cims-stop-popup", offset: 8, maxWidth: "260px" });

    map.addSource(SOURCE, { type: "geojson", data: EMPTY });
    map.addSource(LIVE, { type: "geojson", data: EMPTY });
    // Route lines go under the buildings when that layer exists, so they read as part of the ground.
    const ground = map.getLayer("buildings-flat") ? "buildings-flat" : undefined;
    map.addLayer({
      id: CASING, type: "line", source: SOURCE, filter: ofKind("route"),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": PAPER, "line-width": 5 },
    }, ground);
    map.addLayer(
      {
        id: ROUTES,
        type: "line",
        source: SOURCE,
        filter: ofKind("route"),
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": ["coalesce", ["get", "color"], SAGE], "line-width": 3 },
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
        "circle-stroke-color": INK,
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
    // Live buses use a route-colored bus glyph pointing along the reported heading.
    map.addLayer({
      id: BUSES,
      type: "symbol",
      source: LIVE,
      layout: {
        "icon-image": ["get", "icon"],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 13, 0.65, 17, 1],
        "icon-allow-overlap": true,
        "icon-rotation-alignment": "map",
        "icon-rotate": ["coalesce", ["get", "heading"], 0],
        "text-field": ["get", "route"],
        "text-transform": "uppercase",
        "text-font": LABEL_FONT,
        "text-size": 10,
        "text-anchor": "left",
        "text-offset": [1.3, 0],
        "text-allow-overlap": true,
      },
      paint: labelPaint,
    });
    // Trip planner spotlight: the routes that get you there stay bold, the others fade back.
    const dimmed = (ids: ReadonlySet<number> | null, full: number, faded: number) =>
      ids ? ["case", ["in", ["get", "route_id"], ["literal", [...ids]]], full, faded] : full;
    const offHighlight = onRouteHighlight((ids) => {
      map.setPaintProperty(ROUTES, "line-opacity", dimmed(ids, 1, 0.2));
      map.setPaintProperty(CASING, "line-opacity", dimmed(ids, 1, 0.2));
      map.setPaintProperty(ROUTE_NAMES, "text-opacity", dimmed(ids, 1, 0));
      map.setPaintProperty(BUSES, "icon-opacity", dimmed(ids, 1, 0.25));
      map.setPaintProperty(BUSES, "text-opacity", dimmed(ids, 1, 0));
    });
    const filtered = [CASING, ROUTES, ROUTE_NAMES, STOPS, STOP_NAMES];
    const live = [BUSES];

    // Poll only while the layer is on and the tab is visible. One request at a time: a slow tracker is waited
    // for up to 15 seconds. A failed poll clears the buses instead of freezing them in place.
    let timer: number | undefined;
    let expiry: number | undefined;
    let currentBuses: BusFeature[] = [];
    let inFlight: AbortController | null = null;
    let loading = false;
    const setBuses = (features: GeoJSON.Feature[]) => (map.getSource(LIVE) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    const publish = (buses: BusFeature[]) => {
      window.clearTimeout(expiry);
      currentBuses = buses.filter((bus) => bus.properties.expires_at > Date.now());
      setBuses(currentBuses.map((bus) => ({ ...bus, properties: { ...bus.properties, icon: routeIcons.get(bus.properties.route_id) } })));
      if (currentBuses.length) expiry = window.setTimeout(() => publish(currentBuses),
        Math.max(1, Math.min(...currentBuses.map((bus) => bus.properties.expires_at)) - Date.now()));
    };
    const active = () => !removed && on && !document.hidden;
    const poll = async () => {
      if (!active() || !routeNames.size || inFlight) return;
      const request = (inFlight = new AbortController());
      const deadline = window.setTimeout(() => request.abort(), 15_000);
      try {
        const buses = await fetchBuses(routeNames, request.signal);
        if (active()) publish(buses);
      } catch {
        if (active() && inFlight === request) publish([]);
      } finally {
        window.clearTimeout(deadline);
        if (inFlight === request) inFlight = null;
      }
    };
    const stop = () => {
      window.clearInterval(timer);
      inFlight?.abort();
      inFlight = null;
      publish([]);
    };
    // Routes and stops are loaded on first use and again on the next activation if that download failed.
    const loadStatic = async () => {
      if (routeNames.size || loading) return;
      loading = true;
      try {
        const data = (await loadTransitNetwork()).geojson;
        if (removed) return;
        for (const f of data.features) {
          if (f.properties?.kind !== "route") continue;
          const color = /^#[0-9a-f]{6}$/i.test(f.properties.color ?? "") ? f.properties.color : SAGE;
          const icon = `transit-bus-${color.slice(1)}`;
          if (!map.hasImage(icon)) {
            const image = await busImage(color);
            if (removed) return;
            map.addImage(icon, image, { pixelRatio: 2, sdf: false });
            images.add(icon);
          }
          routeIcons.set(f.properties.route_id, icon);
        }
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
      name.textContent = f.properties.name ?? "Bus";
      const routes = document.createElement("span");
      routes.textContent = f.properties.routes ?? f.properties.route;
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
    map.on("click", BUSES, onStopClick);
    map.on("mouseenter", BUSES, onEnter);
    map.on("mouseleave", BUSES, onLeave);
    map.on("click", STOPS, onStopClick);
    map.on("mouseenter", STOPS, onEnter);
    map.on("mouseleave", STOPS, onLeave);

    return {
      setFilters(filters) {
        const extra = buildMapFilter(filters);
        for (const id of filtered) {
          const kind = ofKind(id === CASING || id === ROUTES || id === ROUTE_NAMES ? "route" : "stop");
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
        offHighlight();
        stop();
        popup.remove();
        document.removeEventListener("visibilitychange", onVisibility);
        map.off("click", BUSES, onStopClick);
        map.off("mouseenter", BUSES, onEnter);
        map.off("mouseleave", BUSES, onLeave);
        map.off("click", STOPS, onStopClick);
        map.off("mouseenter", STOPS, onEnter);
        map.off("mouseleave", STOPS, onLeave);
        for (const id of [...live, ...filtered.slice().reverse()]) map.removeLayer(id);
        for (const image of images) if (map.hasImage(image)) map.removeImage(image);
        map.removeSource(LIVE);
        map.removeSource(SOURCE);
      },
    };
  },
};

/** Official routes, stops and fresh live bus glyphs. */
export default transport;
