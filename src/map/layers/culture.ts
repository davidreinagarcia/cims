/** @file Culture layer: sticky notes pinned on the map like a brother's annotations (traditions, Freshman Hill, Mini 500) plus West/East labels. Always starts off; while on, every other layer hides. */
import type { Marker, Map as MapLibreMap } from "maplibre-gl";
import type { MapLayer } from "../types";
import data from "../../data/culture.json";
import { getCulture, setGuide, subscribeCulture } from "../../culture/store";
import { loadMapLibre } from "../maplibre";
import "../culture.css";

interface Note { id: string; title: string; color: string; rotate: number; lng: number; lat: number; text: string; tip?: string; source_url: string }

/** Build one sticky note element; tapping it flips between the title only and the full note. */
function noteEl(n: Note): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `culture-note culture-note--${n.color}`;
  el.style.setProperty("--tilt", `${n.rotate}deg`);
  el.setAttribute("aria-expanded", "false");
  const title = document.createElement("strong");
  title.className = "culture-note__title";
  title.textContent = n.title;
  const body = document.createElement("span");
  body.className = "culture-note__body";
  body.textContent = n.text;
  const tip = document.createElement("em");
  tip.className = "culture-note__tip";
  tip.textContent = n.tip ? `psst: ${n.tip}` : "";
  const src = document.createElement("a");
  src.className = "culture-note__src";
  src.href = n.source_url;
  src.target = "_blank";
  src.rel = "noopener";
  src.textContent = "source";
  src.addEventListener("click", (e) => e.stopPropagation());
  el.append(title, body, tip, src);
  el.addEventListener("click", () => {
    const open = el.getAttribute("aria-expanded") !== "true";
    el.setAttribute("aria-expanded", String(open));
    el.parentElement?.style.setProperty("z-index", open ? "5" : "");
  });
  return el;
}

/** Hand-drawn "WEST / EAST" label; opens the guide. */
function areaEl(label: string): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "culture-area";
  el.textContent = `${label} campus?`;
  el.addEventListener("click", () => setGuide(true));
  return el;
}

const culture: MapLayer = {
  id: "culture",
  order: 60, // above pins
  addTo(map: MapLibreMap) {
    let markers: Marker[] = [];
    let token = 0;
    const clear = () => { markers.forEach((m) => m.remove()); markers = []; };
    const sync = () => {
      const mine = ++token;
      if (!getCulture().on) { clear(); return; }
      if (markers.length) return;
      void loadMapLibre().then((ml) => {
        if (mine !== token || !getCulture().on) return;
        for (const n of data.notes as Note[]) markers.push(new ml.Marker({ element: noteEl(n), anchor: "bottom" }).setLngLat([n.lng, n.lat]).addTo(map));
        for (const a of data.areas) markers.push(new ml.Marker({ element: areaEl(a.label), anchor: "center" }).setLngLat([a.lng, a.lat]).addTo(map));
        const b = new ml.LngLatBounds();
        for (const n of data.notes) b.extend([n.lng, n.lat]);
        for (const a of data.areas) b.extend([a.lng, a.lat]);
        map.fitBounds(b, { padding: 90, maxZoom: 16.5, pitch: 0, duration: 1200 });
      });
    };
    const unsubscribe = subscribeCulture(sync);
    return { remove() { unsubscribe(); token++; clear(); } };
  },
};

export default culture;
