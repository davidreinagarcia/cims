/** @file Detail card for the selected place. Becomes the building card in T-11. */
import { places } from "../../lib/places";
import { useSelection } from "../../state/selection";
import "./building-card.css";

/** Shows name, category and description of the selected place, with a Close button. Renders nothing if no place is selected. */
export default function PlaceCard() {
  const { selection, select } = useSelection();
  const place = selection?.kind === "place" ? places.features.find((f) => f.properties.id === selection.id) : undefined;
  if (!place) return null;
  return (
    <div className="detail">
      <h2>{place.properties.name}</h2>
      <span className="tag">{place.properties.category}</span>
      <p>{place.properties.description}</p>
      <button onClick={() => select(null)}>Close</button>
    </div>
  );
}
