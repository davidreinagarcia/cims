/** @file React hooks for the bus panels: the transit network (loaded once) and live buses polled while the panel is open. */
import { useEffect, useState } from "react";
import type { LiveBus } from "./busPlanner";
import { loadTransitNetwork, type TransitNetwork } from "./transitNetwork";
import { fetchBuses } from "../map/transitLive";

const POLL_MS = 10_000;

/** The network once loaded; `failed` when the download failed. */
export function useTransitNetwork(): { network: TransitNetwork | null; failed: boolean } {
  const [state, setState] = useState<{ network: TransitNetwork | null; failed: boolean }>({ network: null, failed: false });
  useEffect(() => {
    let alive = true;
    loadTransitNetwork().then((network) => { if (alive) setState({ network, failed: false }); }, () => { if (alive) setState({ network: null, failed: true }); });
    return () => { alive = false; };
  }, []);
  return state;
}

/** Live buses every 10 s while mounted and the tab is visible. `updatedAt` is null until the first good answer; `failed` after a bad one (buses are dropped, never frozen). */
export function useLiveBuses(network: TransitNetwork | null): { buses: LiveBus[]; updatedAt: number | null; failed: boolean } {
  const [state, setState] = useState<{ buses: LiveBus[]; updatedAt: number | null; failed: boolean }>({ buses: [], updatedAt: null, failed: false });
  useEffect(() => {
    if (!network) return;
    const names = new Map(network.routes.map((r) => [r.id, r.name]));
    let alive = true;
    let inFlight: AbortController | null = null;
    const poll = async () => {
      if (document.hidden || inFlight) return;
      const request = (inFlight = new AbortController());
      const deadline = window.setTimeout(() => request.abort(), 15_000);
      try {
        const buses = (await fetchBuses(names, request.signal)).map((b) => ({ id: b.properties.id, routeId: b.properties.route_id, at: b.geometry.coordinates as [number, number] }));
        if (alive) setState({ buses, updatedAt: Date.now(), failed: false });
      } catch {
        if (alive) setState({ buses: [], updatedAt: null, failed: true });
      } finally {
        window.clearTimeout(deadline);
        inFlight = null;
      }
    };
    void poll();
    const timer = window.setInterval(poll, POLL_MS);
    const onVisibility = () => { if (!document.hidden) void poll(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { alive = false; window.clearInterval(timer); inFlight?.abort(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [network]);
  return state;
}
