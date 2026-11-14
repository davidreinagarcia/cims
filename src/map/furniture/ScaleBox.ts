/** @file Map furniture: scale bar plus live center coordinates in a 1px box (bottom right). */
import type { IControl, Map as MapLibreMap } from "maplibre-gl";
import "./furniture.css";

const MAX_BAR_PX = 140;
const FEET_PER_METER = 3.28084;
const EARTH_CIRCUMFERENCE = 40075016.686;

/** Largest 1/2/5 × 10ⁿ value that is not above `max`. */
function niceBelow(max: number): number {
  const pow = 10 ** Math.floor(Math.log10(max));
  const lead = max / pow;
  return (lead >= 5 ? 5 : lead >= 2 ? 2 : 1) * pow;
}

/** "33.7756° N, 84.3963° W" */
function formatLatLng(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
}

/** MapLibre control: a four-segment scale bar in feet and the map center's latitude/longitude, updated as the map moves. */
export class ScaleBox implements IControl {
  private map?: MapLibreMap;
  private el?: HTMLElement;
  private bar?: HTMLElement;
  private end?: HTMLElement;
  private coords?: HTMLElement;

  private refresh = () => {
    if (!this.map || !this.bar || !this.end || !this.coords) return;
    const { lat, lng } = this.map.getCenter();
    // Ground meters per CSS pixel at the map center (MapLibre zoom levels use 512px tiles).
    const metersPerPx = (EARTH_CIRCUMFERENCE * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** this.map.getZoom());
    const feet = niceBelow(MAX_BAR_PX * metersPerPx * FEET_PER_METER);
    this.bar.style.width = `${Math.round(feet / FEET_PER_METER / metersPerPx)}px`;
    this.end.textContent = `${feet.toLocaleString("en-US")} ft`;
    this.coords.textContent = formatLatLng(lat, lng);
  };

  /** Called by map.addControl: builds the box and starts following the map. */
  onAdd(map: MapLibreMap): HTMLElement {
    this.map = map;
    const el = document.createElement("div");
    el.className = "maplibregl-ctrl cims-scale";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="cims-scale__bar"><span></span><span></span><span></span><span></span></div>' +
      '<div class="cims-scale__row"><span>0</span><span data-end></span></div><span data-coords></span>';
    this.el = el;
    this.bar = el.querySelector<HTMLElement>(".cims-scale__bar")!;
    this.end = el.querySelector<HTMLElement>("[data-end]")!;
    this.coords = el.querySelector<HTMLElement>("[data-coords]")!;
    map.on("move", this.refresh);
    this.refresh();
    return el;
  }

  /** Called by map.removeControl. */
  onRemove(): void {
    this.map?.off("move", this.refresh);
    this.el?.remove();
    this.map = undefined;
  }
}
