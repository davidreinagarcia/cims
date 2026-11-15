/** @file Games layer: capture zones, drops, bots and the player drawn from the games store, with 60 fps glide between ticks and a radar ping on drops; also turns map clicks into teleports while "Simular GPS" is on. Empty outside a match. */
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import type { MapLayer } from "../types";
import { NEUTRAL, RADIUS_M, TEAMS } from "../../games/data";
import { getGamesState, subscribeGames, teleport } from "../../games/store";
import type { LngLat } from "../../games/types";

const SRC = { zones: "games-zones", badges: "games-badges", drops: "games-drops", people: "games-people" } as const;
const IDS = ["games-zone-fill", "games-zone-line", "games-zone-dash", "games-range", "games-drop-ping", "games-drop-dot", "games-drop-label", "games-badge", "games-badge-n", "games-zone-name", "games-bot", "games-bot-name", "games-me", "games-me-name"];
const INK = "#1C2733";
const PAPER = "#F3EEE2";
const GOLD = "#B3A369";
const FONT = ["Open Sans Semibold"];
const PING_MS = 2000;

/** Meters to screen pixels at a zoom, for rings that keep their real-world size (campus latitude). */
const mpp = (zoom: number) => (156543.03 * Math.cos((33.775 * Math.PI) / 180)) / 2 ** zoom;
const meters = (m: number, k = 1): never => ["interpolate", ["exponential", 2], ["zoom"], 10, (m * k) / mpp(10), 22, (m * k) / mpp(22)] as never;

/** A closed ring approximating a circle of `radiusM` meters around a point. */
function circle(c: LngLat, radiusM: number): [number, number][] {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((c.lat * Math.PI) / 180));
  return Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * 2 * Math.PI;
    return [c.lng + dLng * Math.cos(a), c.lat + dLat * Math.sin(a)] as [number, number];
  });
}
const empty = { type: "FeatureCollection" as const, features: [] };
const point = (c: LngLat, properties: Record<string, unknown>) => ({ type: "Feature" as const, properties, geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] } });
const colorOf = (team: keyof typeof TEAMS | null | undefined) => (team ? TEAMS[team].color : NEUTRAL);
const ease = (t: number) => 1 - (1 - t) ** 3;

interface Glide { from: LngLat; to: LngLat; t0: number; ms: number; props: Record<string, unknown> }

const games: MapLayer = {
  id: "games",
  order: 60, // above pins and stories: the match is the focus while it runs
  addTo(map: MapLibreMap) {
    for (const id of Object.values(SRC)) map.addSource(id, { type: "geojson", data: empty });
    const label = (extra: Record<string, unknown> = {}): never => ({
      "text-font": FONT, "text-size": 10.5, "text-transform": "uppercase", "text-letter-spacing": 0.08, "text-anchor": "top", "text-offset": [0, 1.1],
      "text-allow-overlap": true, ...extra,
    } as never);
    const halo = { "text-color": INK, "text-halo-color": PAPER, "text-halo-width": 1.8 };

    map.addLayer({ id: IDS[0], type: "fill", source: SRC.zones, paint: { "fill-color": ["get", "color"], "fill-opacity": ["case", ["get", "owned"], 0.3, 0.12] } });
    map.addLayer({ id: IDS[1], type: "line", source: SRC.zones, filter: ["get", "owned"], paint: { "line-color": ["get", "color"], "line-width": 3 } });
    map.addLayer({ id: IDS[2], type: "line", source: SRC.zones, filter: ["!", ["get", "owned"]], paint: { "line-color": INK, "line-width": 1.8, "line-dasharray": [2, 2], "line-opacity": 0.7 } });
    map.addLayer({ id: IDS[3], type: "circle", source: SRC.people, filter: ["==", ["get", "me"], true], paint: { "circle-radius": meters(RADIUS_M), "circle-color": ["get", "color"], "circle-opacity": 0.1, "circle-stroke-color": ["get", "color"], "circle-stroke-width": 1.2, "circle-stroke-opacity": 0.55, "circle-pitch-alignment": "map", "circle-pitch-scale": "map" } });
    map.addLayer({ id: IDS[4], type: "circle", source: SRC.drops, paint: { "circle-radius": meters(RADIUS_M), "circle-color": GOLD, "circle-opacity": 0.1, "circle-stroke-color": GOLD, "circle-stroke-width": 2, "circle-pitch-alignment": "map", "circle-pitch-scale": "map" } });
    map.addLayer({ id: IDS[5], type: "circle", source: SRC.drops, paint: { "circle-radius": 9, "circle-color": GOLD, "circle-stroke-color": INK, "circle-stroke-width": 2 } });
    map.addLayer({ id: IDS[6], type: "symbol", source: SRC.drops, layout: label({ "text-field": "+100", "text-offset": [0, 1.3] }), paint: halo });
    map.addLayer({ id: IDS[7], type: "circle", source: SRC.badges, paint: { "circle-radius": 12, "circle-color": ["get", "color"], "circle-stroke-color": PAPER, "circle-stroke-width": 2.5 } });
    map.addLayer({ id: IDS[8], type: "symbol", source: SRC.badges, layout: { "text-field": ["get", "n"], "text-font": FONT, "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": ["get", "ink"] } });
    map.addLayer({ id: IDS[9], type: "symbol", source: SRC.badges, layout: label({ "text-field": ["get", "name"], "text-offset": [0, 1.4], "text-max-width": 8 }), paint: halo });
    map.addLayer({ id: IDS[10], type: "circle", source: SRC.people, filter: ["==", ["get", "me"], false], paint: { "circle-radius": 8, "circle-color": ["get", "color"], "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2.5 } });
    map.addLayer({ id: IDS[11], type: "symbol", source: SRC.people, filter: ["==", ["get", "me"], false], layout: label({ "text-field": ["get", "name"], "text-size": 9.5, "text-anchor": "bottom", "text-offset": [0, -1] }), paint: halo });
    map.addLayer({ id: IDS[12], type: "circle", source: SRC.people, filter: ["==", ["get", "me"], true], paint: { "circle-radius": 11, "circle-color": ["get", "color"], "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 3.5 } });
    map.addLayer({ id: IDS[13], type: "symbol", source: SRC.people, filter: ["==", ["get", "me"], true], layout: label({ "text-field": "You", "text-anchor": "bottom", "text-offset": [0, -1.4] }), paint: halo });

    const setData = (id: string, features: unknown[]) => (map.getSource(id) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features } as never);

    // Everybody who moves glides between ticks instead of jumping.
    const glides = new Map<string, Glide>();
    let raf = 0;
    const frame = (now: number) => {
      const features = [...glides.values()].map((g) => {
        const k = Math.min(1, (now - g.t0) / g.ms);
        const t = g.ms > 500 ? k : ease(k);
        return point({ lng: g.from.lng + (g.to.lng - g.from.lng) * t, lat: g.from.lat + (g.to.lat - g.from.lat) * t }, g.props);
      });
      setData(SRC.people, features);
      const p = (now % PING_MS) / PING_MS;
      if (map.getLayer(IDS[4])) {
        map.setPaintProperty(IDS[4], "circle-radius", meters(RADIUS_M, 0.3 + 0.7 * p));
        map.setPaintProperty(IDS[4], "circle-stroke-opacity", 1 - p);
      }
      raf = requestAnimationFrame(frame);
    };
    const track = (id: string, to: LngLat, ms: number, props: Record<string, unknown>) => {
      const now = performance.now();
      const prev = glides.get(id);
      let from = to;
      if (prev) {
        const k = Math.min(1, (now - prev.t0) / prev.ms);
        from = { lng: prev.from.lng + (prev.to.lng - prev.from.lng) * k, lat: prev.from.lat + (prev.to.lat - prev.from.lat) * k };
      }
      glides.set(id, { from, to, t0: now, ms, props });
    };

    const stopFrames = () => { cancelAnimationFrame(raf); raf = 0; };
    let run = 0;
    const sync = () => {
      const { game, player, profile } = getGamesState();
      if (!game) { // left the match: nothing of it stays on the map
        stopFrames(); glides.clear(); run = 0;
        for (const id of Object.values(SRC)) setData(id, []);
        return;
      }
      if (game.run !== run) { // a new match (or a rematch): forget every old position
        run = game.run; glides.clear(); stopFrames();
        map.flyTo({ center: [player.lng, player.lat], zoom: 16.6, duration: 1000 });
      }
      setData(SRC.zones, game.zones.map((z) => ({ type: "Feature", properties: { color: colorOf(z.owner), owned: z.owner !== null }, geometry: { type: "Polygon", coordinates: [circle(z, RADIUS_M)] } })));
      setData(SRC.badges, game.zones.map((z, i) => point(z, { n: String(i + 1), name: z.name, color: z.owner ? colorOf(z.owner) : PAPER, ink: z.owner ? "#FFFFFF" : INK })));
      if (game.finished) { // the match is over: stop animating and clear players and drops; the final territories stay under the result card
        stopFrames(); glides.clear();
        setData(SRC.drops, []); setData(SRC.people, []);
        return;
      }
      setData(SRC.drops, game.drops.filter((d) => !d.claimedBy).map((d) => point(d, {})));
      for (const b of game.bots) track(b.id, b, 1000, { color: colorOf(b.team), me: false, name: b.nickname });
      track("me", player, 380, { color: colorOf(profile.team), me: true });
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const unsubscribe = subscribeGames(sync);
    sync();

    const onClick = (e: MapMouseEvent) => teleport({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    map.on("click", onClick);

    return {
      remove() {
        unsubscribe();
        cancelAnimationFrame(raf);
        map.off("click", onClick);
        for (const id of IDS) if (map.getLayer(id)) map.removeLayer(id);
        for (const id of Object.values(SRC)) if (map.getSource(id)) map.removeSource(id);
      },
    };
  },
};
export default games;
