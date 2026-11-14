/** @file Read-only upcoming event bulletin with campus times and map selection. */
import { useEffect, useState } from "react";
import { formatWindow, nextWindow } from "../../lib/events";
import { places } from "../../lib/places";
import { useSelection } from "../../state/selection";
import "./bulletin.css";

/** Show upcoming events independently of layer filters and return to Explore on selection. */
export default function BulletinPanel({ onShowMap }: { onShowMap: () => void }) {
  const { select } = useSelection();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const events = places.features.flatMap((place) => {
    const window = place.properties.kind === "event" ? nextWindow(place.properties.event, now) : null;
    return window ? [{ place, window }] : [];
  }).sort((a, b) => a.window.start.getTime() - b.window.start.getTime());
  return (
    <section className="bulletin" aria-label="Upcoming events">
      <h2 className="cims-caps">Upcoming events</h2>
      {events.length === 0 ? <p className="cims-empty" role="status">No upcoming events</p> : (
        <ul>{events.map(({ place, window }) => {
          const p = place.properties;
          const venue = places.features.find((f) => f.properties.id === p.building_id);
          return (
            <li key={p.id}>
              <h3>{p.name}</h3>
              {p.status === "demo" && <span className="cims-tag cims-tag--alert" title="Fictional demo data, not a real event">DEMO</span>}
              <p>{formatWindow(window)}</p>
              {p.event?.organizer && <p>{p.event.organizer}</p>}
              {venue && <p>At {venue.properties.name}</p>}
              <button type="button" className="cims-btn" onClick={() => {
                select({ kind: "place", id: p.id });
                onShowMap();
              }}>Show on map</button>
            </li>
          );
        })}</ul>
      )}
    </section>
  );
}
