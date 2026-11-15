/** @file Table row "Building" for a place card: names the footprint the place stands in and selects it on click. */
import { useEffect, useState } from "react";
import { loadBuildings, loadedBuildings, type Building } from "../../lib/buildings";
import { useSelection } from "../../state/selection";

/** Renders nothing when the place is not inside a known footprint (or the footprints are not loaded). */
export default function BuildingLink({ coordinates, buildingId, attached, floorOrRoom }: { coordinates: number[]; buildingId?: string; attached?: boolean; floorOrRoom?: string }) {
  const { select } = useSelection();
  const [lng, lat] = coordinates;
  const [building, setBuilding] = useState<Building | undefined>(() => (buildingId && loadedBuildings()?.byId.get(buildingId)) || loadedBuildings()?.at(lng, lat));
  useEffect(() => {
    let alive = true;
    const index = loadedBuildings();
    if (index) setBuilding((buildingId && index.byId.get(buildingId)) || index.at(lng, lat));
    else loadBuildings().then((loaded) => alive && setBuilding((buildingId && loaded.byId.get(buildingId)) || loaded.at(lng, lat))).catch(() => {});
    return () => {
      alive = false;
    };
  }, [lng, lat, buildingId]);
  if (!building) return null;
  return (
    <tr>
      <th scope="row">Building</th>
      <td>{attached && "Inside "}<button type="button" className="detail__link" onClick={() => select({ kind: "building", id: building.id })}>{building.name ?? "Unnamed building"}</button>{floorOrRoom && <> · {floorOrRoom}</>}</td>
    </tr>
  );
}
