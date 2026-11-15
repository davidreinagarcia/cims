/** @file Route panel of the shell: From and To fields with suggestions and swap (walking directions open in Google Maps for now). */
import { useEffect, useState } from "react";
import { loadBuildings, loadedBuildings, type BuildingIndex } from "../lib/buildings";
import DirectionsBox from "../panels/search/DirectionsBox";

/** Loads the building index and hosts the directions fields inside the floating card or sheet. */
export default function RoutePanel({ onClose }: { onClose: () => void }) {
  const [buildings, setBuildings] = useState<BuildingIndex | null>(loadedBuildings);
  useEffect(() => {
    let alive = true;
    void loadBuildings().then((index) => { if (alive) setBuildings(index); }).catch(() => { /* fields still search places */ });
    return () => { alive = false; };
  }, []);
  return <DirectionsBox buildings={buildings} onClose={onClose} />;
}
