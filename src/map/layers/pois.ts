/** @file Places layer: survey pins per category (glyph inside a paper ring), name labels from zoom 16; the selected place gets a gold pin and always a label. Honors the layer filters. */
import type { ExpressionSpecification, MapLayerMouseEvent, SymbolLayerSpecification } from "maplibre-gl";
import type { MapLayer } from "../types";
import { buildMapFilter } from "../layerFilters";
import { addPins, pinImageId } from "../pins";
import { LAYER_CATALOG } from "../../lib/layerCatalog";
import { places } from "../../lib/places";

const SOURCE = "places";
const PIN = "places-pin";
const LABEL = "places-label";
const SELECTED = "places-pin-selected";
const NONE = "\u0000none";

/** icon-image expression: the category's pin image, or the navy base pin for categories nobody toggles. */
function iconFor(selected: boolean): ExpressionSpecification {
  return [
    "match",
    ["get", "category"],
    ...LAYER_CATALOG.flatMap((c) => [c.id, pinImageId(c.id, selected)]),
    pinImageId("base", selected),
  ] as unknown as ExpressionSpecification;
}

const labelLayout: SymbolLayerSpecification["layout"] = {
  "text-field": ["get", "name"],
  "text-size": 12,
  "text-offset": [0, 0.35],
  "text-anchor": "top",
  "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
  "text-optional": true,
};
const labelPaint = { "text-color": "#1C2733", "text-halo-color": "#F3EEE2", "text-halo-width": 1.5 }; // --ink on --paper

const pois: MapLayer = {
  id: "pois",
  order: 10,
  addTo(map, ctx) {
    const pinIds = addPins(map);
    map.addSource(SOURCE, { type: "geojson", data: places, promoteId: "id" });
    map.addLayer({
      id: PIN,
      type: "symbol",
      source: SOURCE,
      layout: {
        "icon-image": iconFor(false),
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 14, 0.55, 17, 0.8],
      },
      // Unverified drafts (only visible with ?drafts=1) are drawn faded.
      paint: { "icon-opacity": ["case", ["==", ["get", "status"], "draft"], 0.55, 1] },
    });
    map.addLayer({ id: LABEL, type: "symbol", source: SOURCE, minzoom: 16, layout: { ...labelLayout }, paint: labelPaint });
    // The selected place: bigger gold pin, always labeled, drawn on top.
    map.addLayer({
      id: SELECTED,
      type: "symbol",
      source: SOURCE,
      filter: ["==", ["get", "id"], NONE],
      layout: {
        "icon-image": iconFor(true),
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 14, 0.7, 17, 1],
        ...labelLayout,
      },
      paint: labelPaint,
    });

    const onClick = (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) ctx.select({ kind: "place", id });
    };
    const onEnter = () => (map.getCanvas().style.cursor = "pointer");
    const onLeave = () => (map.getCanvas().style.cursor = "");
    for (const layer of [PIN, SELECTED]) {
      map.on("click", layer, onClick);
      map.on("mouseenter", layer, onEnter);
      map.on("mouseleave", layer, onLeave);
    }

    return {
      update(selection) {
        const selectedId = selection?.kind === "place" ? selection.id : null;
        map.setFilter(SELECTED, ["==", ["get", "id"], selectedId ?? NONE]);
        const sel = places.features.find((f) => f.properties.id === selectedId);
        if (sel) map.flyTo({ center: sel.geometry.coordinates as [number, number], zoom: 17, duration: 800 });
      },
      setFilters(filters) {
        const filter = buildMapFilter(filters);
        map.setFilter(PIN, filter);
        map.setFilter(LABEL, filter);
      },
      remove() {
        for (const layer of [PIN, SELECTED]) {
          map.off("click", layer, onClick);
          map.off("mouseenter", layer, onEnter);
          map.off("mouseleave", layer, onLeave);
        }
        map.removeLayer(SELECTED);
        map.removeLayer(LABEL);
        map.removeLayer(PIN);
        map.removeSource(SOURCE);
        for (const id of pinIds) if (map.hasImage(id)) map.removeImage(id);
      },
    };
  },
};

export default pois;
