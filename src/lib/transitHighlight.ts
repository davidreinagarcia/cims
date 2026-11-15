/** @file Which bus routes the map should spotlight (the trip planner's results), as a tiny shared store the transport layer listens to. */

type Listener = (routeIds: ReadonlySet<number> | null) => void;
let current: ReadonlySet<number> | null = null;
const listeners = new Set<Listener>();

/** Spotlights these routes and dims the rest; null (or an empty list) shows every route normally. */
export function highlightRoutes(routeIds: Iterable<number> | null): void {
  const next = routeIds ? new Set(routeIds) : null;
  current = next && next.size ? next : null;
  for (const listener of listeners) listener(current);
}

/** Calls `listener` now and on every change; returns the unsubscribe function. */
export function onRouteHighlight(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}
