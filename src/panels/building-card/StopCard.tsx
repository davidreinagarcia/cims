/** @file Small selected bus stop card using the existing detail card styles and selection. */
import { TRACKER_URL } from "../../config";
import { transitStops } from "../../lib/transit";
import { useSelection } from "../../state/selection";
import "../../map/transport.css";

/** Show the selected stop and its sourced routes without guessing arrivals from bus positions. */
export default function StopCard() {
  const { selection } = useSelection();
  const stop = selection?.kind === "stop" ? transitStops.find((feature) => feature.properties.id === selection.id) : undefined;
  if (!stop) return null;
  return (
    <section className="detail transit-stop-card" aria-label="Bus stop details">
      <h2 className="cims-card__name">{stop.properties.name}</h2>
      <p className="detail__tags"><span className="cims-tag">Bus stop</span></p>
      <p><strong>Routes:</strong> {stop.properties.routes}</p>
      <p className="cims-muted">Arrival predictions are not provided by the vehicle feed.</p>
      <a className="cims-btn" href={TRACKER_URL} target="_blank" rel="noopener noreferrer">Check official live arrivals</a>
    </section>
  );
}
