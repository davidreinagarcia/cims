/** @file Route panel of the shell: From and To fields with suggestions and swap (walking directions open in Google Maps for now). */
import { useEffect, useState } from "react";
import { loadBuildings, loadedBuildings, type BuildingIndex } from "../lib/buildings";
import { places } from "../lib/places";
import { searchCampus } from "../lib/search";
import DirectionsBox from "../panels/search/DirectionsBox";
import type { Selection } from "../state/selection";

/** Loads the building index and hosts the directions fields inside the floating card or sheet. */
export default function RoutePanel({ initialSelection, onClose }: { initialSelection?: Selection | null; onClose: () => void }) {
  const [buildings, setBuildings] = useState<BuildingIndex | null>(loadedBuildings);
  const [loading, setLoading] = useState(!buildings);
  useEffect(() => {
    let alive = true;
    void loadBuildings().then((index) => { if (alive) setBuildings(index); })
      .catch(() => { /* fields still search places */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  // Resolve the selection from the same catalog as search; wait before mounting the uncontrolled directions fields.
  if (loading && initialSelection && initialSelection.kind !== "place") return <p role="status">Loading destination...</p>;
  const initialTo = initialSelection && searchCampus("", places.features, buildings?.list ?? [])
    .find((result) => result.kind === initialSelection.kind && result.id === initialSelection.id);
  return <DirectionsBox buildings={buildings} initialTo={initialTo} onClose={onClose} />;
}
