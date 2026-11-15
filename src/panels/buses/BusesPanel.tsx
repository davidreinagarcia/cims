/** @file Buses panel (T-42): where you're going, and where you are (your location, or a From place when location fails or is slow). Empty destination lists every GT route and the Stingerette; with one, only the buses that take you there. */
import { useCallback, useEffect, useRef, useState } from "react";
import { loadBuildings, loadedBuildings, type BuildingIndex } from "../../lib/buildings";
import { GeolocationError, getCurrentPosition } from "../../lib/geolocation";
import type { CampusSearchResult } from "../../lib/search";
import { locate, remember } from "../../lib/suggest";
import PlaceField from "../search/PlaceField";
import BusList from "./BusList";
import BusOptions from "./BusOptions";
import "./buses.css";

/** How long we wait for the device's position before offering the From field. The browser's own timeout only starts
 *  once the permission prompt is answered, so an ignored prompt would otherwise spin forever. */
const LOCATION_WAIT_MS = 8_000;

type Located = { status: "locating" } | { status: "ok"; at: [number, number] } | { status: "failed"; message: string };

/** The device's position for picking a bus stop: normal accuracy (fast; a stop is ~100 m apart), a recent fix is fine. */
function useQuickLocation(): [Located, () => void] {
  const [state, setState] = useState<Located>({ status: "locating" });
  const attempt = useRef(0);
  const request = useCallback(() => {
    const id = ++attempt.current;
    setState({ status: "locating" });
    const slow = window.setTimeout(() => {
      if (attempt.current === id) setState((s) => (s.status === "locating" ? { status: "failed", message: "Finding your location is taking too long." } : s));
    }, LOCATION_WAIT_MS);
    getCurrentPosition({ enableHighAccuracy: false, timeout: 15_000, maximumAge: 120_000 }).then(
      // A late fix still counts: it replaces the "too long" state if the user hasn't typed a From yet.
      (fix) => { if (attempt.current === id) setState({ status: "ok", at: [fix.lng, fix.lat] }); },
      (err) => { if (attempt.current === id) setState({ status: "failed", message: err instanceof GeolocationError && err.reason === "denied" ? "Location is off for this site." : "Your location couldn't be found." }); },
    ).finally(() => window.clearTimeout(slow));
  }, []);
  useEffect(() => { request(); return () => { attempt.current++; }; }, [request]);
  return [state, request];
}

/** The panel body shown in the floating card (desktop) or bottom sheet (phone). */
export default function BusesPanel() {
  const [buildings, setBuildings] = useState<BuildingIndex | null>(loadedBuildings);
  const [to, setTo] = useState<CampusSearchResult | null>(null);
  const [from, setFrom] = useState<CampusSearchResult | null>(null);
  const [editFrom, setEditFrom] = useState(false);
  const [gps, retry] = useQuickLocation();
  useEffect(() => {
    let alive = true;
    void loadBuildings().then((index) => { if (alive) setBuildings(index); }).catch(() => { /* places still search */ });
    return () => { alive = false; };
  }, []);

  // Once the From field has shown, keep it: a late location fix must not yank the field away mid-typing.
  useEffect(() => { if (gps.status === "failed") setEditFrom(true); }, [gps.status]);

  const fromAt = from ? locate(from, buildings) ?? null : null;
  const here: [number, number] | null = from ? fromAt : gps.status === "ok" ? gps.at : null;
  const destination = to ? locate(to, buildings) : undefined;
  // The From field shows when location failed or is slow, when the user chose to change it, or once a place is picked.
  const showFrom = !!from || editFrom || gps.status === "failed";

  return <section className="buses" aria-label="Buses">
    {showFrom ? <div className="buses__from">
      <div className="buses__dest">
        <PlaceField label="Where are you now?" placeholder="Search a building or place" buildings={buildings} picked={from} onPick={setFrom} />
        {(from || editFrom) && gps.status !== "failed" && <button type="button" className="cims-btn" onClick={() => { setFrom(null); setEditFrom(false); }}>Use my location</button>}
      </div>
      {!from && gps.status === "failed" && <p className="buses__hint">{gps.message} Type where you are to see bus times.{" "}
        <button type="button" className="buses__link" onClick={retry}>Try my location again</button></p>}
      {from && !fromAt && <p className="buses__hint">That place has no map position yet. Try a nearby building.</p>}
    </div> : <p className="buses__origin">
      <span className="cims-caps">From</span>{" "}
      {gps.status === "locating" ? <span className="cims-muted">Finding your location...</span> : <strong>Your location</strong>}
      <button type="button" className="buses__link" onClick={() => setEditFrom(true)}>{gps.status === "locating" ? "Type it instead" : "Change"}</button>
    </p>}
    <div className="buses__dest">
      <PlaceField label="Where are you going?" placeholder="Search a building or place" buildings={buildings} picked={to}
        onPick={(result) => { setTo(result); if (result) remember(result); }} />
      {to && <button type="button" className="cims-btn" onClick={() => setTo(null)}>Clear</button>}
    </div>
    {to && !destination ? <p className="cims-muted">That place has no map position yet.</p>
      : destination ? (here
        ? <BusOptions key={`${to!.id}`} origin={here} destination={destination} />
        : <p className="cims-muted" role="status">{gps.status === "locating" && !from ? "Finding your location..." : "Tell us where you are (above) to see which buses take you there."}</p>)
      : <BusList here={here} />}
  </section>;
}
