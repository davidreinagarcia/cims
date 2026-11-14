/** @file Survey-marker pins for the map: teardrop in the category color with the category glyph inside a paper ring. Drawn on a canvas, synchronously. */
import type maplibregl from "maplibre-gl";
import { glyphPath } from "../components/Glyph";
import { LAYER_CATALOG, categoryColor } from "../lib/layerCatalog";

const INK = "#1C2733"; // --ink
const PAPER = "#F3EEE2"; // --paper
const GOLD = "#B3A369"; // --gold
const NAVY = "#003057"; // --navy
const BODY = "M20 51C20 51 4 30 4 19a16 16 0 0 1 32 0c0 11-16 32-16 32Z";
const W = 40;
const H = 52;
const RATIO = 2;

/** Id of the image used for a category's pin. Base places (landmarks, buildings) use "base". */
export function pinImageId(category: string, selected = false): string {
  return `pin-${selected ? "sel-" : ""}${category}`;
}

function drawPin(fill: string, glyph: string, selected: boolean): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = W * RATIO;
  canvas.height = H * RATIO;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(RATIO, RATIO);
  // teardrop body
  const body = new Path2D(BODY);
  ctx.fillStyle = fill;
  ctx.fill(body);
  ctx.strokeStyle = INK;
  ctx.lineWidth = selected ? 2 : 1;
  ctx.stroke(body);
  // paper ring
  ctx.beginPath();
  ctx.arc(20, 19, 10, 0, Math.PI * 2);
  ctx.strokeStyle = selected ? INK : PAPER;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // category glyph (24px grid) scaled into a 14px box centered on the ring
  ctx.save();
  ctx.translate(13, 12);
  ctx.scale(14 / 24, 14 / 24);
  ctx.strokeStyle = selected ? INK : PAPER;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = "miter";
  ctx.stroke(new Path2D(glyph));
  ctx.restore();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Registers one normal and one selected (gold) pin per layer category, plus the navy "base" pin. Returns the ids added. */
export function addPins(map: maplibregl.Map): string[] {
  const added: string[] = [];
  const add = (category: string, fill: string, glyph: string) => {
    for (const selected of [false, true]) {
      const id = pinImageId(category, selected);
      if (map.hasImage(id)) continue;
      map.addImage(id, drawPin(selected ? GOLD : fill, glyph, selected), { pixelRatio: RATIO });
      added.push(id);
    }
  };
  for (const c of LAYER_CATALOG) add(c.id, categoryColor(c), glyphPath(c.id));
  add("base", NAVY, glyphPath("building"));
  return added;
}
