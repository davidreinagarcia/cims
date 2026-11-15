/** @file Indoor view state: which building is open and which level is shown. Entry point for "Enter building". */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { entranceLevel, getIndoor } from "./data";

/** What useIndoor() returns. */
export interface IndoorApi {
  /** Building whose floor plan is open, or null when the campus map is showing. */
  buildingId: string | null;
  /** Level currently shown. */
  levelId: string | null;
  /** Open a building's floor plan on its entrance level (or on `levelId`). Does nothing if it has no indoor data. */
  enter: (buildingId: string, levelId?: string) => void;
  /** Back to the campus map. */
  exit: () => void;
  setLevel: (levelId: string) => void;
}

const IndoorContext = createContext<IndoorApi | null>(null);

function initial(): { buildingId: string | null; levelId: string | null } {
  const asked = typeof location !== "undefined" ? new URLSearchParams(location.search).get("indoor") : null;
  const building = asked ? getIndoor(asked) : undefined;
  return building ? { buildingId: building.building_id, levelId: entranceLevel(building).id } : { buildingId: null, levelId: null };
}

/** Provides the indoor state to the app. Mount once, in App. */
export function IndoorProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(initial);
  const enter = useCallback((buildingId: string, levelId?: string) => {
    const building = getIndoor(buildingId);
    if (building) setOpen({ buildingId, levelId: levelId ?? entranceLevel(building).id });
  }, []);
  const exit = useCallback(() => setOpen({ buildingId: null, levelId: null }), []);
  const setLevel = useCallback((levelId: string) => setOpen((o) => ({ ...o, levelId })), []);
  const api = useMemo<IndoorApi>(() => ({ ...open, enter, exit, setLevel }), [open, enter, exit, setLevel]);
  return <IndoorContext.Provider value={api}>{children}</IndoorContext.Provider>;
}

/** Read and change the indoor view from any component (the building card calls `enter`). */
export function useIndoor(): IndoorApi {
  const ctx = useContext(IndoorContext);
  if (!ctx) throw new Error("useIndoor must be used inside <IndoorProvider>");
  return ctx;
}
