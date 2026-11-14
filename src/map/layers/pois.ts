/** @file Places layer: markers with gold rings and name labels (layer categories colored, honors the layer filters); highlights and flies to the selected place. */
import type { ExpressionSpecification, MapLayerMouseEvent } from "maplibre-gl";
import type { MapLayer } from "../types";
import { buildMapFilter } from "../layerFilters";
import { LAYER_CATALOG, categoryColor } from "../../lib/layerCatalog";
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
        // Layer categories take their token color; base places (landmarks, buildings) stay navy.
        "circle-color": [
          "match",
          ["get", "category"],
          ...LAYER_CATALOG.flatMap((c) => [c.id, categoryColor(c)]),
          "#003057", // --navy
        ] as unknown as ExpressionSpecification,
        "circle-stroke-color": "#B3A369", // --gold (a ring, never text)
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
      paint: { "text-color": "#1C2733", "text-halo-color": "#F3EEE2", "text-halo-width": 1.5 }, // --ink on --paper
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
      setFilters(filters) {
        const filter = buildMapFilter(filters);
        map.setFilter(CIRCLE, filter);
        map.setFilter(LABEL, filter);
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
