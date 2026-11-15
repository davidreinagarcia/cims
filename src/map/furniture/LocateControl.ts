/** @file Private, local-only location tracking with a survey dot, accuracy circle and one campus-only camera move. */
import type { GeoJSONSource, IControl, Map as MapLibreMap } from "maplibre-gl";
import { CAMPUS } from "../../config";
import { GeolocationError } from "../../lib/geolocation";
import { INK, PAPER } from "../palette";
import "./furniture.css";

const SOURCE = "user-location";
const ACCURACY = "user-location-accuracy";
const DOT = "user-location-dot";
const ASKED = "cims.location.asked";
let askedThisSession = false;
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** Map control that watches location only while visible and never follows the camera after the first fix. */
export class LocateControl implements IControl {
  private map?: MapLibreMap;
  private el?: HTMLElement;
  private button?: HTMLButtonElement;
  private status?: HTMLElement;
  private watch?: number;
  private enabled = false;
  private ready = false;
  private firstFix = true;
  private pending = false;
  private manual = false;

  private message = (message: string) => {
    if (this.status) this.status.textContent = message;
  };

  private clear = () => {
    if (this.watch !== undefined) navigator.geolocation.clearWatch(this.watch);
    this.watch = undefined;
    (this.map?.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(EMPTY);
  };

  private refresh = () => {
    this.button?.setAttribute("aria-pressed", String(this.enabled));
    this.button?.setAttribute("aria-label", this.enabled ? "Hide your location" : "Show your location");
  };

  private failure = (error: GeolocationPositionError) => {
    this.clear();
    this.enabled = false;
    this.refresh();
    if (this.manual) this.message(new GeolocationError(error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable").message);
  };

  private position = ({ coords }: GeolocationPosition) => {
    const map = this.map;
    if (!map || !this.enabled || document.hidden) return;
    const { latitude: lat, longitude: lng, accuracy } = coords;
    if (![lat, lng, accuracy].every(Number.isFinite) || accuracy < 0) return;
    // A geographic polygon keeps the accuracy radius correct while zooming, rotating and tilting.
    const ring: number[][] = [];
    const angular = accuracy / 6_371_000;
    const latitude = lat * Math.PI / 180;
    const longitude = lng * Math.PI / 180;
    for (let i = 0; i <= 64; i++) {
      const bearing = i / 64 * Math.PI * 2;
      const y = Math.asin(Math.sin(latitude) * Math.cos(angular) + Math.cos(latitude) * Math.sin(angular) * Math.cos(bearing));
      const x = longitude + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(latitude), Math.cos(angular) - Math.sin(latitude) * Math.sin(y));
      ring.push([x * 180 / Math.PI, y * 180 / Math.PI]);
    }
    ring[64] = ring[0];
    (map.getSource(SOURCE) as GeoJSONSource).setData({ type: "FeatureCollection", features: [
      { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } },
      { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lng, lat] } },
    ] });
    if (this.firstFix) {
      this.firstFix = false;
      const [[west, south], [east, north]] = CAMPUS.bounds;
      if (lng >= west && lng <= east && lat >= south && lat <= north) {
        map.flyTo({ center: [lng, lat], duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700 });
      }
    }
    if (this.manual) this.message("Your location is shown only on this device.");
  };

  private start = () => {
    if (!this.map || !this.ready || !this.enabled || document.hidden || this.watch !== undefined) return;
    try {
      this.watch = navigator.geolocation.watchPosition(this.position, this.failure, { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 });
    } catch {
      this.enabled = false;
      this.refresh();
      if (this.manual) this.message(new GeolocationError("unsupported").message);
    }
  };

  private request = async (automatic: boolean) => {
    if (this.pending || !this.map) return;
    this.pending = true;
    try {
      if (!("geolocation" in navigator) || !window.isSecureContext) {
        if (!automatic) this.message(new GeolocationError("unsupported").message);
        return;
      }
      let permission: PermissionState | undefined;
      try { permission = (await navigator.permissions.query({ name: "geolocation" })).state; } catch { /* Manual location still works without Permissions API. */ }
      if (!this.map) return;
      if (permission === "denied") {
        if (!automatic) this.message(new GeolocationError("denied").message);
        return;
      }
      if (automatic && permission !== "granted") {
        if (permission !== "prompt" || askedThisSession) return;
        try { if (localStorage.getItem(ASKED)) return; } catch { /* Fall back to the session flag. */ }
      }
      if (permission !== "granted") {
        askedThisSession = true;
        try { localStorage.setItem(ASKED, "1"); } catch { /* Private mode may block storage. */ }
      }
      this.manual = !automatic;
      this.enabled = true;
      this.refresh();
      this.start();
    } finally { this.pending = false; }
  };

  private click = () => {
    if (this.enabled) {
      this.enabled = false;
      this.clear();
      this.refresh();
      this.message("Location hidden.");
    } else {
      this.message("Finding your location…");
      void this.request(false);
    }
  };

  private visibility = () => {
    if (document.hidden) this.clear();
    else this.start();
  };

  private loaded = () => {
    const map = this.map;
    if (!map) return;
    map.addSource(SOURCE, { type: "geojson", data: EMPTY });
    map.addLayer({ id: ACCURACY, type: "fill", source: SOURCE, filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": PAPER, "fill-opacity": 0.25, "fill-outline-color": INK } });
    map.addLayer({ id: DOT, type: "circle", source: SOURCE, filter: ["==", ["geometry-type"], "Point"],
      paint: { "circle-radius": 6, "circle-color": "#003057", "circle-stroke-width": 2, "circle-stroke-color": PAPER } });
    this.ready = true;
    if (this.button) this.button.disabled = false;
    void this.request(true);
  };

  /** Builds the accessible locate button beside the existing map controls. */
  onAdd(map: MapLibreMap): HTMLElement {
    this.map = map;
    this.el = document.createElement("div");
    this.el.className = "maplibregl-ctrl cims-mapctl cims-locate";
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.disabled = true;
    this.button.title = "Show your location";
    this.button.innerHTML = '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>';
    this.button.addEventListener("click", this.click);
    this.status = document.createElement("span");
    this.status.className = "cims-locate__status";
    this.status.setAttribute("role", "status");
    this.el.append(this.button, this.status);
    this.refresh();
    document.addEventListener("visibilitychange", this.visibility);
    map.once("load", this.loaded);
    return this.el;
  }

  /** Clears the watch, listeners, dot and accuracy circle when the map is removed. */
  onRemove(): void {
    this.enabled = false;
    this.clear();
    document.removeEventListener("visibilitychange", this.visibility);
    this.map?.off("load", this.loaded);
    for (const layer of [DOT, ACCURACY]) if (this.map?.getLayer(layer)) this.map.removeLayer(layer);
    if (this.map?.getSource(SOURCE)) this.map.removeSource(SOURCE);
    this.button?.removeEventListener("click", this.click);
    this.el?.remove();
    this.map = undefined;
  }
}
