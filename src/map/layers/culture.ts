/** @file Culture layer: sticky notes pinned on the map like a brother's annotations (traditions, Freshman Hill, Mini 500) plus West/East labels. Always starts off; while on, every other layer hides. */
import type { Marker, Map as MapLibreMap } from "maplibre-gl";
import type { MapLayer } from "../types";
import data from "../../data/culture.json";
import { getCulture, setGuide, subscribeCulture } from "../../culture/store";
import { loadMapLibre } from "../maplibre";
import "../culture.css";

interface Note {
  id: string; title: string; color: string; rotate: number; lng: number; lat: number; text: string; tip?: string; source_url: string;
  anywhere?: boolean; emoji?: string; tag?: string; when?: string; where?: string; facts?: string[];
}

/** Tiny element helper: tag, class and text in one call. */
function el(tag: string, cls: string, text = ""): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}

/** Build one sticky note: a closed post-it (emoji, title, tag) that opens into a full card (when, where, story, facts, tip, source). */
function noteEl(n: Note): HTMLElement {
  const root = el("button", `culture-note culture-note--${n.color}`);
  (root as HTMLButtonElement).type = "button";
  root.style.setProperty("--tilt", `${n.rotate}deg`);
  root.setAttribute("aria-expanded", "false");
  root.append(el("span", "culture-note__pin"));
  const head = el("span", "culture-note__head");
  head.append(el("span", "culture-note__emoji", n.emoji ?? "📝"), el("strong", "culture-note__title", n.title));
  root.append(head);
  if (n.tag) root.append(el("span", "culture-note__tag", n.tag));
  const more = el("span", "culture-note__more");
  if (n.when) { const r = el("span", "culture-note__row"); r.append(el("b", "", "When "), n.when); more.append(r); }
  const where = n.where ?? (n.anywhere ? "Not one spot, it's everywhere" : "");
  if (where) { const r = el("span", "culture-note__row"); r.append(el("b", "", "Where "), where); more.append(r); }
  more.append(el("span", "culture-note__text", n.text));
  if (n.facts?.length) {
    const ul = el("ul", "culture-note__facts");
    for (const f of n.facts) ul.append(el("li", "", f));
    more.append(ul);
  }
  if (n.tip) more.append(el("em", "culture-note__tip", `psst: ${n.tip}`));
  const src = el("a", "culture-note__src", "source") as HTMLAnchorElement;
  src.href = n.source_url;
  src.target = "_blank";
  src.rel = "noopener";
  src.addEventListener("click", (e) => e.stopPropagation());
  more.append(src);
  root.append(more);
  root.addEventListener("click", () => {
    const open = root.getAttribute("aria-expanded") !== "true";
    root.setAttribute("aria-expanded", String(open));
    root.parentElement?.style.setProperty("z-index", open ? "5" : ""); // marker element sits above its neighbours while open
  });
  return root;
}

/** MapLibre positions the marker element with an inline transform, so the styled (tilted, relative) note lives inside a plain wrapper. */
function wrap(inner: HTMLElement): HTMLElement {
  const el = document.createElement("div");
  el.append(inner);
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
        for (const n of data.notes as Note[]) markers.push(new ml.Marker({ element: wrap(noteEl(n)), anchor: "bottom" }).setLngLat([n.lng, n.lat]).addTo(map));
        for (const a of data.areas) markers.push(new ml.Marker({ element: wrap(areaEl(a.label)), anchor: "center" }).setLngLat([a.lng, a.lat]).addTo(map));
        // Frame the whole campus top-down so every note is on screen (fitBounds proved unreliable here).
        map.easeTo({ center: [-84.3975, 33.7766], zoom: window.innerWidth < 600 ? 14.1 : 14.8, pitch: 0, bearing: 0, duration: 1200 });
      });
    };
    const unsubscribe = subscribeCulture(sync);
    sync(); // culture may already be on if the user toggled it before the map style finished loading
    return { remove() { unsubscribe(); token++; clear(); } };
  },
};

export default culture;
