/** @file Crisp SVG schematic with keyboard space selection, pointer pan and bounded pointer-centered zoom. */
import { useEffect, useRef, useState } from "react";
import type { IndoorLevel, IndoorShape, IndoorSpace } from "./types";
import "./FloorPlan.css";

type DrawnLevel = Extract<IndoorLevel, { available: true }>;
type Camera = { x: number; y: number; zoom: number };

function bounds(shape: IndoorShape) {
  if (shape.kind === "rect") return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  if (shape.kind === "circle") return { x: shape.cx - shape.r, y: shape.cy - shape.r, w: shape.r * 2, h: shape.r * 2 };
  const points = shape.points.trim().split(/\s+/).map((point) => point.split(",").map(Number));
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function zoomAt(camera: Camera, factor: number, point: { x: number; y: number } = camera): Camera {
  const zoom = Math.max(0.6, Math.min(6, camera.zoom * factor));
  return { x: point.x + (camera.x - point.x) * camera.zoom / zoom,
    y: point.y + (camera.y - point.y) * camera.zoom / zoom, zoom };
}

function SpaceLabel({ space }: { space: IndoorSpace }) {
  const b = bounds(space.shape);
  // Conservatively fit the whole label; tiny spaces remain available in the directory.
  const words = space.name.toUpperCase().split(" ");
  const size = Math.min(13, (b.w - 14) / (Math.max(...words.map((word) => word.length)) * 0.65), (b.h - 12) / (words.length * 1.25));
  if (size < 8 || space.shape.kind === "circle") return null;
  return <text className="floor-plan__label" x={b.x + b.w / 2} y={b.y + b.h / 2 - (words.length - 1) * size * 0.625} fontSize={size} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
    {words.map((word, i) => <tspan key={i} x={b.x + b.w / 2} dy={i ? size * 1.25 : 0}>{word}</tspan>)}
  </text>;
}

/** Renders one available level with controls and brings the selected space into view. */
export default function FloorPlan({ level, selected, onSelect }: { level: DrawnLevel; selected?: IndoorSpace; onSelect: (space: IndoorSpace) => void }) {
  const [vx, vy, width, height] = level.viewBox;
  const initial = { x: vx + width / 2, y: vy + height / 2, zoom: 1 };
  const [camera, setCamera] = useState<Camera>(initial);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; camera: Camera; scale: number; moved: boolean }>();
  const dragged = useRef(false);

  useEffect(() => {
    if (!selected) return;
    const b = bounds(selected.shape);
    setCamera({ x: b.x + b.w / 2, y: b.y + b.h / 2, zoom: Math.max(0.6, Math.min(4, width / (b.w * 2), height / (b.h * 2))) });
  }, [selected, width, height]);

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      const matrix = element.getScreenCTM();
      if (!matrix) return;
      event.preventDefault();
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      setCamera((current) => zoomAt(current, Math.exp(-Math.max(-200, Math.min(200, event.deltaY)) * 0.003), point));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);

  return <div className="floor-plan">
    <div className="floor-plan__toolbar" role="toolbar" aria-label="Plan view controls">
      <div className="floor-plan__mode" role="group" aria-label="View mode">
        <button className="cims-btn" type="button" aria-pressed="true">2D</button>
        <button className="cims-btn" type="button" disabled title="Expanded 3D view is coming soon">3D soon</button>
      </div>
      <div className="floor-plan__zoom" role="group" aria-label="Plan zoom">
        <button className="cims-btn" type="button" aria-label="Zoom in" disabled={camera.zoom >= 6} onClick={() => setCamera((current) => zoomAt(current, 1.3))}>+</button>
        <button className="cims-btn" type="button" aria-label="Zoom out" disabled={camera.zoom <= 0.6} onClick={() => setCamera((current) => zoomAt(current, 1 / 1.3))}>−</button>
        <button className="cims-btn" type="button" onClick={() => setCamera(initial)}>Reset</button>
      </div>
    </div>
    <div className="floor-plan__canvas">
      <svg ref={svg} viewBox={`${camera.x - width / camera.zoom / 2} ${camera.y - height / camera.zoom / 2} ${width / camera.zoom} ${height / camera.zoom}`}
        aria-label={`${level.name} schematic floor plan`} role="group"
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
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
        {level.spaces.map((space) => {
          const shape = space.shape;
          const category = space.type === "auditorium" ? "classroom" : space.type === "core" ? "restroom" : space.type;
          const props = {
            className: `cims-room cims-room--${category}${selected?.id === space.id ? " cims-room--selected" : ""}`,
            tabIndex: 0, role: "button", "aria-label": `${space.name}, ${space.type}`, "aria-pressed": selected?.id === space.id,
            onClick: () => { if (!dragged.current) onSelect(space); },
            onKeyDown: (event: React.KeyboardEvent<SVGElement>) => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(space); }
            },
          };
          return <g key={space.id}>
            {shape.kind === "rect" ? <rect {...props} x={shape.x} y={shape.y} width={shape.w} height={shape.h} />
              : shape.kind === "circle" ? <circle {...props} cx={shape.cx} cy={shape.cy} r={shape.r} />
              : <polygon {...props} points={shape.points} />}
            <SpaceLabel space={space} />
          </g>;
        })}
        <path d={level.outline} className="floor-plan__outline" />
      </svg>
      <span className="floor-plan__annotation cims-mono">SCHEMATIC, NOT TO SCALE</span>
    </div>
  </div>;
}
