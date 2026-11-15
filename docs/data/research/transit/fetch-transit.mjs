/** @file Rebuilds routes.geojson and stops.geojson from the Georgia Tech bus tracker relay (read only, no dependencies). */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RELAY = 'https://bus.gatech.edu/Services/JSONPRelay.svc/';
const ROUTES_FILE = 'GetRoutesForMapWithScheduleWithEncodedLine';
const here = dirname(fileURLToPath(import.meta.url));

/** Decodes a Google encoded polyline (precision 5) into [lon, lat] pairs. */
export function decodePolyline(text) {
  const out = [];
  let i = 0, lat = 0, lon = 0;
  while (i < text.length) {
    const deltas = [];
    for (let k = 0; k < 2; k++) {
      let shift = 0, result = 0, byte;
      do {
        byte = text.charCodeAt(i++) - 63;
        result |= (byte & 31) << shift;
        shift += 5;
      } while (byte >= 32);
      deltas.push(result & 1 ? ~(result >> 1) : result >> 1);
    }
    lat += deltas[0];
    lon += deltas[1];
    out.push([Math.round(lon) / 1e5, Math.round(lat) / 1e5]);
  }
  return out;
}

/** Turns the relay's route list into the two GeoJSON collections we publish. */
export function buildGeoJson(routes) {
  const lines = [];
  const stops = [];
  for (const route of [...routes].sort((a, b) => a.Order - b.Order)) {
    const properties = {
      route_id: route.RouteID,
      name: route.Description,
      color: route.MapLineColor,
      gtfs_id: route.GtfsId,
      schedule_text: (route.InfoText || '').trim(),
      running_when_captured: route.IsRunning,
      stop_count: (route.Stops || []).length,
    };
    if (route.EncodedPolyline) {
      lines.push({ type: 'Feature', properties, geometry: { type: 'LineString', coordinates: decodePolyline(route.EncodedPolyline) } });
    }
    for (const stop of [...(route.Stops || [])].sort((a, b) => a.Order - b.Order)) {
      stops.push({
        type: 'Feature',
        properties: {
          route_id: route.RouteID, route: route.Description, order: stop.Order, name: stop.Name,
          gtfs_id: stop.GtfsId, seconds_to_next_stop: stop.SecondsToNextStop, seconds_at_stop: stop.SecondsAtStop,
        },
        geometry: { type: 'Point', coordinates: [Math.round(stop.Longitude * 1e6) / 1e6, Math.round(stop.Latitude * 1e6) / 1e6] },
      });
    }
  }
  return { lines, stops };
}

const collection = features => JSON.stringify({ type: 'FeatureCollection', features }) + '\n';

/** CLI: `node fetch-transit.mjs` fetches live; `--from-dir DIR` reads a saved GetRoutes... .json instead. */
async function main() {
  const dirFlag = process.argv.indexOf('--from-dir');
  let routes;
  if (dirFlag > 0) {
    routes = JSON.parse(await readFile(join(process.argv[dirFlag + 1], `${ROUTES_FILE}.json`), 'utf8'));
  } else {
    const response = await fetch(RELAY + ROUTES_FILE, { headers: { 'User-Agent': 'cims-research/1.0' } });
    if (!response.ok) throw new Error(`Relay answered ${response.status}`);
    routes = await response.json();
  }
  const { lines, stops } = buildGeoJson(routes);
  await writeFile(join(here, 'routes.geojson'), collection(lines));
  await writeFile(join(here, 'stops.geojson'), collection(stops));
  console.log(`Wrote ${lines.length} routes and ${stops.length} stops.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
