/** @file React hook around the one-shot GPS fix: request on demand (or on mount), with idle / locating / ok / error state and a ready-to-show message. */
import { useCallback, useEffect, useRef, useState } from "react";
import { GeolocationError, getCurrentPosition, type Coordinates } from "./geolocation";

/** State of the GPS request. */
export interface GpsState {
  status: "idle" | "locating" | "ok" | "error";
  fix: Coordinates | null;
  message: string | null;
  /** Asks the browser for the position (shows the permission prompt the first time). */
  request: () => void;
}

/** GPS fix for forms. Pass `auto` to ask as soon as the form opens. Fresh, high accuracy: these reports depend on the exact spot. */
export function useGpsFix(auto = false): GpsState {
  const [state, setState] = useState<Omit<GpsState, "request">>({ status: "idle", fix: null, message: null });
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const request = useCallback(() => {
    setState((s) => ({ ...s, status: "locating", message: null }));
    getCurrentPosition({ enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 }).then(
      (fix) => alive.current && setState({ status: "ok", fix, message: null }),
      (err) => alive.current && setState({ status: "error", fix: null, message: err instanceof GeolocationError ? err.message : "Your location couldn't be determined." }),
    );
  }, []);
  useEffect(() => { if (auto) request(); }, [auto, request]);
  return { ...state, request };
}
