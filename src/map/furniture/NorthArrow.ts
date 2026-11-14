/** @file Map furniture: a minimal north arrow (bottom left) that turns with the map's bearing. */
import type { IControl, Map as MapLibreMap } from "maplibre-gl";
import { INK } from "../palette";
import "./furniture.css";

/** MapLibre control: outlined arrow with an "N" that always points to true north. */
export class NorthArrow implements IControl {
  private map?: MapLibreMap;
  private el?: HTMLElement;
  private arrow?: SVGElement;

  private refresh = () => {
    if (this.map && this.arrow) this.arrow.style.transform = `rotate(${-this.map.getBearing()}deg)`;
  };

  /** Called by map.addControl: builds the arrow and starts following the bearing. */
  onAdd(map: MapLibreMap): HTMLElement {
    this.map = map;
    const el = document.createElement("div");
    el.className = "maplibregl-ctrl cims-north";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      `<svg width="16" height="22" viewBox="0 0 16 22"><path d="M8 1 15 21 8 16 1 21Z" fill="none" stroke="${INK}" stroke-width="1.5"/>` +
      `<path d="M8 1v15" stroke="${INK}"/></svg>N`;
    this.el = el;
    this.arrow = el.querySelector("svg")!;
    map.on("rotate", this.refresh);
    this.refresh();
    return el;
  }

  /** Called by map.removeControl. */
  onRemove(): void {
    this.map?.off("rotate", this.refresh);
    this.el?.remove();
    this.map = undefined;
  }
}
