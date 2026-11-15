/** @file Private, local-only location tracking with a ground-aligned CIMS marker and one campus-only camera move. */
import type { IControl, Map as MapLibreMap, Marker } from "maplibre-gl";
import { CAMPUS } from "../../config";
import { GeolocationError } from "../../lib/geolocation";
import { loadMapLibre } from "../maplibre";
import "./furniture.css";

const ASKED = "cims.location.asked";
let askedThisSession = false;

/** Map control that watches location only while visible and never follows the camera after the first fix. */
export class LocateControl implements IControl {
  private map?: MapLibreMap;
  private el?: HTMLElement;
  private button?: HTMLButtonElement;
  private status?: HTMLElement;
  private watch?: number;
  private marker?: Marker;
  private fix?: GeolocationCoordinates;
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
    this.marker?.remove();
    this.fix = undefined;
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
    this.fix = coords;
    this.resize();
    this.marker?.setLngLat([lng, lat]).addTo(map);
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

  private resize = () => {
    if (!this.map || !this.marker || !this.fix) return;
    // Web Mercator uses 512 CSS pixels per world tile, independent of device pixel ratio.
    const metersPerPixel = 40_075_016.686 * Math.cos(this.fix.latitude * Math.PI / 180)
      / (512 * 2 ** this.map.getZoom());
    const radius = Math.max(56, Math.min(112, this.fix.accuracy / metersPerPixel));
    const element = this.marker.getElement();
    element.querySelector("[data-accuracy]")?.setAttribute("r", String(radius));
    const arrow = element.querySelector<SVGElement>("[data-heading]");
    if (arrow) {
      const heading = this.fix.heading;
      const hasHeading = heading !== null && Number.isFinite(heading);
      arrow.style.display = hasHeading ? "" : "none";
      arrow.setAttribute("transform", `rotate(${hasHeading ? heading : 0}) translate(0 ${-radius})`);
    }
  };

  private loaded = async () => {
    const map = this.map;
    if (!map) return;
    const { Marker } = await loadMapLibre();
    if (this.map !== map) return;
    const element = document.createElement("div");
    element.className = "cims-location-marker";
    element.setAttribute("role", "img");
    element.setAttribute("aria-label", "Your location; outer ring shows approximate GPS accuracy");
    element.innerHTML = `<svg width="256" height="256" viewBox="-128 -128 256 256" aria-hidden="true">
      <g class="cims-location-marker__rings" fill="none" stroke-width="5">
        <circle data-accuracy r="56" stroke="#E3D7B0"/>
        <circle r="46" stroke="#9AA8B4"/>
        <circle r="38" stroke="#F3EEE2"/>
        <circle r="30" stroke="#6E8090"/>
        <circle r="22" stroke="#E3D7B0"/>
      </g>
      <g data-heading style="display:none">
        <path d="M0 -7 5 6 0 3 -5 6Z" fill="#435563" stroke="#003057" stroke-width="1"/>
      </g>
      <circle cy="3" r="14" fill="#001E36"/>
      <path d="M-14 0v3M14 0v3" stroke="#001E36" stroke-width="1"/>
      <circle r="14" fill="#003057"/>
      <circle r="11" fill="none" stroke="var(--gold, #B3A369)" stroke-width="1.5"/>
      <text y="3.5" text-anchor="middle" fill="var(--gold, #B3A369)"
        font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="10">CIMS</text>
    </svg>`;
    this.marker = new Marker({ element, anchor: "center", pitchAlignment: "map", rotationAlignment: "map" });
    map.on("zoom", this.resize);
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

  /** Clears the watch, listeners and location marker when the map is removed. */
  onRemove(): void {
    this.enabled = false;
    this.clear();
    document.removeEventListener("visibilitychange", this.visibility);
    this.map?.off("load", this.loaded);
    this.map?.off("zoom", this.resize);
    this.marker = undefined;
    this.button?.removeEventListener("click", this.click);
    this.el?.remove();
    this.map = undefined;
  }
}
