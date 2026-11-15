/** @file Culture layer: small sticky notes with a hand-drawn doodle pinned where each GT tradition happens, plus the West / East labels. Notes that would overlap hide until you zoom in; tapping one opens it in the reader. Always starts off; while on, every other layer hides. */
import type { Marker, Map as MapLibreMap } from "maplibre-gl";
import type { MapLayer } from "../types";
import { getCulture, setGuide, setNote, subscribeCulture } from "../../culture/store";
import { CULTURE_AREAS, CULTURE_NOTES, doodleFor, type CultureNote } from "../../culture/notes";
import { loadMapLibre } from "../maplibre";
import "../culture.css";

const CAMPUS_CENTER: [number, number] = [-84.3975, 33.7761];

/** A tilted post-it with tape, the note's doodle and its title in handwriting. */
function stampEl(n: CultureNote): HTMLElement {
  const root = document.createElement("div");
  root.className = "culture-stamp-wrap";
  const button = document.createElement("button");
  button.type = "button";
  button.className = `culture-stamp culture-stamp--${n.color}`;
  button.style.setProperty("--tilt", `${n.rotate}deg`);
  button.setAttribute("aria-label", `Note: ${n.title}`);
  const img = document.createElement("img");
  img.src = doodleFor(n.id);
  img.alt = "";
  img.loading = "lazy";
  const title = document.createElement("span");
  title.className = "culture-stamp__title";
  title.textContent = n.title;
  button.append(img, title);
  // The map listens for clicks on its container; keep a note tap from also selecting a building or opening stories.
  button.addEventListener("click", (e) => { e.stopPropagation(); setNote(n.id); });
  root.append(button);
  return root;
}

/** Hand-lettered "West campus?" label; opens the West vs East guide. */
function areaEl(label: string, blurb = ""): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "culture-area";
  el.append(`${label} campus?`);
  if (blurb) el.append(Object.assign(document.createElement("small"), { textContent: blurb }));
  el.addEventListener("click", (e) => { e.stopPropagation(); setGuide(true); });
  return el;
}

const culture: MapLayer = {
  id: "culture",
  order: 60, // above pins
  addTo(map: MapLibreMap) {
    let stamps: { note: CultureNote; marker: Marker }[] = [];
    let areas: Marker[] = [];
    let token = 0;
    let frame = 0;
    let lastNote: string | null = null;

    /** Greedy declutter in screen space: West / East labels always show, then the open note, then tour order; a stamp that would overlap one already shown hides. */
    const declutter = () => {
      frame = 0;
      const open = getCulture().note;
      const placed: DOMRect[] = [];
      for (const marker of areas) {
        const el = marker.getElement();
        el.dataset.hidden = "false"; // labels never disappear: notes give way to them
        placed.push(el.getBoundingClientRect());
      }
      const order = [...stamps].sort((a, b) => Number(b.note.id === open) - Number(a.note.id === open));
      for (const { note, marker } of order) {
        const el = marker.getElement();
        const r = el.getBoundingClientRect();
        const box = new DOMRect(r.x + 6, r.y + 6, r.width - 12, r.height - 12);
        const hit = placed.some((p) => box.x < p.right && box.right > p.x && box.y < p.bottom && box.bottom > p.y);
        el.dataset.hidden = String(hit);
        el.dataset.active = String(note.id === open);
        if (!hit) placed.push(box);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(declutter); };

    const clear = () => {
      stamps.forEach((s) => s.marker.remove());
      areas.forEach((m) => m.remove());
      stamps = [];
      areas = [];
      map.off("move", schedule);
    };

    const sync = () => {
      const mine = ++token;
      const { on, note } = getCulture();
      if (!on) { clear(); lastNote = null; return; }
      if (stamps.length) {
        // Flying to the open note keeps the tour on the map; the welcome letter shows the whole campus.
        if (note !== lastNote) {
          lastNote = note;
          const target = CULTURE_NOTES.find((n) => n.id === note);
          if (target) map.flyTo({ center: [target.lng, target.lat], zoom: Math.max(map.getZoom(), 16), pitch: 0, duration: 900, padding: readerPadding() });
        }
        schedule();
        return;
      }
      void loadMapLibre().then((ml) => {
        if (mine !== token || !getCulture().on || stamps.length) return;
        stamps = CULTURE_NOTES.map((n) => ({ note: n, marker: new ml.Marker({ element: stampEl(n), anchor: "bottom" }).setLngLat([n.lng, n.lat]).addTo(map) }));
        areas = CULTURE_AREAS.map((a) => new ml.Marker({ element: areaEl(a.label, a.blurb), anchor: "center" }).setLngLat([a.lng, a.lat]).addTo(map));
        map.on("move", schedule);
        lastNote = getCulture().note;
        map.easeTo({ center: CAMPUS_CENTER, zoom: window.innerWidth < 600 ? 14.6 : 15.2, pitch: 0, bearing: 0, duration: 1200, padding: readerPadding() });
        schedule();
      });
    };
    const unsubscribe = subscribeCulture(sync);
    sync(); // culture may already be on if the user toggled it before the map style finished loading
    return { remove() { unsubscribe(); token++; if (frame) cancelAnimationFrame(frame); clear(); } };
  },
};

/** Room the reader card takes over the map (right column on desktop, bottom sheet on phones), so flights land beside it. */
function readerPadding() {
  return window.innerWidth < 600 ? { top: 120, bottom: Math.round(window.innerHeight * 0.45), left: 20, right: 20 } : { top: 80, bottom: 40, left: 40, right: 420 };
}

export default culture;
