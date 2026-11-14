/** @file Places layer: navy markers with gold rings and name labels; highlights and flies to the selected place. */
import type { MapLayerMouseEvent } from "maplibre-gl";
import type { MapLayer } from "../types";
import { places } from "../../lib/places";

const SOURCE = "places";
const CIRCLE = "places-circle";
const LABEL = "places-label";

const pois: MapLayer = {
  id: "pois",
  order: 10,
  addTo(map, ctx) {
    map.addSource(SOURCE, { type: "geojson", data: places, promoteId: "id" });
    map.addLayer({
      id: CIRCLE,
      type: "circle",
      source: SOURCE,
      paint: {
        "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 11, 7],
        "circle-color": "#003057",
        "circle-stroke-color": "#B3A369",
        "circle-stroke-width": 2.5,
      },
    });
    map.addLayer({
      id: LABEL,
      type: "symbol",
      source: SOURCE,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 12,
        "text-offset": [0, 1.4],
        "text-anchor": "top",
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
      },
      paint: { "text-color": "#003057", "text-halo-color": "#fff", "text-halo-width": 1.5 },
    });

    const onClick = (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) ctx.select({ kind: "place", id });
    };
    const onEnter = () => (map.getCanvas().style.cursor = "pointer");
    const onLeave = () => (map.getCanvas().style.cursor = "");
    map.on("click", CIRCLE, onClick);
    map.on("mouseenter", CIRCLE, onEnter);
    map.on("mouseleave", CIRCLE, onLeave);

    return {
      update(selection) {
        const selectedId = selection?.kind === "place" ? selection.id : null;
        for (const f of places.features) {
          map.setFeatureState({ source: SOURCE, id: f.properties.id }, { selected: f.properties.id === selectedId });
        }
        const sel = places.features.find((f) => f.properties.id === selectedId);
        if (sel) map.flyTo({ center: sel.geometry.coordinates as [number, number], zoom: 17, duration: 800 });
      },
      remove() {
        map.off("click", CIRCLE, onClick);
        map.off("mouseenter", CIRCLE, onEnter);
        map.off("mouseleave", CIRCLE, onLeave);
        map.removeLayer(LABEL);
        map.removeLayer(CIRCLE);
        map.removeSource(SOURCE);
      },
    };
  },
};

export default pois;
