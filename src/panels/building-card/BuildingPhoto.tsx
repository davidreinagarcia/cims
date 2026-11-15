/** @file Building photo banner with its required credit line (author, license, link to the Commons source). */
import { buildingPhoto } from "../../lib/buildingPhotos";

/** Renders the sourced photo for a building, or nothing when there is none. */
export default function BuildingPhotoFigure({ buildingId }: { buildingId: string }) {
  const photo = buildingPhoto(buildingId);
  if (!photo) return null;
  return (
    <figure className="detail__photo">
      <img src={photo.image} alt={photo.alt} loading="lazy" decoding="async" />
      <figcaption className="cims-muted">
        Photo: <a href={photo.source_url} target="_blank" rel="noopener noreferrer">{photo.credit}</a>
        {", "}{photo.license_url ? <a href={photo.license_url} target="_blank" rel="noopener noreferrer license">{photo.license}</a> : photo.license}, via Wikimedia Commons
      </figcaption>
    </figure>
  );
}
