/** @file Buildings layer: OSM footprints extruded in the survey style (flat paper walls, ink rim, white roof; flat outlined footprints in 2D), gold roof and gold hatch when selected, names in caps from zoom 16. Click selects; selecting a place also highlights the building it stands in. */
import type { ExpressionSpecification, FillExtrusionLayerSpecification, FilterSpecification, MapLayerMouseEvent, MapMouseEvent } from "maplibre-gl";
import type { MapLayer } from "../types";
import { GOLD, INK, PAPER, PAPER_2, WHITE } from "../palette";
import { addHatchPatterns, HATCH_GOLD } from "../patterns";
import buildingsUrl from "../../data/buildings.geojson?url";
import { loadBuildings, loadedBuildings } from "../../lib/buildings";
import { places } from "../../lib/places";

const SOURCE = "buildings";
const FLAT = "buildings-flat";
const OUTLINE = "buildings-outline";
const WALLS = "buildings-walls";
const WALLS_SELECTED = "buildings-walls-selected";
const RIM = "buildings-rim";
const ROOF = "buildings-roof";
const LABEL = "buildings-label";
const EXTRUDED = [WALLS, WALLS_SELECTED, RIM, ROOF];
const CLICKABLE = [FLAT, ...EXTRUDED];
/** Below this pitch the map is a plan view: buildings are drawn as flat outlined footprints instead of extrusions. */
const FLAT_PITCH = 5;
const NONE = "\u0000none";

/** Meters of white roof slab on top of the walls. */
const ROOF_THICKNESS = 0.4;
/** Meters of ink band under the roof slab: reads as the drafted roof edge. */
const RIM_THICKNESS = 0.9;

/** The building a feature belongs to: its parent for a stacked part (a tower on a podium), else itself. */
const OWNER: ExpressionSpecification = ["coalesce", ["get", "part_of"], ["get", "id"]];
const isSelected = (id: string | null): FilterSpecification => ["==", OWNER, id ?? NONE];
const notSelected = (id: string | null): FilterSpecification => ["!=", OWNER, id ?? NONE];

const buildings: MapLayer = {
  id: "buildings",
  order: 5, // below the pins (pois = 10)
  addTo(map, ctx) {
    const patternIds = addHatchPatterns(map);
    let selectedId: string | null = null;
    let pickedOnMap = false;
    let removed = false;
    let latest = 0; // guards late async results from an older selection

    map.addSource(SOURCE, { type: "geojson", data: buildingsUrl, promoteId: "id", tolerance: 0.5 });
    // Plan view (2D): white footprint, gold when selected. Hidden while the map is tilted.
    map.addLayer({
      id: FLAT,
      type: "fill",
      source: SOURCE,
      layout: { visibility: "none" },
      paint: { "fill-color": ["case", ["boolean", ["feature-state", "selected"], false], GOLD, WHITE], "fill-antialias": false },
    });
    // Ground line before the extrusions, so the extrusions hide it wherever a building stands in front.
    map.addLayer({
      id: OUTLINE,
      type: "line",
      source: SOURCE,
      paint: { "line-color": INK, "line-width": 1 },
    });
    // Walls are a flat paper tone: the fixed light shades each face a little differently, nothing else.
    // Hatching is kept for the selected building only, so it is the one textured thing on the map.
    const wallPaint = (look: FillExtrusionLayerSpecification["paint"]): FillExtrusionLayerSpecification["paint"] => ({
      ...look,
      "fill-extrusion-base": ["get", "min_height"],
      "fill-extrusion-height": ["-", ["get", "height"], ROOF_THICKNESS + RIM_THICKNESS],
      "fill-extrusion-vertical-gradient": false,
    });
    map.addLayer({ id: WALLS, type: "fill-extrusion", source: SOURCE, filter: notSelected(null), paint: wallPaint({ "fill-extrusion-color": PAPER_2 }) });
    map.addLayer({ id: WALLS_SELECTED, type: "fill-extrusion", source: SOURCE, filter: isSelected(null), paint: wallPaint({ "fill-extrusion-pattern": HATCH_GOLD }) });
    map.addLayer({
      id: RIM,
      type: "fill-extrusion",
      source: SOURCE,
      paint: {
        "fill-extrusion-color": INK,
        "fill-extrusion-base": ["-", ["get", "height"], ROOF_THICKNESS + RIM_THICKNESS],
        "fill-extrusion-height": ["-", ["get", "height"], ROOF_THICKNESS],
        "fill-extrusion-vertical-gradient": false,
      },
    });
    map.addLayer({
      id: ROOF,
      type: "fill-extrusion",
      source: SOURCE,
      paint: {
        "fill-extrusion-color": ["case", ["boolean", ["feature-state", "selected"], false], GOLD, WHITE],
        "fill-extrusion-base": ["-", ["get", "height"], ROOF_THICKNESS],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-vertical-gradient": false,
      },
    });
    map.addLayer({
      id: LABEL,
      type: "symbol",
      source: SOURCE,
      minzoom: 16,
      filter: ["has", "name"],
      layout: {
        "text-field": ["get", "name"],
        "text-transform": "uppercase",
        "text-font": ["Open Sans Semibold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 16, 9.5, 18, 12],
        "text-letter-spacing": 0.06,
        "text-max-width": 7,
        "text-line-height": 1.1,
        "text-padding": 10,
      },
      paint: { "text-color": INK, "text-halo-color": PAPER, "text-halo-width": 1.5 },
    });

    // Swap between extrusions and flat footprints when the 2D/3D toggle (or the user) crosses the pitch threshold.
    let flat: boolean | null = null;
    const syncPitch = () => {
      const next = map.getPitch() < FLAT_PITCH;
      if (next === flat) return;
      flat = next;
      map.setLayoutProperty(FLAT, "visibility", flat ? "visible" : "none");
      for (const layer of EXTRUDED) map.setLayoutProperty(layer, "visibility", flat ? "none" : "visible");
    };
    syncPitch();
    map.on("pitch", syncPitch);

    const onClick = (e: MapLayerMouseEvent) => {
      // Only when the building is the topmost thing under the pointer: a pin over a building wins.
      const top = map.queryRenderedFeatures(e.point)[0];
      const id = top?.source === SOURCE ? ((top.properties.part_of ?? top.properties.id) as string | undefined) : undefined;
      if (!id) return;
      pickedOnMap = true;
      ctx.select({ kind: "building", id });
    };
    // A click on bare map clears a selected building (other kinds are left to their own layers).
    const onMapClick = (e: MapMouseEvent) => {
      if (selectedId && map.queryRenderedFeatures(e.point).length === 0) ctx.select(null);
    };
    const onEnter = () => (map.getCanvas().style.cursor = "pointer");
    const onLeave = () => (map.getCanvas().style.cursor = "");
    for (const layer of CLICKABLE) {
      map.on("click", layer, onClick);
      map.on("mouseenter", layer, onEnter);
      map.on("mouseleave", layer, onLeave);
    }
    map.on("click", onMapClick);

    return {
      update(selection) {
        const fromMap = pickedOnMap;
        pickedOnMap = false;
        const mine = ++latest;
        // Gold roof and hatched walls for one building; null clears.
        const highlight = (next: string | null) => {
          if (next === selectedId) return;
          // A building drawn as stacked parts lights up whole: the footprint and every part.
          const withParts = (id: string) => [id, ...(loadedBuildings()?.partsOf.get(id) ?? [])];
          if (selectedId) for (const id of withParts(selectedId)) map.setFeatureState({ source: SOURCE, id }, { selected: false });
          if (next) for (const id of withParts(next)) map.setFeatureState({ source: SOURCE, id }, { selected: true });
          // Parts are known once the index loads; light them then if the click came first.
          if (next && !loadedBuildings()) void loadBuildings().then(() => {
            if (selectedId === next) for (const id of withParts(next)) map.setFeatureState({ source: SOURCE, id }, { selected: true });
          }).catch(() => { /* the footprint is already highlighted */ });
          selectedId = next;
          map.setFilter(WALLS, notSelected(next));
          map.setFilter(WALLS_SELECTED, isSelected(next));
        };
        if (selection?.kind === "building") {
          highlight(selection.id);
          // Picked in a panel (search, card): bring it into view. Picked on the map: it is already there.
          if (!fromMap) {
            void loadBuildings()
              .then((index) => {
                const b = index.byId.get(selection.id);
                if (b && !removed && latest === mine) map.flyTo({ center: b.center, zoom: Math.max(map.getZoom(), 16.5), duration: 800 });
              })
              .catch(() => {});
          }
        } else if (selection?.kind === "place") {
          // A place (list, search, pin): highlight the building it stands in. The pins layer does the fly-to.
          const place = places.features.find((f) => f.properties.id === selection.id);
          if (!place) return highlight(null);
          const [lng, lat] = place.geometry.coordinates;
          const index = loadedBuildings();
          if (index) highlight(index.at(lng, lat)?.id ?? null);
          else {
            void loadBuildings()
              .then((loaded) => {
                if (!removed && latest === mine) highlight(loaded.at(lng, lat)?.id ?? null);
              })
              .catch(() => {});
          }
        } else {
          highlight(null);
        }
      },
      remove() {
        removed = true;
        for (const layer of CLICKABLE) {
          map.off("click", layer, onClick);
          map.off("mouseenter", layer, onEnter);
          map.off("mouseleave", layer, onLeave);
        }
        map.off("click", onMapClick);
        map.off("pitch", syncPitch);
        for (const layer of [LABEL, ROOF, RIM, WALLS_SELECTED, WALLS, OUTLINE, FLAT]) map.removeLayer(layer);
        map.removeSource(SOURCE);
        for (const id of patternIds) if (map.hasImage(id)) map.removeImage(id);
      },
    };
  },
};

export default buildings;
