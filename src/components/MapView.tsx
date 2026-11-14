import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { CAMPUS, TILE_ATTRIBUTION, TILE_URL } from "../config";
import { places } from "../lib/places";

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function MapView({ selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const map = new maplibregl.Map({
      container: container.current!,
      center: CAMPUS.center,
      zoom: CAMPUS.zoom,
      maxBounds: CAMPUS.bounds,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          osm: { type: "raster", tiles: [TILE_URL], tileSize: 256, attribution: TILE_ATTRIBUTION },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("places", { type: "geojson", data: places, promoteId: "id" });
      map.addLayer({
        id: "places-circle",
        type: "circle",
        source: "places",
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 11, 7],
          "circle-color": "#003057",
          "circle-stroke-color": "#B3A369",
          "circle-stroke-width": 2.5,
        },
      });
      map.addLayer({
        id: "places-label",
        type: "symbol",
        source: "places",
        layout: { "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 1.4], "text-anchor": "top", "text-font": ["Open Sans Regular"] },
        paint: { "text-color": "#003057", "text-halo-color": "#fff", "text-halo-width": 1.5 },
      });
      map.on("click", "places-circle", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) onSelectRef.current(id);
      });
      map.on("mouseenter", "places-circle", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "places-circle", () => (map.getCanvas().style.cursor = ""));
    });

    mapRef.current = map;
    return () => map.remove();
  }, []);

  // Fly to and highlight the selected place.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      for (const f of places.features) {
        map.setFeatureState({ source: "places", id: f.properties.id }, { selected: f.properties.id === selectedId });
      }
      const sel = places.features.find((f) => f.properties.id === selectedId);
      if (sel) map.flyTo({ center: sel.geometry.coordinates as [number, number], zoom: 17, duration: 800 });
    };
    if (map.isStyleLoaded() && map.getSource("places")) apply();
    else map.once("idle", apply);
  }, [selectedId]);

  return <div ref={container} className="map" />;
}
