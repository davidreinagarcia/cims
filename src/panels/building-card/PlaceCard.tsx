/** @file Selected place card with hours, access, provenance, contained places and map directions. */
import { useEffect, useState, type CSSProperties } from "react";
import { CORRECTION_URL } from "../../config";
import InsidePlaces from "./InsidePlaces";
import { locationDetails } from "../../lib/buildingPlaces";
import BuildingLink from "./BuildingLink";
import { formatWindow, nextWindow } from "../../lib/events";
import { campusDay, openStatus } from "../../lib/hours";
import { LAYER_CATALOG } from "../../lib/layerCatalog";
import { places } from "../../lib/places";
import { useAuth } from "../../state/auth";
import { useSelection } from "../../state/selection";
import "./building-card.css";

const unknown = <span className="cims-muted">Unknown</span>;

/** Shows the selected place's known details and correction link, or nothing without a place selection. */
export default function PlaceCard() {
  const { selection, select } = useSelection();
  const { session, requireAuth } = useAuth();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [selection?.id]);
  const place = selection?.kind === "place" ? places.features.find((f) => f.properties.id === selection.id) : undefined;
  if (!place) return null;
  const p = place.properties;
  const eventWindow = p.kind === "event" ? nextWindow(p.event, now) : null;
  if (p.kind === "event" && !eventWindow) return null;
  const status = openStatus(p.hours, now);
  const today = p.hours?.[campusDay(now)];
  const isEvent = p.kind === "event";
  const category = LAYER_CATALOG.find((layer) => layer.id === p.category);
  const missing = [
    !p.aliases?.length && "Nickname",
    "Photo",
    !p.address && "Address",
    !isEvent && !today && "Today's hours", // opening hours and BuzzCard access do not apply to events
    !isEvent && !p.buzzcard && "BuzzCard required",
    !isEvent && p.buzzcard?.required && !p.buzzcard.note && "BuzzCard note", // a note only matters when access is required
    !p.url && "Website",
    !p.source_url && "Source URL",
    p.status === "verified" && !p.verified_by && "Verified by",
    p.status === "verified" && !p.verified_at && "Verified date",
  ].filter(Boolean);
  const correction = new URL(CORRECTION_URL);
  correction.searchParams.set("title", `Correction: ${p.name} (${p.id})`);
  correction.searchParams.set("body", `Place ID: ${p.id}\n\nFields shown as Unknown:\n${missing.map((field) => `* ${field}`).join("\n")}\n\nSuggested correction:\n\nSource URL:\n`);
  const [lng, lat] = place.geometry.coordinates;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  // T-23: opens the report flow (Shell's "report" panel) prefilled with this place.
  function handleReportIssue() {
    requireAuth(() => select({ kind: "report", id: p.id }));
  }

  return (
    <section className="detail" aria-label="Place details" style={{ "--cat": `var(${category?.cssVar ?? "--cat-support"})` } as CSSProperties}>
      <h2 className="cims-card__name">{p.name}</h2>
      <p className="cims-card__alias">{p.aliases?.length ? p.aliases.join(", ") : unknown}</p>
      <p className="detail__tags">
        <span className="cims-tag">{category?.label ?? p.category}</span>
        {p.kind === "event" && <span className="cims-tag">Event</span>}
        {p.kind === "org" && <>
          <span className="cims-tag">Organization</span>
          {p.subtype && <span className="cims-tag">{category?.subtypes.find((sub) => sub.id === p.subtype)?.label ?? p.subtype}</span>}
        </>}
        {p.status === "demo" && <span className="cims-tag cims-tag--alert">
          {p.kind === "event" ? "Demo event, not a real event" : "Demo organization, not a real organization"}
        </span>}
        {p.status !== "verified" && p.status !== "demo" && (
          <span className="cims-tag cims-tag--alert" title="Not yet checked against an official source">
            {p.status === "draft" ? "Unverified draft" : "Approximate"}
          </span>
        )}
      </p>
      <div className="cims-card__photo" role="img" aria-label="Photo unknown"><span className="cims-muted">Unknown</span></div>
      {p.kind !== "event" && status.state !== "unknown" && (
        <p><span className={`cims-status${status.state === "closed" ? " cims-status--closed" : ""}`}>{status.label}</span></p>
      )}
      {eventWindow && <p><strong>{formatWindow(eventWindow)}</strong></p>}
      {p.kind === "event" && <p>Organizer: {p.event?.organizer || unknown}</p>}
      {p.description && <p>{p.description}</p>}
      <table className="cims-infotable" aria-label="Place information">
        <tbody>
          <tr><th scope="row">Address</th><td>{p.address || unknown}</td></tr>
          <BuildingLink coordinates={place.geometry.coordinates} buildingId={p.building_id} attached={locationDetails(place).coord_precision === "building"} floorOrRoom={locationDetails(place).floor_or_room} />
          {!isEvent && <tr><th scope="row">Today's hours</th><td>{today ? today.length ? today.map(([start, end]) => `${start} to ${end}`).join(", ") : "Closed" : unknown}</td></tr>}
          {!isEvent && <tr><th scope="row">BuzzCard</th><td>{p.buzzcard ? p.buzzcard.required ? "Required: Yes" : "Required: No" : unknown}{(p.buzzcard?.required || p.buzzcard?.note) && <><br />Note: {p.buzzcard?.note || unknown}</>}</td></tr>}
          <tr><th scope="row">Website</th><td>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer">{p.url}</a> : unknown}</td></tr>
          <tr><th scope="row">Source</th><td>
            {p.status === "verified" ? <>Verified by {p.verified_by || unknown} on {p.verified_at || unknown}</> : "Unverified"}
            <br />{p.source_url ? <a href={p.source_url} target="_blank" rel="noopener noreferrer">Source</a> : unknown}
          </td></tr>
        </tbody>
      </table>
      <p><a href={correction.toString()} target="_blank" rel="noopener noreferrer">Suggest a correction</a></p>
      {locationDetails(place).coord_precision !== "building" && <InsidePlaces buildingId={p.id} excludeId={p.id} />}
      <div className="detail__report">
        <button type="button" className="cims-btn" onClick={handleReportIssue}>Report an issue</button>
        {!session && <small className="cims-muted">Requires sign-in</small>}
      </div>
      <div className="cims-actions">
        <a className="cims-btn cims-btn--primary" href={directions} target="_blank" rel="noopener noreferrer">Directions</a>
        <button type="button" className="cims-btn" onClick={() => select(null)}>Close</button>
      </div>
    </section>
  );
}
