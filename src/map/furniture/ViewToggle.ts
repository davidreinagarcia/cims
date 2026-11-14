/** @file Map control: one button that switches between the tilted 3D view and a flat, north-up 2D view. */
import type { IControl, Map as MapLibreMap } from "maplibre-gl";
import { CAMPUS } from "../../config";

/** Below this pitch the map counts as flat. */
const FLAT_PITCH = 5;

/** MapLibre control: "2D" / "3D" button. The label is the view you get by pressing it. */
export class ViewToggle implements IControl {
  private map?: MapLibreMap;
  private el?: HTMLElement;
  private button?: HTMLButtonElement;

  private isFlat = () => (this.map?.getPitch() ?? 0) < FLAT_PITCH;

  private refresh = () => {
    if (!this.button) return;
    const target = this.isFlat() ? "3D" : "2D";
    this.button.textContent = target;
    this.button.setAttribute("aria-label", `Switch to ${target} view`);
  };

  private toggle = () => {
    if (!this.map) return;
    this.map.easeTo(this.isFlat() ? { pitch: CAMPUS.pitch, bearing: CAMPUS.bearing, duration: 600 } : { pitch: 0, bearing: 0, duration: 600 });
  };

  /** Called by map.addControl: builds the button and keeps its label in sync with the pitch. */
  onAdd(map: MapLibreMap): HTMLElement {
    this.map = map;
    const el = document.createElement("div");
    el.className = "maplibregl-ctrl cims-mapctl";
    const button = document.createElement("button");
    button.type = "button";
    button.addEventListener("click", this.toggle);
    el.append(button);
    this.el = el;
    this.button = button;
    map.on("pitchend", this.refresh);
    this.refresh();
    return el;
  }

  /** Called by map.removeControl. */
  onRemove(): void {
    this.map?.off("pitchend", this.refresh);
    this.button?.removeEventListener("click", this.toggle);
    this.el?.remove();
    this.map = undefined;
  }
}
