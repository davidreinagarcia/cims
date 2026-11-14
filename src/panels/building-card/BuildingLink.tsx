/** @file Table row "Building" for a place card: names the footprint the place stands in and selects it on click. */
import { useEffect, useState } from "react";
import { loadBuildings, loadedBuildings, type Building } from "../../lib/buildings";
import { useSelection } from "../../state/selection";

/** Renders nothing when the place is not inside a known footprint (or the footprints are not loaded). */
export default function BuildingLink({ coordinates }: { coordinates: number[] }) {
  const { select } = useSelection();
  const [lng, lat] = coordinates;
  const [building, setBuilding] = useState<Building | undefined>(() => loadedBuildings()?.at(lng, lat));
  useEffect(() => {
    let alive = true;
    const index = loadedBuildings();
    if (index) setBuilding(index.at(lng, lat));
    else loadBuildings().then((loaded) => alive && setBuilding(loaded.at(lng, lat))).catch(() => {});
    return () => {
      alive = false;
    };
  }, [lng, lat]);
  if (!building) return null;
  return (
    <tr>
      <th scope="row">Building</th>
      <td><button type="button" className="detail__link" onClick={() => select({ kind: "building", id: building.id })}>{building.name ?? "Unnamed building"}</button></td>
    </tr>
  );
}
