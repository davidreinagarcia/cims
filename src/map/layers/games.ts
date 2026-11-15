/** @file Games layer: capture zones (25 m circles), drops, bots and the player, drawn from the games store; also turns map clicks into teleports while "Simular GPS" is on. Empty (nothing drawn) outside a match. */
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";
import type { MapLayer } from "../types";
import { NEUTRAL, RADIUS_M, TEAMS } from "../../games/data";
import { getGamesState, subscribeGames, teleport } from "../../games/store";
import type { LngLat } from "../../games/types";

const ZONES = "games-zones";
const DROPS = "games-drops";
const PEOPLE = "games-people";
const IDS = [`${ZONES}-fill`, `${ZONES}-line`, `${DROPS}-ring`, `${DROPS}-dot`, `${PEOPLE}-bot`, `${PEOPLE}-me`];

/** A closed ring approximating a circle of `radiusM` meters around a point. */
function circle(c: LngLat, radiusM: number): [number, number][] {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((c.lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    ring.push([c.lng + dLng * Math.cos(a), c.lat + dLat * Math.sin(a)]);
  }
  return ring;
}
const empty = { type: "FeatureCollection" as const, features: [] };
const point = (c: LngLat, properties: Record<string, unknown>) => ({ type: "Feature" as const, properties, geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] } });
const colorOf = (team: keyof typeof TEAMS | null | undefined) => (team ? TEAMS[team].color : NEUTRAL);

const games: MapLayer = {
  id: "games",
  order: 60, // above pins and stories: the match is the focus while it runs
  addTo(map: MapLibreMap) {
    for (const id of [ZONES, DROPS, PEOPLE]) map.addSource(id, { type: "geojson", data: empty });
    map.addLayer({ id: IDS[0], type: "fill", source: ZONES, paint: { "fill-color": ["get", "color"], "fill-opacity": 0.35 } });
    map.addLayer({ id: IDS[1], type: "line", source: ZONES, paint: { "line-color": ["get", "color"], "line-width": 3 } });
    map.addLayer({ id: IDS[2], type: "circle", source: DROPS, paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 15, 6, 19, 90], "circle-color": ["get", "color"], "circle-opacity": 0.2, "circle-stroke-color": ["get", "color"], "circle-stroke-width": 2, "circle-pitch-alignment": "map" } });
    map.addLayer({ id: IDS[3], type: "circle", source: DROPS, paint: { "circle-radius": 7, "circle-color": ["get", "color"], "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2 } });
    map.addLayer({ id: IDS[4], type: "circle", source: PEOPLE, filter: ["==", ["get", "me"], false], paint: { "circle-radius": 8, "circle-color": ["get", "color"], "circle-stroke-color": "#FFFFFF", "circle-stroke-width": 2.5 } });
    map.addLayer({ id: IDS[5], type: "circle", source: PEOPLE, filter: ["==", ["get", "me"], true], paint: { "circle-radius": 11, "circle-color": ["get", "color"], "circle-stroke-color": "#003057", "circle-stroke-width": 4 } });

    const setData = (id: string, features: unknown[]) => (map.getSource(id) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features } as never);
    let wasPlaying = false;
    const sync = () => {
      const { game, player, profile } = getGamesState();
      if (!game) {
        if (wasPlaying) for (const id of [ZONES, DROPS, PEOPLE]) setData(id, []);
        wasPlaying = false;
        return;
      }
      if (!wasPlaying) map.flyTo({ center: [player.lng, player.lat], zoom: 16.4, duration: 900 });
      wasPlaying = true;
      setData(ZONES, game.zones.map((z) => ({ type: "Feature", properties: { color: colorOf(z.owner) }, geometry: { type: "Polygon", coordinates: [circle(z, RADIUS_M)] } })));
      setData(DROPS, game.drops.filter((d) => !d.claimedBy).map((d) => point(d, { color: "#B3A369" })));
      setData(PEOPLE, [
        ...game.bots.map((b) => point(b, { color: colorOf(b.team), me: false })),
        point(player, { color: colorOf(profile.team), me: true }),
      ]);
    };
    const unsubscribe = subscribeGames(sync);
    sync();

    const onClick = (e: MapMouseEvent) => teleport({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    map.on("click", onClick);

    return {
      remove() {
        unsubscribe();
        map.off("click", onClick);
        for (const id of IDS) if (map.getLayer(id)) map.removeLayer(id);
        for (const id of [ZONES, DROPS, PEOPLE]) if (map.getSource(id)) map.removeSource(id);
      },
    };
  },
};
export default games;
