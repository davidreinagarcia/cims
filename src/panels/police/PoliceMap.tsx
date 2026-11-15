/** @file Flat 2D map of the police console: drag to draw the danger circle, shows live alarms and citizen tips as pins. */
import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { CAMPUS } from "../../config";
import { circleRing, type CampusAlert, type PoliceTip } from "../../lib/alerts";
import { haversineMeters } from "../../lib/geolocation";
import { baseStyle } from "../../map/baseStyle";
import { addAlertsOverlay, flyToAlert } from "../../map/alertsOverlay";
import { loadMapLibre } from "../../map/maplibre";

/** The circle being drawn, before it is launched. */
export interface Draft { center: [number, number]; radiusM: number }

/** Props for the police map. */
export interface PoliceMapProps {
  draft: Draft | null;
  /** While true a drag on the map draws the circle instead of panning. */
  drawing: boolean;
  tips: PoliceTip[];
  selectedTipId: string | null;
  /** Alarm to fly to (changes when the user presses "Show"). */
  focus: CampusAlert | null;
  onDraft: (draft: Draft | null) => void;
  onDrawEnd: () => void;
  onSelectTip: (id: string) => void;
}

const MIN_RADIUS = 15;
const TIP_COLORS: unknown = ["match", ["get", "status"], "new", "#B42318", "acknowledged", "#B7791F", "#5E7A5A"];

/** Police map: pointer events draw the circle (mouse and touch alike) while `drawing` is on. */
export default function PoliceMap(props: PoliceMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const ready = useRef(false);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    void loadMapLibre().then((maplibregl) => {
      if (!alive || !host.current) return;
      const map = new maplibregl.Map({
        container: host.current, center: CAMPUS.center, zoom: 16, pitch: 0, bearing: 0, maxBounds: CAMPUS.bounds,
        style: baseStyle, attributionControl: false, dragRotate: false, pitchWithRotate: false,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      let removeAlerts = () => {};
      map.on("style.load", () => {
        map.addSource("draft", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "draft-fill", type: "fill", source: "draft", paint: { "fill-color": "#003057", "fill-opacity": 0.2 } });
        map.addLayer({ id: "draft-line", type: "line", source: "draft", paint: { "line-color": "#003057", "line-width": 3, "line-dasharray": [2, 1.5] } });
        map.addSource("tips", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "tips", type: "circle", source: "tips",
          paint: {
            "circle-radius": ["case", ["get", "selected"], 11, 8], "circle-color": TIP_COLORS as string,
            "circle-stroke-color": ["case", ["get", "selected"], "#003057", "#FFFFFF"], "circle-stroke-width": 3,
          },
        });
        map.on("click", "tips", (e) => { const id = e.features?.[0]?.properties?.id; if (id && !latest.current.drawing) latest.current.onSelectTip(String(id)); });
        map.on("mouseenter", "tips", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "tips", () => { map.getCanvas().style.cursor = latest.current.drawing ? "crosshair" : ""; });
        removeAlerts = addAlertsOverlay(map).remove;
        ready.current = true;
        paint();
      });

      // Drawing: press sets the center, dragging sets the radius, release keeps the circle (the form launches it).
      const surface = map.getCanvasContainer();
      let center: [number, number] | null = null;
      const lngLatOf = (e: PointerEvent): [number, number] => {
        const rect = surface.getBoundingClientRect();
        const p = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);
        return [p.lng, p.lat];
      };
      const radiusTo = (c: [number, number], p: [number, number]) =>
        Math.max(MIN_RADIUS, Math.round(haversineMeters({ lng: c[0], lat: c[1] }, { lng: p[0], lat: p[1] })));
      const down = (e: PointerEvent) => {
        if (!latest.current.drawing || e.button > 0) return;
        e.preventDefault();
        surface.setPointerCapture(e.pointerId);
        center = lngLatOf(e);
        latest.current.onDraft({ center, radiusM: MIN_RADIUS });
      };
      const move = (e: PointerEvent) => {
        if (!center) return;
        latest.current.onDraft({ center, radiusM: radiusTo(center, lngLatOf(e)) });
      };
      const up = (e: PointerEvent) => {
        if (!center) return;
        const finalRadius = radiusTo(center, lngLatOf(e));
        // A plain tap (no drag) gets a sensible default circle instead of a 15 m dot.
        latest.current.onDraft({ center, radiusM: finalRadius <= MIN_RADIUS ? 100 : finalRadius });
        center = null;
        latest.current.onDrawEnd();
      };
      surface.addEventListener("pointerdown", down);
      surface.addEventListener("pointermove", move);
      surface.addEventListener("pointerup", up);
      surface.addEventListener("pointercancel", up);
      cleanup = () => {
        surface.removeEventListener("pointerdown", down);
        surface.removeEventListener("pointermove", move);
        surface.removeEventListener("pointerup", up);
        surface.removeEventListener("pointercancel", up);
        removeAlerts();
        map.remove();
        mapRef.current = null;
        ready.current = false;
      };
    });
    return () => { alive = false; cleanup(); };
  }, []);

  const paint = () => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const { draft, tips, selectedTipId } = latest.current;
    (map.getSource("draft") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: draft ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [circleRing(draft.center, draft.radiusM)] } }] : [],
    });
    (map.getSource("tips") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: tips.filter((t) => t.status !== "resolved").map((t) => ({
        type: "Feature", properties: { id: t.id, status: t.status, selected: t.id === selectedTipId }, geometry: { type: "Point", coordinates: t.point },
      })),
    });
  };
  useEffect(paint, [props.draft, props.tips, props.selectedTipId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (props.drawing) {
      map.dragPan.disable(); map.touchZoomRotate.disable(); map.doubleClickZoom.disable();
      map.getCanvas().style.cursor = "crosshair";
      map.getCanvasContainer().style.touchAction = "none";
    } else {
      map.dragPan.enable(); map.touchZoomRotate.enable(); map.doubleClickZoom.enable();
      map.getCanvas().style.cursor = "";
      map.getCanvasContainer().style.touchAction = "";
    }
  }, [props.drawing]);

  useEffect(() => {
    if (props.focus && mapRef.current) flyToAlert(mapRef.current, props.focus);
  }, [props.focus]);

  // Selecting a tip centers it.
  useEffect(() => {
    const tip = props.tips.find((t) => t.id === props.selectedTipId);
    if (tip && mapRef.current) mapRef.current.easeTo({ center: tip.point, zoom: Math.max(mapRef.current.getZoom(), 17), duration: 600 });
  }, [props.selectedTipId]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="police__map" ref={host} role="application" aria-label="Campus map: drag to draw the alarm area" />;
}
