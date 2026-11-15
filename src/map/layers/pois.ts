/** @file Filtered place clusters, survey pins and labels, with a separate gold selected pin and a shared-location picker. */
import type { ExpressionSpecification, GeoJSONSource, MapLayerMouseEvent, Popup, SymbolLayerSpecification } from "maplibre-gl";
import { loadMapLibre } from "../maplibre";
import { locationDetails } from "../../lib/buildingPlaces";
import type { MapLayer } from "../types";
import { isVisible } from "../layerFilters";
import { addPins, pinImageId } from "../pins";
import { SUBTYPE_GLYPHS } from "../../components/Glyph";
import { LAYER_CATALOG } from "../../lib/layerCatalog";
import { places, type PlaceCollection, type PlaceFeature } from "../../lib/places";
import { refreshUserPosts, subscribeUserPosts, userPostFeatures } from "../../lib/bulletinPosts";
import { loadBuildings } from "../../lib/buildings";
import "./pois.css";

const ATTACHED = "places-attached";
const ATTACHED_COUNT = "places-attached-count";
const ATTACHED_HIGHLIGHT = "places-attached-highlight";
const SOURCE = "places";
const PIN = "places-pin";
const LABEL = "places-label";
const SELECTED = "places-pin-selected";
const SELECTED_SOURCE = "places-selected";
const CLUSTER = "places-cluster";
const COUNT = "places-cluster-count";
const CLUSTER_MAX_ZOOM = 22;
const UNCLUSTERED: ExpressionSpecification = ["!", ["has", "point_count"]];

/** icon-image expression: the sub-type's pin (coffee, dining hall) or the category's pin image, or the navy base pin for categories nobody toggles. */
function iconFor(selected: boolean): ExpressionSpecification {
  const own = LAYER_CATALOG.flatMap((c) => c.subtypes.filter((sub) => SUBTYPE_GLYPHS[sub.id]).map((sub) => [c.id, sub.id]));
  const bySubtype = own.flatMap(([category, sub]) => [
    ["all", ["==", ["get", "category"], category], ["==", ["get", "subtype"], sub]], pinImageId(`${category}-${sub}`, selected)]);
  return [
    "case", ...bySubtype, [
    "match",
    ["get", "category"],
    ...LAYER_CATALOG.flatMap((c) => [c.id, pinImageId(c.id, selected)]),
    pinImageId("base", selected),
  ]] as unknown as ExpressionSpecification;
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
    let popup: Popup | undefined;
    let request = 0;
    let removed = false;
    map.addSource(SOURCE, {
      type: "geojson", data: { ...places, features: places.features.filter(f => locationDetails(f).coord_precision !== "building") }, promoteId: "id",
      cluster: true, clusterRadius: 40, clusterMaxZoom: CLUSTER_MAX_ZOOM,
      // Keep the cluster tree available at the map's maximum zoom (default 22).
      maxzoom: CLUSTER_MAX_ZOOM + 1, // MapLibre requires maxzoom > clusterMaxZoom
    });
    const source = map.getSource(SOURCE) as GeoJSONSource;
    const attachedData = (features: typeof places.features): GeoJSON.FeatureCollection<GeoJSON.Point> => {
      const groups = new Map<string, { place: typeof features[number]; count: number }>();
      for (const place of features) {
        if (locationDetails(place).coord_precision !== "building" || !place.properties.building_id) continue;
        const key = `${place.properties.building_id}:${place.properties.category}`;
        const group = groups.get(key);
        if (group) group.count++; else groups.set(key, { place, count: 1 });
      }
      const categories = new Map<string, string[]>();
      for (const { place } of groups.values()) {
        const id = place.properties.building_id!;
        categories.set(id, [...(categories.get(id) ?? []), place.properties.category].sort());
      }
      return { type: "FeatureCollection", features: [...groups.entries()].map(([id, { place, count }]) => {
        const cats = categories.get(place.properties.building_id!)!;
        const offset = (cats.indexOf(place.properties.category) - (cats.length - 1) / 2) * 30;
        return { type: "Feature", geometry: place.geometry, properties: {
          id, building_id: place.properties.building_id, category: place.properties.category,
          name: `${place.properties.category} inside building`, count, iconOffset: [offset / 0.8, 0], textOffset: [(offset + 12) / 11, -2.5],
        } };
      }) };
    };
    // Bulletin posts written by accounts sit in their building like any org event (badge on the footprint).
    let lastFilters: Parameters<typeof isVisible>[0] | undefined;
    const withPosts = (features: typeof places.features) => [...features, ...userPostFeatures().filter((f) =>
      !lastFilters || isVisible(lastFilters, f.properties.category, f.properties.subtype)).map((f) =>
      ({ ...f, properties: { ...f.properties, coord_precision: "building" } }) as unknown as PlaceFeature)];
    map.addSource(ATTACHED, { type: "geojson", data: attachedData(withPosts(places.features)) });
    const attachedSource = map.getSource(ATTACHED) as GeoJSONSource;
    let visibleNow = places.features;
    const refreshPosts = () => { if (!removed) attachedSource.setData(attachedData(withPosts(visibleNow))); };
    const stopPosts = subscribeUserPosts(refreshPosts);
    void loadBuildings().then(() => refreshUserPosts()).catch(() => undefined);
    // An association outline remains reliable even when a centroid falls in a courtyard.
    map.addLayer({ id: ATTACHED_HIGHLIGHT, type: "line", source: "buildings",
      filter: ["==", ["get", "id"], ""], paint: { "line-color": "#B3A369", "line-width": 5 } });

    const empty: PlaceCollection = { type: "FeatureCollection", features: [] };
    map.addSource(SELECTED_SOURCE, { type: "geojson", data: empty, promoteId: "id" });
    const selectedSource = map.getSource(SELECTED_SOURCE) as GeoJSONSource;
    map.addLayer({
      id: CLUSTER, type: "circle", source: SOURCE, filter: ["has", "point_count"],
      paint: {
        "circle-color": "#003057", "circle-stroke-color": "#B3A369", "circle-stroke-width": 2,
        "circle-radius": ["step", ["get", "point_count"], 16, 10, 19, 25, 22, 100, 26],
      },
    });
    map.addLayer({
      id: COUNT, type: "symbol", source: SOURCE, filter: ["has", "point_count"],
      layout: {
        "text-field": ["to-string", ["get", "point_count"]],
        "text-font": labelLayout["text-font"], "text-size": 12, "text-allow-overlap": true,
      },
      paint: { "text-color": "#F3EEE2" },
    });
    map.addLayer({
      id: PIN,
      type: "symbol",
      source: SOURCE,
      filter: UNCLUSTERED,
      layout: {
        "icon-image": iconFor(false),
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 14, 0.55, 17, 0.8],
      },
      // Unverified drafts (only visible with ?drafts=1) are drawn faded.
      paint: { "icon-opacity": ["case", ["==", ["get", "status"], "draft"], 0.55, 1] },
    });
    map.addLayer({ id: LABEL, type: "symbol", source: SOURCE, filter: UNCLUSTERED, minzoom: 16, layout: { ...labelLayout }, paint: labelPaint });
    // The selected place: bigger gold pin, always labeled, drawn on top.
    map.addLayer({
      id: SELECTED,
      type: "symbol",
      source: SELECTED_SOURCE,
      layout: {
        "icon-image": iconFor(true),
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 14, 0.7, 17, 1],
        ...labelLayout,
        "text-allow-overlap": true,
        "text-optional": false,
      },
      paint: labelPaint,
    });


    map.addLayer({ id: ATTACHED, type: "symbol", source: ATTACHED,
      layout: { "icon-image": iconFor(false), "icon-anchor": "bottom", "icon-size": 0.8,
        "icon-allow-overlap": true, "icon-offset": ["get", "iconOffset"] } });
    map.addLayer({ id: ATTACHED_COUNT, type: "symbol", source: ATTACHED,
      filter: [">", ["get", "count"], 1],
      layout: { "text-field": ["to-string", ["get", "count"]], "text-size": 11,
        "text-font": labelLayout["text-font"], "text-allow-overlap": true,
        "text-offset": ["get", "textOffset"] }, paint: labelPaint });
    const onAttachedClick = (e: MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.building_id;
      if (typeof id === "string") ctx.select({ kind: "building", id });
    };
    map.on("click", ATTACHED, onAttachedClick);
    map.on("click", ATTACHED_COUNT, onAttachedClick);
    const onClick = (e: MapLayerMouseEvent) => {
      // The selected pin is on top of either an ordinary pin or a cluster.
      if (e.features?.[0]?.layer.id !== SELECTED && map.queryRenderedFeatures(e.point, { layers: [SELECTED] }).length) return;
      ++request;
      popup?.remove();
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (id) ctx.select({ kind: "place", id });
    };
    const onClusterClick = async (e: MapLayerMouseEvent) => {
      if (map.queryRenderedFeatures(e.point, { layers: [SELECTED] }).length) return;
      const feature = e.features?.[0];
      if (!feature || feature.geometry.type !== "Point" || !source.loaded()) return;
      const clusterId = Number(feature.properties.cluster_id);
      const count = Number(feature.properties.point_count);
      const center = feature.geometry.coordinates.slice(0, 2) as [number, number];
      const currentRequest = ++request;
      popup?.remove();
      try {
        const zoom = await source.getClusterExpansionZoom(clusterId);
        if (removed || currentRequest !== request) return;
        if (zoom <= Math.min(map.getMaxZoom(), CLUSTER_MAX_ZOOM) && zoom > map.getZoom()) {
          map.easeTo({ center, zoom });
          return;
        }
        const leaves = await source.getClusterLeaves(clusterId, count, 0);
        if (removed || currentRequest !== request) return;
        const content = document.createElement("section");
        const title = document.createElement("h2");
        title.className = "places-cluster-title";
        title.textContent = `${leaves.length} places here`;
        content.append(title);
        const list = document.createElement("ul");
        list.className = "places-cluster-list";
        for (const leaf of leaves.sort((a, b) => String(a.properties?.name).localeCompare(String(b.properties?.name)))) {
          const item = document.createElement("li");
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = String(leaf.properties?.name ?? "");
          const id = leaf.properties?.id;
          button.addEventListener("click", () => {
            popup?.remove();
            if (typeof id === "string") ctx.select({ kind: "place", id });
          });
          item.append(button);
          list.append(item);
        }
        content.append(list);
        popup = new (await loadMapLibre()).Popup({ className: "places-cluster-popup", maxWidth: "min(300px, calc(100vw - 32px))" })
          .setLngLat(center).setDOMContent(content).addTo(map);
      } catch {
        // A cluster can disappear while the worker rebuilds the filtered source.
      }
    };
    map.on("click", CLUSTER, onClusterClick);
    const onEnter = () => (map.getCanvas().style.cursor = "pointer");
    const onLeave = () => (map.getCanvas().style.cursor = "");
    for (const layer of [PIN, SELECTED, CLUSTER]) {
      if (layer !== CLUSTER) map.on("click", layer, onClick);
      map.on("mouseenter", layer, onEnter);
      map.on("mouseleave", layer, onLeave);
    }

    return {
      update(selection) {
        const selectedId = selection?.kind === "place" ? selection.id : null;
        ++request;
        popup?.remove();
        const sel = places.features.find((f) => f.properties.id === selectedId);
        selectedSource.setData({ type: "FeatureCollection", features: sel && locationDetails(sel).coord_precision !== "building" ? [sel] : [] });
        map.setFilter(ATTACHED_HIGHLIGHT, ["==", ["get", "id"],
          sel && locationDetails(sel).coord_precision === "building" ? sel.properties.building_id ?? "" : ""]);
        if (sel) map.flyTo({ center: sel.geometry.coordinates as [number, number], zoom: 17, duration: 800 });
      },
      setFilters(filters) {
        ++request;
        popup?.remove();
        lastFilters = filters;
        const visible = places.features.filter(f => isVisible(filters, f.properties.category, f.properties.subtype));
        visibleNow = visible;
        attachedSource.setData(attachedData(withPosts(visible)));
        source.setData({
          type: "FeatureCollection",
          features: visible.filter(f => locationDetails(f).coord_precision !== "building"),
        });
      },
      remove() {
        removed = true;
        stopPosts();
        ++request;
        popup?.remove();
        map.off("click", CLUSTER, onClusterClick);
        map.getCanvas().style.cursor = "";
        for (const layer of [PIN, SELECTED, CLUSTER]) {
          if (layer !== CLUSTER) map.off("click", layer, onClick);
          map.off("mouseenter", layer, onEnter);
          map.off("mouseleave", layer, onLeave);
        }
        map.off("click", ATTACHED, onAttachedClick);
        map.off("click", ATTACHED_COUNT, onAttachedClick);
        map.removeLayer(ATTACHED_COUNT);
        map.removeLayer(ATTACHED);
        map.removeLayer(ATTACHED_HIGHLIGHT);
        map.removeSource(ATTACHED);
        map.removeLayer(SELECTED);
        map.removeLayer(LABEL);
        map.removeLayer(PIN);
        map.removeLayer(COUNT);
        map.removeLayer(CLUSTER);
        map.removeSource(SELECTED_SOURCE);
        map.removeSource(SOURCE);
        for (const id of pinIds) if (map.hasImage(id)) map.removeImage(id);
      },
    };
  },
};

/** Places layer with filtered clustering and independent selection. */
export default pois;
