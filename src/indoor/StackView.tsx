/** @file Exploded "stack" view (concept B): every drawn level as a plate in one CSS 3D scene, with the route and its vertical links. */
import { useLayoutEffect, useRef, useState } from "react";
import { drawnBounds, levelRank, roomCategory } from "../lib/indoorPlan";
import type { IndoorRoute } from "./route";
import type { IndoorBuilding, IndoorLevel, IndoorSpace } from "./types";
import "./StackView.css";

type DrawnLevel = Extract<IndoorLevel, { available: true }>;
type Point = { x: number; y: number };

/** Shows the Plan | Stack toggle in the building header. Set to false to hide the stack view for a demo. */
export const STACK_VIEW_ENABLED = true;

/** Every available level as a plate in one CSS 3D scene; click a plate to make it the active level. */
export default function StackView({ building, levels, activeId, selected, route, onLevel, roomCount }: {
  building: IndoorBuilding; levels: DrawnLevel[]; activeId?: string; selected?: IndoorSpace; route?: IndoorRoute;
  activeStep: number | null; onLevel: (id: string) => void; roomCount: (level: IndoorLevel) => number;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [anchors, setAnchors] = useState<Record<string, Point>>({});
  const ordered = [...levels].sort((a, b) => levelRank(a.id) - levelRank(b.id)); // bottom plate first
  const frame = drawnBounds(levels) ?? { x: 0, y: 0, w: 100, h: 100 };
  const pad = Math.max(frame.w, frame.h) * 0.04;
  const box = { x: frame.x - pad, y: frame.y - pad, w: frame.w + pad * 2, h: frame.h + pad * 2 };
  // Plate size and spacing from the stage: wide buildings get wide plates, tall ones narrower.
  const n = ordered.length;
  const plateW = Math.max(120, Math.min(size.w * 0.52, size.w - 170, (size.h * 0.95) * box.w / box.h / Math.max(1, 0.35 * n), 620));
  const plateH = plateW * box.h / box.w;
  const gap = Math.min(150, Math.max(50, (size.h * 0.62) / Math.max(1, n - 1)), plateH * 0.9);
  const z = (index: number) => (index - (n - 1) / 2) * gap;

  // Where the route changes level: the node it leaves and the node it reaches, from the graph.
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
  // Labels and vertical links are flat: read where the 3D anchors land on screen after layout.
  const routeKey = route?.nodes.map((node) => node.id).join("|") ?? "";
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

  // Labels sit in one column just right of the whole stack, each at its plate's height.
  const cornerXs = Object.entries(anchors).filter(([key]) => key.startsWith("corner:")).map(([, p]) => p.x);
  const labelX = Math.min(Math.max(0, size.w - 130), (cornerXs.length ? Math.max(...cornerXs) : size.w / 2) + 20);
  const pct = (p: Point) => ({ left: `${((p.x - box.x) / box.w) * 100}%`, top: `${((p.y - box.y) / box.h) * 100}%` });

  return <div ref={stage} className="stack" role="group" aria-label={`${building.title}, all levels stacked`}>
    <div className="stack__scene" style={{ width: plateW, height: plateH }}>
      {ordered.map((level, index) => {
        const active = level.id === activeId;
        const legs = route?.legs.filter((leg) => leg.level === level.id) ?? [];
        const routeNodes = route?.nodes.filter((node) => node.level === level.id) ?? [];
        return <div key={level.id} className="stack__plate" data-active={active || undefined} style={{ transform: `translateZ(${z(index)}px)` }}
          role="button" tabIndex={0} aria-pressed={active} aria-label={`${level.name}, ${roomCount(level)} spaces${legs.length ? ", route on this level" : ""}`}
          onClick={() => onLevel(level.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onLevel(level.id); } }}>
          <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} preserveAspectRatio="none" aria-hidden="true">
            <path d={level.outline} className="stack__floor" />
            {level.spaces.map((space) => {
              const shape = space.shape;
              const cls = `cims-room cims-room--${roomCategory(space.type)}${selected?.id === space.id ? " cims-room--selected" : ""}`;
              return shape.kind === "rect" ? <rect key={space.id} className={cls} x={shape.x} y={shape.y} width={shape.w} height={shape.h} />
                : shape.kind === "circle" ? <circle key={space.id} className={cls} cx={shape.cx} cy={shape.cy} r={shape.r} />
                : <polygon key={space.id} className={cls} points={shape.points} />;
            })}
            <path d={level.outline} className="stack__outline" />
            {legs.map((leg, i) => <polyline key={i} className="stack__route" points={leg.points.map((p) => p.join(",")).join(" ")} />)}
          </svg>
          {/* anchors: right edge for the level label, and every route node for the vertical links */}
          <span className="stack__anchor" data-anchor={`label:${level.id}`} style={{ left: "50%", top: "50%" }} />
          {[[0, 0], [100, 0], [100, 100], [0, 100]].map(([left, top]) => <span key={`${left}-${top}`} className="stack__anchor" data-anchor={`corner:${level.id}:${left}-${top}`} style={{ left: `${left}%`, top: `${top}%` }} />)}
          {routeNodes.map((node) => <span key={node.id} className="stack__anchor" data-anchor={`${level.id}:${node.id}`} style={pct(node)} />)}
        </div>;
      })}
    </div>
    <svg className="stack__overlay" width={size.w} height={size.h} aria-hidden="true">
      {links.map(({ from, to }) => anchors[from] && anchors[to] && <g key={`${from}-${to}`}>
        <line x1={anchors[from].x} y1={anchors[from].y} x2={anchors[to].x} y2={anchors[to].y} className="stack__link" />
        <circle cx={anchors[from].x} cy={anchors[from].y} r="4" className="stack__link-end" />
        <circle cx={anchors[to].x} cy={anchors[to].y} r="4" className="stack__link-end" />
      </g>)}
    </svg>
    {ordered.map((level) => anchors[`label:${level.id}`] && <button key={level.id} type="button" tabIndex={-1} className="stack__label"
      data-active={level.id === activeId || undefined} style={{ left: labelX, top: anchors[`label:${level.id}`].y }}
      onClick={() => onLevel(level.id)}>
      <span className="cims-caps">{level.name}</span><small className="cims-mono">{roomCount(level)} spaces</small>
    </button>)}
  </div>;
}
