/** @file Private, local-only location tracking with a ground-aligned CIMS marker and one campus-only camera move. */
import type { IControl, Map as MapLibreMap, Marker } from "maplibre-gl";
import { CAMPUS } from "../../config";
import { GeolocationError } from "../../lib/geolocation";
import { IN_APP_BROWSER, IOS } from "../../lib/inAppBrowser";
import { loadMapLibre } from "../maplibre";
import "./furniture.css";

const ASKED = "cims.location.asked";
/** Where to flip location back on once a browser has blocked it; no web page may do that itself. */
const FIX_STEPS = IOS
  ? ["Tap aA in the address bar, then Website Settings, and set Location to Allow.", "If it stays blocked: Settings > Privacy & Security > Location Services must be on, with Safari Websites on While Using."]
  : ["Tap the lock (or tune) icon next to the address bar, then Permissions, and set Location to Allow.", "If it stays blocked: Android Settings > Location must be on, and Chrome allowed under App permissions."];
let askedThisSession = false;

/** Map control that watches location only while visible and never follows the camera after the first fix. */
export class LocateControl implements IControl {
  private map?: MapLibreMap;
  private el?: HTMLElement;
  private button?: HTMLButtonElement;
  private status?: HTMLElement;
  private watch?: number;
  private marker?: Marker;
  private pin?: Marker;
  private fix?: GeolocationCoordinates;
  private enabled = false;
  private ready = false;
  private firstFix = true;
  private pending = false;
  private manual = false;
  private permission?: PermissionStatus;

  private message = (message: string) => {
    if (this.status) this.status.textContent = message;
  };

  /** Blocked: say exactly how to unblock it and offer a re-check. Tracking also resumes by itself once the permission flips to granted. */
  private help = () => {
    if (!this.status) return;
    const title = document.createElement("strong");
    title.textContent = "Location is blocked for this site";
    const steps = document.createElement("ol");
    for (const text of FIX_STEPS) { const li = document.createElement("li"); li.textContent = text; steps.append(li); }
    const again = document.createElement("button");
    again.type = "button";
    again.className = "cims-btn cims-btn--small";
    again.textContent = "I allowed it, check again";
    again.addEventListener("click", () => { this.message("Finding your location…"); this.ask(); });
    this.status.replaceChildren(title, steps, again);
  };

  /** Starts tracking as soon as the person allows location in the browser settings, with no extra tap. */
  private watchPermission = async () => {
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      if (!this.map) return;
      this.permission = status;
      status.onchange = () => {
        if (status.state !== "granted" || this.enabled || !this.map) return;
        this.manual = true;
        this.enabled = true;
        this.refresh();
        this.message("Finding your location…");
        this.start();
      };
    } catch { /* Permissions API unavailable: the button still works. */ }
  };

  private clear = () => {
    if (this.watch !== undefined) navigator.geolocation.clearWatch(this.watch);
    this.watch = undefined;
    this.marker?.remove();
    this.pin?.remove();
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
    if (!this.manual) return;
    if (error.code === 1) this.help();
    else if (error.code === 2) this.message("Your phone can't find you. Switch Location (GPS) on in its quick settings, then tap again.");
    else this.message(new GeolocationError(error.code === 3 ? "timeout" : "unavailable").message);
  };

  private position = ({ coords }: GeolocationPosition) => {
    const map = this.map;
    if (!map || !this.enabled || document.hidden) return;
    const { latitude: lat, longitude: lng, accuracy } = coords;
    if (![lat, lng, accuracy].every(Number.isFinite) || accuracy < 0) return;
    this.fix = coords;
    this.resize();
    this.marker?.setLngLat([lng, lat]).addTo(map);
    this.pin?.setLngLat([lng, lat]).addTo(map);
    this.tilt();
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

  /**
   * Manual ask, called straight from a tap. It must reach the browser synchronously: Safari on iPhone only shows
   * the permission prompt when the request comes from the tap itself, so no await may come before it.
   */
  private ask = () => {
    if (!this.map || !this.ready) return;
    if (!("geolocation" in navigator) || !window.isSecureContext) { this.message(new GeolocationError("unsupported").message); return; }
    if (IN_APP_BROWSER) this.message(`This looks like an in-app browser, which often can't share location. If nothing happens, open this page in ${IOS ? "Safari" : "Chrome"}.`);
    this.manual = true;
    this.enabled = true;
    this.refresh();
    this.start();
  };

  /** Quiet ask when the map opens: only if the browser would show its prompt, and only once per device. */
  private autoRequest = async () => {
    if (this.pending || !this.map) return;
    this.pending = true;
    try {
      if (!("geolocation" in navigator) || !window.isSecureContext) return;
      let permission: PermissionState | undefined;
      try { permission = (await navigator.permissions.query({ name: "geolocation" })).state; } catch { /* Manual location still works without Permissions API. */ }
      if (!this.map || permission === "denied") return;
      if (permission !== "granted") {
        if (permission !== "prompt" || askedThisSession) return;
        try { if (localStorage.getItem(ASKED)) return; } catch { /* Fall back to the session flag. */ }
        askedThisSession = true;
        try { localStorage.setItem(ASKED, "1"); } catch { /* Private mode may block storage. */ }
      }
      this.manual = false;
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
      this.ask();
    }
  };

  private visibility = () => {
    if (document.hidden) this.clear();
    else this.start();
  };

  private resize = () => {
    if (!this.map || !this.marker || !this.fix) return;
    // Scales with the map like the buildings (about 10 m wide), but clamped so it is never tiny or huge.
    const metersPerPixel = 40_075_016.686 * Math.cos(this.fix.latitude * Math.PI / 180) / (512 * 2 ** this.map.getZoom());
    const scale = Math.max(0.35, Math.min(0.8, 10 / metersPerPixel / 34));
    const ring = this.marker.getElement().querySelector<SVGElement>("svg");
    if (ring) ring.style.transform = `scale(${scale})`;
    const pin = this.pin?.getElement().querySelector<SVGElement>("svg");
    if (pin) { pin.style.transformOrigin = "50% 100%"; pin.style.transform = `scale(${Math.max(0.6, scale * 1.2)})`; }
    const arrow = this.marker.getElement().querySelector<SVGElement>("[data-heading]");
    if (arrow) {
      const heading = this.fix.heading;
      const hasHeading = heading !== null && Number.isFinite(heading);
      arrow.style.display = hasHeading ? "" : "none";
      arrow.setAttribute("transform", `rotate(${hasHeading ? heading : 0}) translate(0 -34)`);
    }
  };

  /** Shows the upright pin only while the map is tilted (3D view). */
  private tilt = () => {
    const pin = this.pin?.getElement();
    if (pin) pin.style.opacity = (this.map?.getPitch() ?? 0) > 8 ? "1" : "0";
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
    element.innerHTML = `<svg width="128" height="128" viewBox="-64 -64 128 128" aria-hidden="true">
      <circle r="40" fill="#F3EEE2" fill-opacity=".9"/>
      <g class="cims-location-marker__rings" fill="none" stroke-width="3">
        <circle data-accuracy r="34" stroke="#E3D7B0"/>
        <circle r="28" stroke="#9AA8B4"/>
        <circle r="23" stroke="#F3EEE2"/>
        <circle r="18" stroke="#6E8090"/>
        <circle r="14" stroke="#E3D7B0"/>
      </g>
      <g data-heading style="display:none">
        <path d="M0 -5 4 4 0 2 -4 4Z" fill="#435563" stroke="#003057" stroke-width="1"/>
      </g>
      <circle cy="2" r="10" fill="#001E36"/>
      <path d="M-10 0v2M10 0v2" stroke="#001E36" stroke-width="1"/>
      <circle r="10" fill="#003057"/>
      <circle r="8" fill="none" stroke="var(--gold, #B3A369)" stroke-width="1.2"/>
      <text y="2.4" text-anchor="middle" fill="var(--gold, #B3A369)"
        font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="7">CIMS</text>
    </svg>`;
    this.marker = new Marker({ element, anchor: "center", pitchAlignment: "map", rotationAlignment: "map" });
    const pin = document.createElement("div");
    pin.className = "cims-location-pin";
    pin.setAttribute("aria-hidden", "true");
    pin.innerHTML = `<svg width="30" height="44" viewBox="0 0 30 44">
      <ellipse cx="15" cy="40" rx="6" ry="2.5" fill="#001E36" opacity=".35"/>
      <path d="M15 39 3 18a13 13 0 1 1 24 0Z" fill="#003057" stroke="#B3A369" stroke-width="1.5"/>
      <circle cx="15" cy="14" r="5" fill="#B3A369"/>
    </svg>`;
    this.pin = new Marker({ element: pin, anchor: "bottom", pitchAlignment: "viewport", rotationAlignment: "viewport" });
    map.on("pitch", this.tilt);
    map.on("zoom", this.resize);
    this.ready = true;
    if (this.button) this.button.disabled = false;
    void this.watchPermission();
    void this.autoRequest();
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
    if (this.permission) this.permission.onchange = null;
    document.removeEventListener("visibilitychange", this.visibility);
    this.map?.off("load", this.loaded);
    this.map?.off("pitch", this.tilt);
    this.map?.off("zoom", this.resize);
    this.marker = undefined;
    this.pin = undefined;
    this.button?.removeEventListener("click", this.click);
    this.el?.remove();
    this.map = undefined;
  }
}
