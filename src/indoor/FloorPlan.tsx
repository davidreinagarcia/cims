/** @file Crisp SVG schematic: typed room fills, fitted labels, connector glyphs, numbered route, keyboard selection, pan and zoom. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { planShapeBounds, roomCategory, spaceDisplayName } from "../lib/indoorPlan";
import type { IndoorRoute, RouteLeg } from "./route";
import type { IndoorGraph, IndoorLevel, IndoorSpace } from "./types";
import "./FloorPlan.css";

type DrawnLevel = Extract<IndoorLevel, { available: true }>;
type Camera = { x: number; y: number; zoom: number };

const MIN_ZOOM = 0.6, MAX_ZOOM = 6;
/** Rough advance width of a Barlow Condensed capital, in em, and line height. Conservative so labels never spill. */
const CHAR_EM = 0.56, LINE_EM = 1.12, NUM_EM = 0.62;

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
function labelLayout(space: IndoorSpace, pxPerUnit: number, avoid: { x: number; y: number }[]) {
  if (space.shape.kind === "circle") return null;
  let b = planShapeBounds(space.shape);
  // A stair or elevator glyph inside the room: put the label in the half of the room away from it.
  const glyph = avoid.find((p) => p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h);
  if (glyph) {
    const r = 12 / pxPerUnit;
    b = glyph.y - b.y > b.y + b.h - glyph.y ? { ...b, h: glyph.y - r - b.y } : { ...b, y: glyph.y + r, h: b.y + b.h - glyph.y - r };
  }
  const pad = Math.min(8, Math.min(b.w, b.h) * 0.1) + 3 / pxPerUnit;
  const w = b.w - pad * 2, h = b.h - pad * 2;
  if (w <= 0 || h <= 0) return null;
  const number = space.room;
  const minPx = 8;
  // Screen-size caps so labels stay a label, not a headline, when you zoom in.
  const numSize = number ? Math.min(12 / pxPerUnit, w / (number.length * NUM_EM), h * 0.3) : 0;
  const reserve = number && numSize * pxPerUnit >= minPx ? numSize * 1.35 : 0;
  const words = (space.type === "void" ? "Open to below" : spaceDisplayName(space)).toUpperCase().split(/\s+/).filter(Boolean);
  let best: { lines: string[]; size: number } = { lines: [], size: 0 };
  for (let n = 1; n <= Math.min(4, words.length); n++) {
    const lines = wrap(words, n);
    const longest = Math.max(...lines.map((line) => line.length));
    const size = Math.min(15 / pxPerUnit, w / (longest * CHAR_EM), (h - reserve) / (lines.length * LINE_EM));
    if (size > best.size) best = { lines, size };
  }
  const nameFits = best.size * pxPerUnit >= (number ? 9 : minPx);
  const numberFits = !!number && numSize * pxPerUnit >= minPx;
  if (nameFits && (numberFits || !number)) return { b, lines: best.lines, size: best.size, number: numberFits ? number : undefined, numSize };
  // Tight numbered room: the published number is what people look for, so it wins over the name.
  if (number) {
    const alone = Math.min(13 / pxPerUnit, w / (number.length * NUM_EM), h * 0.6);
    if (alone * pxPerUnit >= minPx) return { b, lines: [], size: 0, number, numSize: alone };
  }
  return nameFits ? { b, lines: best.lines, size: best.size, number: undefined, numSize } : null;
}

function SpaceLabel({ space, pxPerUnit, avoid }: { space: IndoorSpace; pxPerUnit: number; avoid: { x: number; y: number }[] }) {
  const layout = labelLayout(space, pxPerUnit, avoid);
  if (!layout) return null;
  const { b, lines, size, number, numSize } = layout;
  const cx = b.x + b.w / 2;
  const block = lines.length * size * LINE_EM + (number ? numSize * (lines.length ? 1.35 : 1) : 0);
  let y = b.y + b.h / 2 - block / 2;
  return <g className="floor-plan__label" aria-hidden="true">
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

  // Home view: the drawn building (shared by every level, so levels line up) filling the stage, with a margin.
  const home: Camera = frame
    ? { x: frame.x + frame.w / 2, y: frame.y + frame.h / 2, zoom: Math.min(3, stageWidth / (frame.w * 1.2), stageHeight / (frame.h * 1.14)) }
    : initial;
  // With a route: frame the whole route plus the destination room, but only when that is a real close-up;
  // a small zoom-in would just crop the plan.
  const fitKey = route?.nodes.map((node) => node.id).join("|") ?? "";
  useEffect(() => {
    const points: [number, number][] = route?.nodes.map((node) => [node.x, node.y]) ?? [];
    if (points.length && selected) {
      const b = planShapeBounds(selected.shape);
      points.push([b.x, b.y], [b.x + b.w, b.y + b.h]);
    }
    if (!points.length) { setCamera(home); return; }
    const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
    const left = Math.min(...xs), top = Math.min(...ys);
    const w = Math.max(...xs) - left, h = Math.max(...ys) - top;
    const pad = Math.max(width, height) * 0.25;
    const zoom = Math.min(home.zoom * 1.8, Math.min(stageWidth / (w + pad), stageHeight / (h + pad)));
    setCamera(zoom < home.zoom * 1.3 ? home : { x: left + w / 2, y: top + h / 2, zoom });
  }, [fitKey, selected?.id, vx, vy, width, height, stageWidth, stageHeight, home.zoom]); // eslint-disable-line react-hooks/exhaustive-deps

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
    return node ? [{ connector, node }] : [];
  });
  const glyphPoints = connectors.map(({ node }) => node);
  const entrances = (graph?.entrances ?? []).filter((entrance) => entrance.level === level.id)
    .flatMap((entrance) => { const node = nodeById.get(entrance.node); return node ? [{ entrance, node }] : []; });

  // Numbered circles: one per step on this level; steps that land on top of each other at this zoom share one
  // marker labelled with their range ("2–4"), so every number in the list still has its place on the plan.
  const circles: { first: number; last: number; x: number; y: number; active: boolean }[] = [];
  if (route) route.steps.forEach((step, index) => {
    const node = route.nodes[step.node];
    if (!node || node.level !== level.id) return;
    const active = planRoute?.activeStep === index;
    const near = circles.find((c) => Math.hypot(c.x - node.x, c.y - node.y) < 24 * k);
    if (near) { near.last = index + 1; near.active ||= active; }
    else circles.push({ first: index + 1, last: index + 1, x: node.x, y: node.y, active });
  });
  // The highlighted stretch: from the active step's node to the next step's node, on this level.
  let highlight: [number, number][] = [];
  if (route && planRoute?.activeStep != null) {
    const from = route.steps[planRoute.activeStep]?.node ?? 0;
    const to = route.steps[planRoute.activeStep + 1]?.node ?? route.nodes.length - 1;
    highlight = route.nodes.slice(from, Math.max(from, to) + 1).filter((node) => node.level === level.id).map((node) => [node.x, node.y]);
  }
  const start = route?.nodes[0];

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
          {shape.kind === "rect" ? <rect {...props} x={shape.x} y={shape.y} width={shape.w} height={shape.h} />
            : shape.kind === "circle" ? <circle {...props} cx={shape.cx} cy={shape.cy} r={shape.r} />
            : <polygon {...props} points={shape.points} />}
        </g>;
      })}
      <path d={level.outline} className="floor-plan__outline" />
      <g className="floor-plan__labels">{level.spaces.map((space) => <SpaceLabel key={space.id} space={space} pxPerUnit={pxPerUnit} avoid={glyphPoints} />)}</g>
      <g aria-hidden="true">
        {connectors.map(({ connector, node }) => <Pin key={connector.id} x={node.x} y={node.y} k={k} className={`floor-plan__glyph floor-plan__glyph--${connector.kind}`} label={connector.name}>
          <rect x="-10" y="-10" width="20" height="20" />
          {connector.kind === "stairs" ? <path d="M-6 6 H-2 V2 H2 V-2 H6 V-6" /> : <><path d="M-4 -1 L0 -6 L4 -1 Z" /><path d="M-4 1 L0 6 L4 1 Z" /></>}
        </Pin>)}
        {entrances.map(({ entrance, node }) => !(start && start.id === node.id) && <Pin key={entrance.id} x={node.x} y={node.y} k={k} className="floor-plan__entrance" label={entrance.name}>
          <circle r="6" />
          <text y="18" textAnchor="middle">ENTRANCE</text>
        </Pin>)}
      </g>
      {route && !!legs?.length && <g aria-hidden="true" className="floor-plan__route">
        {legs.map((leg, index) => <polyline key={index} points={leg.points.map((point) => point.join(",")).join(" ")} style={{ strokeWidth: 3.5 * k, strokeDasharray: `${9 * k} ${6 * k}` }} />)}
        {highlight.length > 1 && <polyline className="floor-plan__route-active" points={highlight.map((point) => point.join(",")).join(" ")} style={{ strokeWidth: 6 * k }} />}
      </g>}
      {route && <g aria-hidden="true">
        {start?.level === level.id && planRoute?.startTag && <Pin x={start.x} y={start.y} k={k} className="floor-plan__start">
          <rect x="-56" y="16" width="112" height="22" rx="11" />
          <text y="31" textAnchor="middle" className="floor-plan__start-title">{planRoute.startTag.title}</text>
          <text y="51" textAnchor="middle" className="floor-plan__start-detail">{planRoute.startTag.detail.toUpperCase()}</text>
        </Pin>}
        {route.transitions.filter((t) => t.level === level.id).map((t, i) => <Pin key={`t${i}`} x={t.x} y={t.y} k={k} className="floor-plan__transition">
          <text x="16" y="-14">{t.kind === "stairs" ? "STAIRS" : "ELEVATOR"} {t.direction === "up" ? "↑" : "↓"} {t.to === "B" ? "BASEMENT" : `LEVEL ${t.to}`}</text>
        </Pin>)}
        {circles.map((c) => {
          const label = c.first === c.last ? String(c.first) : `${c.first}–${c.last}`;
          const half = Math.max(11, 4 + label.length * 3.8);
          return <Pin key={c.first} x={c.x} y={c.y} k={k} className={`floor-plan__step${c.active ? " floor-plan__step--active" : ""}`}>
            <rect x={-half} y="-11" width={half * 2} height="22" rx="11" />
            <text textAnchor="middle" dominantBaseline="central">{label}</text>
          </Pin>;
        })}
      </g>}
    </svg>
  </div>;
}
