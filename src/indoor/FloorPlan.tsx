/** @file Crisp SVG schematic: typed room fills, fitted labels, connector glyphs, numbered route, keyboard selection, pan and zoom. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { planLabelBounds, planShapeBounds, planWalls, roomCategory, spaceDisplayName } from "../lib/indoorPlan";
import type { IndoorRoute, RouteLeg } from "./route";
import type { IndoorGraph, IndoorLevel, IndoorSpace } from "./types";
import "./FloorPlan.css";

type DrawnLevel = Extract<IndoorLevel, { available: true }>;
type Camera = { x: number; y: number; zoom: number };
type Box = { x: number; y: number; w: number; h: number };

const MIN_ZOOM = 0.6, MAX_ZOOM = 6;
/** Line height in em; text widths are measured with the same fonts as the SVG labels. */
const LINE_EM = 1.12;
const measuring = document.createElement("canvas").getContext("2d");
const advances = new Map<string, number>();

function advance(text: string, number = false): number {
  const key = `${number}:${text}`;
  const cached = advances.get(key);
  if (cached != null) return cached;
  if (!measuring) return text.length * 0.8;
  const family = getComputedStyle(document.documentElement).getPropertyValue(number ? "--font-mono" : "--font-display");
  measuring.font = `${number ? 500 : 600} 100px ${family}`;
  const width = measuring.measureText(text).width / 100 + text.length * 0.025;
  advances.set(key, width);
  return width;
}

function touches(a: Box, b: Box, pad = 0): boolean {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

/** Carves label space around glyphs and route markers without moving text outside its room. */
function freeLabelBoxes(box: Box, avoid: Box[]): Box[] {
  let free = [box];
  for (const obstacle of avoid) free = free.flatMap((b) => {
    if (!touches(b, obstacle)) return [b];
    return [
      { ...b, w: obstacle.x - b.x }, { ...b, x: obstacle.x + obstacle.w, w: b.x + b.w - obstacle.x - obstacle.w },
      { ...b, h: obstacle.y - b.y }, { ...b, y: obstacle.y + obstacle.h, h: b.y + b.h - obstacle.y - obstacle.h },
    ].filter((candidate) => candidate.w > 0 && candidate.h > 0);
  }).sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 64);
  return free;
}

function zoomAt(camera: Camera, factor: number, point: { x: number; y: number } = camera): Camera {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * factor));
  return { x: point.x + (camera.x - point.x) * camera.zoom / zoom,
    y: point.y + (camera.y - point.y) * camera.zoom / zoom, zoom };
}

/** Splits words into n lines of similar length (greedy against the average). */
function wrap(words: string[], lines: number): string[] {
  const target = words.join(" ").length / lines;
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > target * 1.15 && out.length < lines - 1) { out.push(line); line = word; }
    else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** Picks the largest label that fits inside the room box at this zoom; falls back to the number, then to nothing. */
function fitLabelBox(space: IndoorSpace, pxPerUnit: number, b: Box) {
  const pad = Math.min(8, Math.min(b.w, b.h) * 0.1) + 3 / pxPerUnit;
  const w = b.w - pad * 2, h = b.h - pad * 2;
  if (w <= 0 || h <= 0) return null;
  const number = space.room;
  const minPx = 8;
  // Screen-size caps so labels stay a label, not a headline, when you zoom in.
  const numSize = number ? Math.min(12 / pxPerUnit, w / advance(number, true), h * 0.3) : 0;
  const reserve = number && numSize * pxPerUnit >= minPx ? numSize * 1.35 : 0;
  const words = (space.type === "void" ? "Open to below" : spaceDisplayName(space)).toUpperCase().split(/\s+/).filter(Boolean);
  let best: { lines: string[]; size: number } = { lines: [], size: 0 };
  for (let n = 1; n <= Math.min(4, words.length); n++) {
    const lines = wrap(words, n);
    const longest = Math.max(...lines.map((line) => advance(line)));
    const size = Math.min(15 / pxPerUnit, w / longest, (h - reserve) / (lines.length * LINE_EM));
    if (size > best.size) best = { lines, size };
  }
  const nameFits = best.size * pxPerUnit >= (number ? 9 : minPx);
  const numberFits = !!number && numSize * pxPerUnit >= minPx;
  if (nameFits && (numberFits || !number)) return { b, lines: best.lines, size: best.size, number: numberFits ? number : undefined, numSize };
  // Tight numbered room: the published number is what people look for, so it wins over the name.
  if (number) {
    const alone = Math.min(13 / pxPerUnit, w / advance(number, true), h * 0.85);
    if (alone * pxPerUnit >= minPx) return { b, lines: [], size: 0, number, numSize: alone };
    return null;
  }
  return nameFits ? { b, lines: best.lines, size: best.size, number: undefined, numSize } : null;
}

/** Try every free rectangle before dropping a label; a smaller area can fit a long room name better. */
function labelLayout(space: IndoorSpace, pxPerUnit: number, avoid: Box[], viewport: Box) {
  if (space.shape.kind === "circle") return null;
  const b = planLabelBounds(space.shape);
  const x = Math.max(b.x, viewport.x), y = Math.max(b.y, viewport.y);
  const visible = { x, y, w: Math.min(b.x + b.w, viewport.x + viewport.w) - x, h: Math.min(b.y + b.h, viewport.y + viewport.h) - y };
  if (visible.w <= 0 || visible.h <= 0) return null;
  const choices = freeLabelBoxes(visible, avoid).map((box) => fitLabelBox(space, pxPerUnit, box)).filter((layout) => layout !== null);
  const score = (layout: NonNullable<ReturnType<typeof fitLabelBox>>) => (layout.lines.length ? 1000 : 0) + (layout.number ? 100 : 0) + (layout.lines.length ? layout.size : layout.numSize) * pxPerUnit;
  return choices.sort((a, b) => score(b) - score(a))[0] ?? null;
}

function SpaceLabel({ layout, spaceId }: { layout: ReturnType<typeof labelLayout>; spaceId: string }) {
  if (!layout) return null;
  const { b, lines, size, number, numSize } = layout;
  const cx = b.x + b.w / 2;
  const block = lines.length * size * LINE_EM + (number ? numSize * (lines.length ? 1.35 : 1) : 0);
  let y = b.y + b.h / 2 - block / 2;
  return <g className="floor-plan__label" data-space={spaceId} aria-hidden="true">
    {lines.length > 0 && <text x={cx} fontSize={size} textAnchor="middle">
      {lines.map((line, i) => { y += size * LINE_EM; return <tspan key={i} x={cx} y={y - size * 0.25}>{line}</tspan>; })}
    </text>}
    {number && <text className="floor-plan__number" x={cx} y={y + numSize * (lines.length ? 1.25 : 0.95)} fontSize={numSize} textAnchor="middle">{number}</text>}
  </g>;
}

/** A glyph that keeps its screen size at any zoom. */
function Pin({ x, y, k, children, className, label }: { x: number; y: number; k: number; children: ReactNode; className: string; label?: string }) {
  return <g className={className} transform={`translate(${x},${y}) scale(${k})`}>{label && <title>{label}</title>}{children}</g>;
}

/** Everything the plan needs to draw a route: the route, the legs on this level and which step is highlighted. */
export interface PlanRoute { route: IndoorRoute; legs: RouteLeg[]; activeStep: number | null; startTag?: { title: string; detail: string } }

/** Renders one available level with controls and brings the route or the selected space into view. */
export default function FloorPlan({ level, graph, selected, planRoute, onSelect, interactive = true, frame }: {
  level: DrawnLevel; graph?: IndoorGraph; selected?: IndoorSpace; planRoute?: PlanRoute;
  onSelect: (space: IndoorSpace) => void; interactive?: boolean;
  /** What the home view frames, in plan units; defaults to the level's viewBox. */ frame?: { x: number; y: number; w: number; h: number };
}) {
  const [vx, vy, width, height] = level.viewBox;
  const [stageSize, setStageSize] = useState({ w: width, h: height });
  const phone = window.matchMedia("(max-width: 767.98px)").matches;
  const aspect = stageSize.w / stageSize.h;
  const stageWidth = Math.max(width, height * aspect);
  const stageHeight = Math.max(height, width / aspect);
  const initial = { x: vx + width / 2, y: vy + height / 2, zoom: 0.94 };
  const [camera, setCamera] = useState<Camera>(initial);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; camera: Camera; scale: number; moved: boolean }>();
  const dragged = useRef(false);
  const pxPerUnit = stageSize.w / (stageWidth / camera.zoom);
  const k = 1 / pxPerUnit; // plan units per screen pixel
  const route = planRoute?.route;
  const legs = planRoute?.legs;
  const walls = useMemo(() => planWalls(level), [level]);
  const [, setFontVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    void document.fonts.ready.then(() => { if (alive) { advances.clear(); setFontVersion((v) => v + 1); } });
    return () => { alive = false; };
  }, []);

  // Observe the actual stage: the camera viewBox has the same aspect ratio.
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      if (w > 0 && h > 0) setStageSize((current) => current.w === w && current.h === h ? current : { w, h });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Home frames this level, with equal screen-space padding on all sides.
  const margin = phone ? 28 : 40;
  const home: Camera = frame
    ? { x: frame.x + frame.w / 2, y: frame.y + frame.h / 2, zoom: Math.min(MAX_ZOOM,
      stageWidth / (frame.w / Math.max(0.1, 1 - 2 * margin / stageSize.w)), stageHeight / (frame.h / Math.max(0.1, 1 - 2 * margin / stageSize.h))) }
    : initial;
  // With a route: frame the whole route plus the destination room, but only when that is a real close-up;
  // a small zoom-in would just crop the plan.
  const fitKey = route?.nodes.map((node) => node.id).join("|") ?? "";
  useEffect(() => {
    const points: [number, number][] = route?.nodes.filter((node) => node.level === level.id).map((node) => [node.x, node.y]) ?? [];
    if (points.length && selected && level.spaces.some((space) => space.id === selected.id)) {
      const b = planShapeBounds(selected.shape);
      points.push([b.x, b.y], [b.x + b.w, b.y + b.h]);
    }
    if (!points.length) { setCamera(home); return; }
    const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
    const left = Math.min(...xs), top = Math.min(...ys);
    const w = Math.max(...xs) - left, h = Math.max(...ys) - top;
    const padX = 2 * margin * stageWidth / stageSize.w / home.zoom;
    const padY = 2 * margin * stageHeight / stageSize.h / home.zoom;
    const zoom = Math.min(MAX_ZOOM, home.zoom * 2.2, stageWidth / (w + padX), stageHeight / (h + padY));
    setCamera(zoom < home.zoom * 1.05 ? home : { x: left + w / 2, y: top + h / 2, zoom });
  }, [fitKey, level.id, selected?.id, vx, vy, width, height, stageWidth, stageHeight, home.x, home.y, home.zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const element = svg.current;
    if (!element || !interactive) return;
    const wheel = (event: WheelEvent) => {
      const matrix = element.getScreenCTM();
      if (!matrix) return;
      event.preventDefault();
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      setCamera((current) => zoomAt(current, Math.exp(-Math.max(-200, Math.min(200, event.deltaY)) * 0.003), point));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [interactive]);

  const nodeById = useMemo(() => new Map(graph?.nodes.map((node) => [node.id, node]) ?? []), [graph]);
  const connectors = (graph?.connectors ?? []).flatMap((connector) => {
    const node = nodeById.get(connector.nodes[level.id]);
    if (!node) return [];
    // Drawing glyphs belong in their explicit core rooms; the walking graph keeps its door positions.
    const core = level.spaces.find((space) => space.type === "core" && space.id.includes(connector.kind))
      ?? (connector.kind === "elevator" ? level.spaces.find((space) => space.type === "core") : undefined);
    const b = core && planLabelBounds(core.shape);
    const point = b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : node;
    return [{ connector, node: point }];
  });
  const entrances = (graph?.entrances ?? []).filter((entrance) => entrance.level === level.id)
    .flatMap((entrance) => { const node = nodeById.get(entrance.node); return node ? [{ entrance, node }] : []; });

  // Numbered circles: one per step on this level; steps that land on top of each other at this zoom share one
  // marker labelled with their range ("2–4"), so every number in the list still has its place on the plan.
  const circles: { numbers: number[]; x: number; y: number; active: boolean }[] = [];
  if (route) route.steps.forEach((step, index) => {
    const node = route.nodes[step.node];
    if (!node || node.level !== level.id) return;
    const active = planRoute?.activeStep === index;
    circles.push({ numbers: [index + 1], x: node.x, y: node.y, active });
  });
  const markerText = (numbers: number[]) => {
    const sorted = [...numbers].sort((a, b) => a - b), groups: string[] = [];
    let first = sorted[0], last = first;
    for (const number of sorted.slice(1)) {
      if (number === last + 1) last = number;
      else { groups.push(first === last ? String(first) : `${first}–${last}`); first = last = number; }
    }
    groups.push(first === last ? String(first) : `${first}–${last}`);
    return groups.join(",");
  };
  const markerHalf = (numbers: number[]) => Math.max(11, 5 + advance(markerText(numbers), true) * 6);
  // Recheck after every merge: a wider range badge can now meet another badge. This is transitive.
  for (let i = 0; i < circles.length; i++) {
    const a = circles[i];
    const j = circles.findIndex((b, index) => index > i && Math.abs(a.x - b.x) < (markerHalf(a.numbers) + markerHalf(b.numbers) + 6) * k && Math.abs(a.y - b.y) < 28 * k);
    if (j >= 0) { const [b] = circles.splice(j, 1); a.numbers.push(...b.numbers); a.active ||= b.active; i = -1; }
  }
  // The highlighted stretch: from the active step's node to the next step's node, on this level.
  let highlight: [number, number][] = [];
  if (route && planRoute?.activeStep != null) {
    const from = route.steps[planRoute.activeStep]?.node ?? 0;
    const to = route.steps[planRoute.activeStep + 1]?.node ?? route.nodes.length - 1;
    highlight = route.nodes.slice(from, Math.max(from, to) + 1).filter((node) => node.level === level.id).map((node) => [node.x, node.y]);
  }
  const start = route?.nodes[0];

  const left = camera.x - stageWidth / camera.zoom / 2, top = camera.y - stageHeight / camera.zoom / 2;
  const screenBox = (b: Box): Box => ({ x: (b.x - left) / k, y: (b.y - top) / k, w: b.w / k, h: b.h / k });
  const pinBox = (p: { x: number; y: number }, halfW: number, halfH = halfW): Box => ({ x: p.x - halfW * k, y: p.y - halfH * k, w: halfW * 2 * k, h: halfH * 2 * k });
  const symbols = [...connectors.map(({ node }) => pinBox(node, 13)), ...entrances.map(({ node }) => pinBox(node, 9)),
    ...circles.map((c) => pinBox(c, markerHalf(c.numbers) + 3, 14))];
  const controlBoxes: Box[] = interactive ? [{ x: stageSize.w - 52, y: 0, w: 52, h: 128 },
    ...(!phone ? [{ x: 0, y: 0, w: 64, h: 60 + (graph ? new Set(graph.nodes.map((node) => node.level)).size : 5) * 44 }] : [])] : [];
  const controlObstacles = controlBoxes.map((b) => ({ x: left + b.x * k, y: top + b.y * k, w: b.w * k, h: b.h * k }));
  const routeBoxes = (legs ?? []).flatMap((leg) => leg.points.slice(1).map(([x, y], i) => {
    const [xx, yy] = leg.points[i];
    return { x: Math.min(x, xx) - 4 * k, y: Math.min(y, yy) - 4 * k, w: Math.abs(x - xx) + 8 * k, h: Math.abs(y - yy) + 8 * k };
  }));
  const labels = level.spaces.map((space) => {
    let layout = labelLayout(space, pxPerUnit, [...symbols, ...routeBoxes, ...controlObstacles],
      { x: left + 3 * k, y: top + 3 * k, w: (stageSize.w - 6) * k, h: (stageSize.h - 6) * k });
    if (layout) {
      const b = screenBox(layout.b);
      // A route close-up may crop other rooms: hide their whole label instead of showing cut text.
      if (b.x < 3 || b.y < 3 || b.x + b.w > stageSize.w - 3 || b.y + b.h > stageSize.h - 3) layout = null;
    }
    return { space, layout };
  });
  const occupied = symbols.map(screenBox);
  labels.forEach(({ layout }) => {
    if (!layout) return;
    const { b, lines, size, number, numSize } = layout;
    const w = Math.max(0, ...lines.map((line) => advance(line) * size), number ? advance(number, true) * numSize : 0);
    const h = lines.length * size * LINE_EM + (number ? numSize * (lines.length ? 1.35 : 1) : 0);
    occupied.push(screenBox({ x: b.x + (b.w - w) / 2, y: b.y + (b.h - h) / 2, w, h }));
  });
  // Keep annotations clear of the level rail and zoom controls as well as the floor's ink walls.
  occupied.push(...controlBoxes);
  const wallSegments = [...walls.matchAll(/M([-\d.e+]+),([-\d.e+]+)L([-\d.e+]+),([-\d.e+]+)/g)].map((m) => {
    const [, x, y, xx, yy] = m.map(Number);
    return { x: (x - left) / k, y: (y - top) / k, xx: (xx - left) / k, yy: (yy - top) / k };
  });
  const crossesWall = (box: Box) => wallSegments.some(({ x, y, xx, yy }) => {
    // Liang–Barsky clipping, expanded by three pixels for breathing space from the wall.
    let low = 0, high = 1;
    const dx = xx - x, dy = yy - y;
    const p = [-dx, dx, -dy, dy], q = [x - box.x + 3, box.x + box.w + 3 - x, y - box.y + 3, box.y + box.h + 3 - y];
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-8) { if (q[i] < 0) return false; }
      else if (p[i] < 0) low = Math.max(low, q[i] / p[i]);
      else high = Math.min(high, q[i] / p[i]);
    }
    return low <= high;
  });
  const annotations: { key: string; text: string; kind: string; box: Box }[] = [];
  const place = (key: string, text: string, kind: string, anchor: { x: number; y: number }) => {
    const font = kind === "start" ? 11 : kind === "transition" ? 10 : 9;
    const w = kind === "start" ? 112 : advance(text) * font + 14, h = kind === "start" ? 22 : 18;
    const x = (anchor.x - left) / k, y = (anchor.y - top) / k;
    if (x < 0 || y < 0 || x > stageSize.w || y > stageSize.h) return undefined;
    for (const distance of [18, 32, 50, 72, 98, 128]) {
      const candidates = [
        { x: x - w / 2, y: y + distance }, { x: x - w / 2, y: y - distance - h },
        { x: x + distance, y: y - h / 2 }, { x: x - distance - w, y: y - h / 2 },
        { x: x + distance, y: y + distance }, { x: x - distance - w, y: y + distance },
        { x: x + distance, y: y - distance - h }, { x: x - distance - w, y: y - distance - h },
      ];
      for (const position of candidates) {
        const box = { ...position, w, h };
        if (box.x < 8 || box.y < 8 || box.x + w > stageSize.w - 8 || box.y + h > stageSize.h - 8) continue;
        if (occupied.some((other) => touches(box, other, 5)) || crossesWall(box)) continue;
        annotations.push({ key, text, kind, box }); occupied.push(box); return box;
      }
    }
    return undefined; // The directory and selection retain the full text when the canvas is crowded.
  };
  const startBox = start?.level === level.id && planRoute?.startTag ? place("start", planRoute.startTag.title, "start", start) : undefined;
  route?.transitions.filter((t) => t.level === level.id).forEach((t, i) => place(`t${i}`,
    `${t.kind === "stairs" ? "STAIRS" : "ELEVATOR"} ${t.direction === "up" ? "↑" : "↓"} ${t.to === "B" ? "BASEMENT" : `LEVEL ${t.to}`}`, "transition", t));
  if (startBox && planRoute?.startTag) place("start-detail", planRoute.startTag.detail.toUpperCase(), "detail",
    { x: left + (startBox.x + startBox.w / 2) * k, y: top + (startBox.y + startBox.h) * k });
  entrances.filter(({ node }) => node.id !== start?.id).forEach(({ entrance, node }) => place(entrance.id, entrance.name.toUpperCase(), "entrance-label", node));

  return <div className="floor-plan">
    {interactive && <div className="floor-plan__zoom cims-mapctl" role="group" aria-label="Plan zoom">
      <button type="button" aria-label="Zoom in" disabled={camera.zoom >= MAX_ZOOM} onClick={() => setCamera((current) => zoomAt(current, 1.3))}>+</button>
      <button type="button" aria-label="Zoom out" disabled={camera.zoom <= MIN_ZOOM} onClick={() => setCamera((current) => zoomAt(current, 1 / 1.3))}>−</button>
      <button type="button" aria-label="Reset view" title="Reset view" onClick={() => setCamera(home)}><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></button>
    </div>}
    <svg ref={svg} className="floor-plan__svg" viewBox={`${camera.x - stageWidth / camera.zoom / 2} ${camera.y - stageHeight / camera.zoom / 2} ${stageWidth / camera.zoom} ${stageHeight / camera.zoom}`}
      aria-label={`${level.name} schematic floor plan`} role="group"
      onPointerDown={(event) => {
        if (!interactive || !event.isPrimary || event.button !== 0) return;
        const matrix = svg.current?.getScreenCTM();
        if (!matrix) return;
        dragged.current = false;
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, camera, scale: matrix.a, moved: false };
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        if (!start.moved && Math.hypot(dx, dy) < 5) return;
        start.moved = true;
        dragged.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setCamera({ ...start.camera, x: start.camera.x - dx / start.scale, y: start.camera.y - dy / start.scale });
      }}
      onPointerUp={() => { drag.current = undefined; }} onPointerCancel={() => { drag.current = undefined; }}>
      <title>{level.name} schematic floor plan</title>
      <path d={level.outline} className="floor-plan__floor" />
      {level.spaces.map((space) => {
        const shape = space.shape;
        const isSelected = selected?.id === space.id;
        const pickable = space.type !== "void" && interactive;
        const props = {
          className: `cims-room cims-room--${roomCategory(space.type)}${isSelected ? " cims-room--selected" : ""}`,
          tabIndex: pickable ? 0 : undefined, role: pickable ? "button" : undefined,
          "aria-label": pickable ? `${space.name}${space.room && !space.name.includes(space.room) ? `, room ${space.room}` : ""}, ${space.type}` : undefined,
          "aria-pressed": pickable ? isSelected : undefined,
          onClick: () => { if (!dragged.current && pickable) onSelect(space); },
          onKeyDown: (event: React.KeyboardEvent<SVGElement>) => {
            if (pickable && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(space); }
          },
        };
        return <g key={space.id}>
          <title>{space.name}{space.room && !space.name.includes(space.room) ? `, room ${space.room}` : ""}</title>
          {shape.kind === "rect" ? <rect {...props} x={shape.x} y={shape.y} width={shape.w} height={shape.h} />
            : shape.kind === "circle" ? <circle {...props} cx={shape.cx} cy={shape.cy} r={shape.r} />
            : <polygon {...props} points={shape.points} />}
        </g>;
      })}
      <path d={walls} className="floor-plan__outline" />
      <g className="floor-plan__labels">{labels.map(({ space, layout }) => <SpaceLabel key={space.id} spaceId={space.id} layout={layout} />)}</g>
      <g aria-hidden="true">
        {connectors.filter(({ node }) => !circles.some((c) => Math.abs(c.x - node.x) < (markerHalf(c.numbers) + 12) * k && Math.abs(c.y - node.y) < 24 * k))
          .map(({ connector, node }) => <Pin key={connector.id} x={node.x} y={node.y} k={k} className={`floor-plan__glyph floor-plan__glyph--${connector.kind}`} label={connector.name}>
          <rect x="-10" y="-10" width="20" height="20" />
          {connector.kind === "stairs" ? <path d="M-6 6 H-2 V2 H2 V-2 H6 V-6" /> : <><path d="M-4 -1 L0 -6 L4 -1 Z" /><path d="M-4 1 L0 6 L4 1 Z" /></>}
        </Pin>)}
        {entrances.map(({ entrance, node }) => !(start && start.id === node.id) && <Pin key={entrance.id} x={node.x} y={node.y} k={k} className="floor-plan__entrance" label={entrance.name}>
          <circle r="6" />
        </Pin>)}
      </g>
      {route && !!legs?.length && <g aria-hidden="true" className="floor-plan__route">
        {legs.map((leg, index) => <polyline key={index} points={leg.points.map((point) => point.join(",")).join(" ")} />)}
        {highlight.length > 1 && <polyline className="floor-plan__route-active" points={highlight.map((point) => point.join(",")).join(" ")} />}
      </g>}
      {route && <g aria-hidden="true">
        {circles.map((c) => {
          const label = markerText(c.numbers), half = markerHalf(c.numbers);
          return <Pin key={c.numbers[0]} x={c.x} y={c.y} k={k} className={`floor-plan__step${c.active ? " floor-plan__step--active" : ""}`}>
            <rect x={-half} y="-11" width={half * 2} height="22" rx="11" />
            <text textAnchor="middle" dominantBaseline="central">{label}</text>
          </Pin>;
        })}
      </g>}
      <g aria-hidden="true" className="floor-plan__annotations">
        {annotations.map(({ key, text, kind, box }) => <Pin key={key} x={left + box.x * k} y={top + box.y * k} k={k} className={`floor-plan__annotation floor-plan__annotation--${kind}`} label={text}>
          <rect width={box.w} height={box.h} rx={kind === "start" ? 11 : 3} />
          <text x={box.w / 2} y={box.h / 2} textAnchor="middle" dominantBaseline="central">{text}</text>
        </Pin>)}
      </g>
    </svg>
  </div>;
}
