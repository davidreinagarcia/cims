/** @file Hatch pattern image for the selected building's walls: one tiny SVG tinted from the palette and registered with map.addImage. */
import type maplibregl from "maplibre-gl";
import hatchSvg from "./hatch.svg?raw";
import { GOLD_INK, PAPER } from "../palette";

/** Image id of the gold hatch (selected building walls). */
export const HATCH_GOLD = "hatch-gold";

// MapLibre maps a wall pattern's x to distance along the wall and its y to height, at different scales:
// on screen a square tile comes out about three times wider than tall. The tile is therefore narrow
// (2 × 6 logical px, drawn at 4×) so the hatch reads as an even ~45° engraving line on the walls.
const W = 2;
const H = 6;
const RATIO = 4;
const VARIANTS = [
  { id: HATCH_GOLD, line: GOLD_INK, ground: PAPER },
];

function blank(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W * RATIO;
  canvas.height = H * RATIO;
  return canvas;
}

function pixels(ground: string, hatch?: HTMLImageElement): ImageData {
  const ctx = blank().getContext("2d")!;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W * RATIO, H * RATIO);
  if (hatch) ctx.drawImage(hatch, 0, 0, W * RATIO, H * RATIO);
  return ctx.getImageData(0, 0, W * RATIO, H * RATIO);
}

/**
 * Registers the wall hatch patterns. Each starts as its flat ground color (so layers can use it right
 * away) and gets its hatch lines as soon as the SVG decodes. Returns the image ids added.
 */
export function addHatchPatterns(map: maplibregl.Map): string[] {
  const added: string[] = [];
  for (const v of VARIANTS) {
    if (map.hasImage(v.id)) continue;
    map.addImage(v.id, pixels(v.ground), { pixelRatio: RATIO });
    added.push(v.id);
    const img = new Image(W * RATIO, H * RATIO);
    img.onload = () => {
      if (map.hasImage(v.id)) map.updateImage(v.id, pixels(v.ground, img));
    };
    img.src = "data:image/svg+xml," + encodeURIComponent(hatchSvg.replace("<svg ", `<svg color="${v.line}" `).replace('width="8" height="8"', `width="${W * RATIO}" height="${H * RATIO}"`));
  }
  return added;
}
