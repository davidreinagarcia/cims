/** @file From and To fields with swap, like a map app, and a Walk / Bus switch: walking opens Google Maps, bus lists the GT buses that get you there. */
import { useState } from "react";
import type { BuildingIndex } from "../../lib/buildings";
import type { CampusSearchResult } from "../../lib/search";
import { locate, remember } from "../../lib/suggest";
import BusList from "./BusList";
import BusOptions from "./BusOptions";
import PlaceField from "./PlaceField";

/** Replaces the search field while the user plans a trip from one place to another. */
export default function DirectionsBox({ buildings, initialTo, onClose }: { buildings: BuildingIndex | null; initialTo?: CampusSearchResult | null; onClose: () => void }) {
  const [from, setFrom] = useState<CampusSearchResult | null>(null);
  const [to, setTo] = useState<CampusSearchResult | null>(initialTo ?? null);
  const [mode, setMode] = useState<"walk" | "bus">("walk");
  const origin = from && locate(from, buildings);
  const destination = to && locate(to, buildings);
  const ready = !!destination && (!from || !!origin);
  const url = ready ? `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin[1]},${origin[0]}` : ""}&destination=${destination[1]},${destination[0]}&travelmode=walking` : undefined;
  return <section className="search directions" aria-label="Directions">
    <div className="directions__head"><strong className="cims-caps">Directions</strong>
      <button type="button" className="cims-btn" onClick={onClose}>Close</button></div>
    <div className="directions__fields">
      <div className="directions__pair">
        <PlaceField label="From" placeholder="Your location" buildings={buildings} picked={from} onPick={setFrom} />
        <PlaceField label="To" placeholder="Choose destination" buildings={buildings} picked={to} onPick={setTo} />
      </div>
      <button type="button" className="cims-btn directions__swap" aria-label="Swap start and destination" disabled={!from && !to}
        onClick={() => { setFrom(to); setTo(from); }}>⇅</button>
    </div>
    <div className="directions__modes" role="group" aria-label="How you're going">
      {(["walk", "bus"] as const).map((m) => <button key={m} type="button" className="cims-chip" aria-pressed={mode === m} onClick={() => setMode(m)}>
        {m === "walk" ? "Walk" : "Bus"}</button>)}
    </div>
    {mode === "bus" ? (destination && (!from || origin)
      ? <BusOptions key={`${from?.id ?? "gps"}>${to?.id}`} origin={origin ?? null} destination={destination} />
      : from && !origin ? <p className="cims-muted">That start has no map position yet.</p>
      : <BusList key={from?.id ?? "gps"} here={origin ?? null} />)
    : url ? <a className="cims-btn cims-btn--primary" href={url} target="_blank" rel="noopener noreferrer" onClick={() => { if (to) remember(to); }}>Walking directions</a>
      : <p className="cims-muted">{from && !origin ? "That start has no map position yet." : "Choose where you are going."}</p>}
    <p className="cims-muted directions__note">Leave From empty to start at your location.{mode === "walk" ? " Routes open in Google Maps." : ""}</p>
  </section>;
}
