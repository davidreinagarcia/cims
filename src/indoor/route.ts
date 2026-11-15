/** @file Dependency free shortest indoor paths and plan relative walking instructions. */
import type { IndoorConnector, IndoorGraph, IndoorNode } from "./types";

/** One accessible instruction and the level on which it happens. */
export interface Step { level: string; text: string }
/** A continuous portion of the route on one floor. */
export interface RouteLeg { level: string; points: [number, number][] }
/** A shortest path with drawing geometry and human readable instructions. */
export interface IndoorRoute { nodes: IndoorNode[]; legs: RouteLeg[]; steps: Step[]; connectorsUsed: IndoorConnector[] }
/** Routing preferences and optional endpoint names supplied by the directory. */
export interface RouteOptions { stepFree: boolean; fromLabel?: string; toLabel?: string }

function levelOrder(level: string): number {
  return level === "B" ? 0 : Number(level);
}

function levelName(level: string): string {
  return level === "B" ? "Basement" : `Level ${level}`;
}

/** Finds the least cost walk, filtering inaccessible connectors before searching. */
export function findRoute(graph: IndoorGraph, fromNodeId: string, toNodeId: string, options: RouteOptions): IndoorRoute | null {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  if (!byId.has(fromNodeId) || !byId.has(toNodeId)) return null;
  type Link = { to: string; cost: number; connector?: IndoorConnector };
  const links = new Map(graph.nodes.map((node) => [node.id, [] as Link[]]));
  const join = (a: string, b: string, cost: number, connector?: IndoorConnector) => {
    if (!byId.has(a) || !byId.has(b)) return;
    links.get(a)!.push({ to: b, cost, connector });
    links.get(b)!.push({ to: a, cost, connector });
  };
  for (const [a, b] of graph.edges) {
    const start = byId.get(a), end = byId.get(b);
    if (start && end && start.level === end.level) join(a, b, Math.hypot(end.x - start.x, end.y - start.y));
  }
  for (const connector of graph.connectors) {
    if (options.stepFree && !connector.stepFree) continue;
    const floors = Object.entries(connector.nodes).sort(([a], [b]) => levelOrder(a) - levelOrder(b));
    for (let i = 1; i < floors.length; i++) {
      join(floors[i - 1][1], floors[i][1], connector.kind === "elevator" ? 40 : 25 * Math.max(1, levelOrder(floors[i][0]) - levelOrder(floors[i - 1][0])), connector);
    }
  }
  const remaining = new Set(byId.keys());
  const distances = new Map<string, number>([[fromNodeId, 0]]);
  const previous = new Map<string, { id: string; connector?: IndoorConnector }>();
  while (remaining.size) {
    let nearest: string | undefined;
    let best = Infinity;
    for (const id of remaining) {
      const cost = distances.get(id) ?? Infinity;
      if (cost < best) { best = cost; nearest = id; }
    }
    if (!nearest) break;
    remaining.delete(nearest);
    if (nearest === toNodeId) break;
    for (const link of links.get(nearest)!) {
      const cost = best + link.cost;
      if (remaining.has(link.to) && cost < (distances.get(link.to) ?? Infinity)) {
        distances.set(link.to, cost);
        previous.set(link.to, { id: nearest, connector: link.connector });
      }
    }
  }
  if (!distances.has(toNodeId)) return null;
  const nodes = [byId.get(toNodeId)!];
  while (nodes[0].id !== fromNodeId) nodes.unshift(byId.get(previous.get(nodes[0].id)!.id)!);
  const legs: RouteLeg[] = [];
  const steps: Step[] = [{ level: nodes[0].level, text: `Start at ${options.fromLabel ?? nodes[0].label ?? "selected start"}` }];
  const connectorsUsed: IndoorConnector[] = [];
  let straightStep = -1;
  const connectorNodes = new Set(graph.connectors.flatMap((connector) => Object.values(connector.nodes)));
  const walkLabel = (node: IndoorNode) => (connectorNodes.has(node.id) ? undefined : node.label); // "Elevator" is not a corridor
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i], before = nodes[i - 1], after = nodes[i + 1];
    if (!before || before.level !== node.level) legs.push({ level: node.level, points: [] });
    legs[legs.length - 1].points.push([node.x, node.y]);
    if (before && before.level !== node.level) {
      const connector = previous.get(node.id)!.connector!;
      if (!connectorsUsed.some((item) => item.id === connector.id)) connectorsUsed.push(connector);
      const direction = levelOrder(node.level) > levelOrder(before.level) ? "up" : "down";
      const text = connector.kind === "elevator"
        ? `Take the elevator to ${levelName(node.level)} (${connector.name})`
        : `Take the stairs ${direction} to ${levelName(node.level)} (${connector.name})`;
      steps.push({ level: before.level, text });
      straightStep = -1;
    }
    if (!after || after.level !== node.level) continue;
    let turn = 0;
    if (before?.level === node.level) {
      const ax = node.x - before.x, ay = node.y - before.y;
      const bx = after.x - node.x, by = after.y - node.y;
      turn = Math.atan2(ax * by - ay * bx, ax * bx + ay * by) * 180 / Math.PI;
    }
    if (Math.abs(turn) >= 35) {
      steps.push({ level: node.level, text: `Turn ${turn > 0 ? "right" : "left"}${walkLabel(node) ? ` at ${walkLabel(node)}` : ""}` });
      straightStep = -1;
    } else if (straightStep < 0) {
      straightStep = steps.length;
      steps.push({ level: node.level, text: walkLabel(node) && i > 0 ? `Continue along the ${walkLabel(node)!.toLowerCase()}` : "Continue straight" });
    } else if (walkLabel(node)) {
      steps[straightStep].text = `Continue along the ${walkLabel(node)!.toLowerCase()}`;
    }
  }
  steps.push({ level: nodes[nodes.length - 1].level, text: `Arrive at ${options.toLabel ?? nodes[nodes.length - 1].label ?? "destination"}` });
  return { nodes, legs, steps, connectorsUsed };
}
