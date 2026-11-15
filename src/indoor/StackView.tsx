/** @file Frontal exploded floor slabs with measured level labels, room selection and vertical route links. */
import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { drawnBounds, levelRank, planWalls, roomCategory, spaceDisplayName } from "../lib/indoorPlan";
import type { IndoorRoute } from "./route";
import type { IndoorBuilding, IndoorLevel, IndoorSpace } from "./types";
import "./StackView.css";

type DrawnLevel = Extract<IndoorLevel, { available: true }>;
type Point = { x: number; y: number };

/** The corner points of an outline path ("M x y L x y … Z", possibly several rings), duplicates removed. */
function outlineVertices(d: string): Point[] {
  const out: Point[] = [];
  for (const m of d.matchAll(/[ML]\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g)) {
    const p = { x: Number(m[1]), y: Number(m[2]) };
    if (!out.some((q) => q.x === p.x && q.y === p.y)) out.push(p);
  }
  return out;
}

/** Shows the Plan | Stack toggle in the building header. Set to false to hide the stack view for a demo. */
export const STACK_VIEW_ENABLED = true;

/** Exploded solid floor slabs; select levels or rooms and open the active level's detailed plan. */
export default function StackView({ building, levels, activeId, selected, route, onLevel, onOpenPlan, onSelect, roomCount }: {
  building: IndoorBuilding; levels: DrawnLevel[]; activeId?: string; selected?: IndoorSpace; route?: IndoorRoute;
  activeStep: number | null; onLevel: (id: string) => void; onOpenPlan: () => void;
  onSelect: (space: IndoorSpace) => void; roomCount: (level: IndoorLevel) => number;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [anchors, setAnchors] = useState<Record<string, Point>>({});
  const ordered = [...levels].sort((a, b) => levelRank(a.id) - levelRank(b.id));
  const frame = drawnBounds(levels) ?? { x: 0, y: 0, w: 100, h: 100 };
  const pad = Math.max(frame.w, frame.h) * 0.04;
  const box = { x: frame.x - pad, y: frame.y - pad, w: frame.w + pad * 2, h: frame.h + pad * 2 };
  // Turn portrait schematics within Stack only: long edges face the viewer, with no diagonal scene rotation.
  const turned = box.h > box.w;
  const drawingW = turned ? box.h : box.w;
  const drawingH = turned ? box.w : box.h;
  const orient = (p: Point): Point => turned ? { x: box.h - (p.y - box.y), y: p.x - box.x } : { x: p.x - box.x, y: p.y - box.y };
  const drawingTransform = `${turned ? `translate(${box.h} 0) rotate(90) ` : ""}translate(${-box.x} ${-box.y})`;
  const narrow = size.w < 500;
  const labelW = narrow ? 94 : 122;
  const margin = narrow ? 12 : 28;
  const n = ordered.length;
  // Reserve the aligned label column and fit the entire projected stack, including perspective and slab depth.
  const maxGap = narrow ? 100 : n <= 3 ? 210 : 145;
  // Plates may overlap in projection (like an exploded axonometric), so tall stacks keep readable plates.
  const shelves = Math.max(1, 1 + (n - 1) * 0.62);
  const shelfHeight = Math.min((size.h * 0.8 - 14) / shelves, maxGap * 0.8 / 0.62);
  const plateW = Math.max(1, Math.min(760, shelfHeight / 0.53 * drawingW / drawingH, (size.w - labelW - margin * 3) * 0.92));
  const plateH = plateW * drawingH / drawingW;
  const gap = Math.max(1, Math.min(maxGap, (size.h * 0.88 - plateH * 0.53 - 14) / (Math.max(1, n - 1) * 0.85)));
  const z = (index: number) => (index - (n - 1) / 2) * gap;
  const centerX = margin + (size.w - labelW - margin * 3) / 2;
  const labelX = Math.min(size.w - labelW - margin, centerX + plateW * 0.58 + margin);
  const thickness = narrow ? 5 : 10;

  // Guides connect only coincident outline corners, never an inferred building bounding box.
  const guides: { key: string; from: string; to: string }[] = [];
  ordered.slice(1).forEach((upper, k) => {
    const lower = ordered[k];
    const below = outlineVertices(lower.outline);
    outlineVertices(upper.outline).forEach((v, i) => {
      const match = below.findIndex((w) => Math.hypot(v.x - w.x, v.y - w.y) < 0.01);
      if (match >= 0) guides.push({ key: `${upper.id}-${i}`, from: `v:${lower.id}:${match}`, to: `v:${upper.id}:${i}` });
    });
  });
  const links: { from: string; to: string }[] = [];
  route?.nodes.forEach((node, i) => {
    const before = route.nodes[i - 1];
    if (before && before.level !== node.level) links.push({ from: `${before.level}:${before.id}`, to: `${node.level}:${node.id}` });
  });

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // Anchors live on stationary final-position wrappers; only the slab inside animates, so links never measure a mid-animation position.
  const routeKey = route?.nodes.map((node) => `${node.level}:${node.id}`).join("|") ?? "";
  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const origin = element.getBoundingClientRect();
    const next: Record<string, Point> = {};
    element.querySelectorAll<HTMLElement>("[data-anchor]").forEach((anchor) => {
      const r = anchor.getBoundingClientRect();
      next[anchor.dataset.anchor!] = { x: r.left + r.width / 2 - origin.left, y: r.top + r.height / 2 - origin.top };
    });
    setAnchors(next);
  }, [size.w, size.h, routeKey, levels]);

  const pct = (p: Point) => { const q = orient(p); return { left: `${q.x / drawingW * 100}%`, top: `${q.y / drawingH * 100}%` }; };

  return <div ref={stage} className="stack" data-compact={size.h < 260 || undefined} role="group" aria-label={`${building.title}, all levels stacked`}>
    {size.w > 0 && <div className="stack__scene" style={{ width: plateW, height: plateH, left: centerX }}>
      {ordered.map((level, index) => {
        const active = level.id === activeId;
        const legs = route?.legs.filter((leg) => leg.level === level.id) ?? [];
        const routeNodes = route?.nodes.filter((node) => node.level === level.id) ?? [];
        return <div key={level.id} className="stack__plate" data-active={active || undefined}
          style={{ transform: `translateZ(${z(index)}px)`, "--plate-z": `${z(index)}px`, "--slab-depth": `${thickness}px`, "--explode-delay": `${index * 40}ms` } as CSSProperties}
          role="button" tabIndex={0} aria-pressed={active} aria-label={`${level.name}, ${roomCount(level)} spaces${legs.length ? ", route on this level" : ""}`}
          onClick={() => onLevel(level.id)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onLevel(level.id); } }}>
          <div className="stack__slab">
            <svg className="stack__underside" viewBox={`0 0 ${drawingW} ${drawingH}`} preserveAspectRatio="none" aria-hidden="true">
              <g transform={drawingTransform}><path d={level.outline} /></g>
            </svg>
            {(level.outline.match(/M[^Z]+Z/gi) ?? []).flatMap((ring, ringIndex) => {
              const vertices = outlineVertices(ring).map(orient);
              return vertices.map((v, i) => {
                const next = vertices[(i + 1) % vertices.length];
                const dx = (next.x - v.x) / drawingW * plateW;
                const dy = (next.y - v.y) / drawingH * plateH;
                return <span key={`${ringIndex}-${i}`} className="stack__edge" aria-hidden="true" style={{ left: `${v.x / drawingW * 100}%`, top: `${v.y / drawingH * 100}%`, width: Math.hypot(dx, dy), transform: `rotateZ(${Math.atan2(dy, dx)}rad) rotateX(-90deg)` }} />;
              });
            })}
            <svg className="stack__top" viewBox={`0 0 ${drawingW} ${drawingH}`} preserveAspectRatio="none" aria-hidden="true">
              <g transform={drawingTransform}>
                <path d={level.outline} className="stack__floor" />
                {level.spaces.map((space) => {
                  const shape = space.shape;
                  const cls = `cims-room cims-room--${roomCategory(space.type)}${selected?.id === space.id ? " cims-room--selected" : ""}`;
                  const props = { className: cls, onClick: (event: MouseEvent) => { event.stopPropagation(); if (active) onSelect(space); else onLevel(level.id); } };
                  return shape.kind === "rect" ? <rect key={space.id} {...props} x={shape.x} y={shape.y} width={shape.w} height={shape.h}><title>{spaceDisplayName(space)}</title></rect>
                    : shape.kind === "circle" ? <circle key={space.id} {...props} cx={shape.cx} cy={shape.cy} r={shape.r}><title>{spaceDisplayName(space)}</title></circle>
                    : <polygon key={space.id} {...props} points={shape.points}><title>{spaceDisplayName(space)}</title></polygon>;
                })}
                <path d={planWalls(level)} className="stack__outline" />
                {legs.map((leg, i) => <polyline key={i} className="stack__route" points={leg.points.map((p) => p.join(",")).join(" ")} />)}
              </g>
            </svg>
          </div>
          <span className="stack__anchor" data-anchor={`label:${level.id}`} style={{ left: "50%", top: "50%" }} />
          {outlineVertices(level.outline).map((v, i) => <span key={`v-${i}`} className="stack__anchor" data-anchor={`v:${level.id}:${i}`} style={pct(v)} />)}
          {routeNodes.map((node) => <span key={node.id} className="stack__anchor" data-anchor={`${level.id}:${node.id}`} style={pct(node)} />)}
        </div>;
      })}
    </div>}
    {Object.keys(anchors).length > 0 && <>
      <svg className="stack__overlay stack__annotations" width={size.w} height={size.h} aria-hidden="true">
        {guides.map(({ key, from, to }) => anchors[from] && anchors[to]
          ? <line key={key} x1={anchors[from].x} y1={anchors[from].y} x2={anchors[to].x} y2={anchors[to].y} className="stack__guide" /> : null)}
        {links.map(({ from, to }) => anchors[from] && anchors[to] && <g key={`${from}-${to}`}>
          <line x1={anchors[from].x} y1={anchors[from].y} x2={anchors[to].x} y2={anchors[to].y} className="stack__link" />
          <circle cx={anchors[from].x} cy={anchors[from].y} r="4" className="stack__link-end" />
          <circle cx={anchors[to].x} cy={anchors[to].y} r="4" className="stack__link-end" />
        </g>)}
      </svg>
      {ordered.map((level) => anchors[`label:${level.id}`] && <div key={level.id} className="stack__label stack__annotations"
        data-active={level.id === activeId || undefined} style={{ left: labelX, top: anchors[`label:${level.id}`].y, width: labelW }}>
        <button type="button" className="stack__level" aria-pressed={level.id === activeId} aria-label={`${level.name}, ${roomCount(level)} spaces${level.id === activeId ? ", Open plan" : ""}`}
          onClick={() => level.id === activeId ? onOpenPlan() : onLevel(level.id)}>
          <span className="stack__label-heading"><span className="cims-caps">{level.name}</span></span>
          <small className="cims-mono">{roomCount(level)} spaces</small>
          {level.id === activeId && <span className="stack__open-plan">Open plan <span aria-hidden="true">↗</span></span>}
        </button>
      </div>)}
    </>}
  </div>;
}
