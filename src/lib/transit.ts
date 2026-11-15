/** @file Bundled official GT routes and stops, shared by the map, stop card and layer controls. */
import raw from "../data/transit.geojson?raw";

/** Sourced static route and stop properties from the official tracker snapshot. */
export interface TransitProperties {
  id: string;
  kind: "route" | "stop";
  category: "transport";
  name: string;
  route_id?: number;
  routes?: string;
}

/** Static transit snapshot bundled with the app so routes and stops also work offline. */
export const transit = JSON.parse(raw) as GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Point, TransitProperties>;
/** Physical bus stops available to select and count alongside transport POIs. */
export const transitStops = transit.features.filter((feature) => feature.properties.kind === "stop");
