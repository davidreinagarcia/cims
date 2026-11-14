/** @file Card for the selected building footprint: name, nicknames, an honest height note, the places inside it, directions and a correction link. */
import { useEffect, useState } from "react";
import { CORRECTION_URL } from "../../config";
import { loadBuildings, loadedBuildings, type BuildingIndex } from "../../lib/buildings";
import { places } from "../../lib/places";
import { useSelection } from "../../state/selection";
import "./building-card.css";

const unknown = <span className="cims-muted">Unknown</span>;

/** Shows the selected building (kind "building"), or nothing when something else is selected. */
export default function BuildingCard() {
  const { selection, select } = useSelection();
  const [index, setIndex] = useState<BuildingIndex | null>(loadedBuildings);
  const [failed, setFailed] = useState(false);
  const wanted = selection?.kind === "building";

  useEffect(() => {
    if (!wanted || index) return;
    let alive = true;
    loadBuildings()
      .then((loaded) => alive && setIndex(loaded))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [wanted, index]);

  if (!wanted) return null;
  const b = index?.byId.get(selection.id);
  if (!b) {
    return (
      <section className="detail" aria-label="Building details" aria-busy={!failed}>
        <p role="status">{failed ? "Building details could not be loaded. Check your connection." : "Loading building..."}</p>
        <div className="cims-actions"><button type="button" className="cims-btn" onClick={() => select(null)}>Close</button></div>
      </section>
    );
  }

  const inside = places.features.filter((f) => index!.at(f.geometry.coordinates[0], f.geometry.coordinates[1])?.id === b.id);
  const [lng, lat] = b.center;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const name = b.name ?? "Unnamed building";
  const height =
    b.heightSource === "osm:height" ? `${b.height} m (OpenStreetMap height)`
    : b.heightSource === "osm:levels" ? `About ${b.height} m (from ${b.levels ?? "?"} levels)`
    : null;
  const missing = [!b.name && "Name", !b.aliases.length && "Nickname", !b.address && "Address", !height && "Height", "Photo", "Hours", "BuzzCard access"].filter(Boolean);
  const correction = new URL(CORRECTION_URL);
  correction.searchParams.set("title", `Correction: ${name} (${b.id})`);
  correction.searchParams.set("body", `Building ID: ${b.id}\n\nFields shown as Unknown:\n${missing.map((field) => `* ${field}`).join("\n")}\n\nSuggested correction:\n\nSource URL:\n`);

  return (
    <section className="detail" aria-label="Building details">
      <h2 className="cims-card__name">{name}</h2>
      <p className="cims-card__alias">{b.aliases.length ? b.aliases.join(", ") : unknown}</p>
      <p className="detail__tags">
        <span className="cims-tag">Building</span>
        <span className="cims-tag cims-tag--alert" title="Outline from OpenStreetMap, not yet checked by a person">Unverified</span>
      </p>
      <table className="cims-infotable" aria-label="Building information">
        <tbody>
          <tr><th scope="row">Address</th><td>{b.address || unknown}</td></tr>
          <tr><th scope="row">Height</th><td>{height ?? <>{unknown} <span className="cims-muted">(drawn at an estimated {b.height} m)</span></>}</td></tr>
          <tr><th scope="row">Hours</th><td>{unknown}</td></tr>
          <tr><th scope="row">BuzzCard</th><td>{unknown}</td></tr>
          <tr><th scope="row">Source</th><td>
            {b.osmId ? <a href={`https://www.openstreetmap.org/${b.osmId}`} target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> : unknown}
          </td></tr>
        </tbody>
      </table>
      <p><a href={correction.toString()} target="_blank" rel="noopener noreferrer">Suggest a correction</a></p>
      {inside.length > 0 && (
        <div className="detail__inside">
          <h3 className="cims-caps">Inside ({inside.length})</h3>
          <ul>{inside.map((item) => (
            <li key={item.properties.id}><button type="button" onClick={() => select({ kind: "place", id: item.properties.id })}>{item.properties.name}</button></li>
          ))}</ul>
        </div>
      )}
      <div className="cims-actions">
        <a className="cims-btn cims-btn--primary" href={directions} target="_blank" rel="noopener noreferrer">Directions</a>
        <button type="button" className="cims-btn" onClick={() => select(null)}>Close</button>
      </div>
    </section>
  );
}
