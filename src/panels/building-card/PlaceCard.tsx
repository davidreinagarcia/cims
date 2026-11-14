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
    <section className="detail">
      <h2 className="cims-card__name">{place.properties.name}</h2>
      <p className="cims-card__alias">
        <span className="cims-tag">{place.properties.category}</span>
      </p>
      <p>{place.properties.description}</p>
      <button className="cims-btn cims-btn--small" onClick={() => select(null)}>
        Close
      </button>
    </section>
  );
}
