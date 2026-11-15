/** @file Shared selection state: what the user picked on the map or in a panel (building, place, room, report). */
import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";

/** Selectable map and search entities; room ids use "buildingId:spaceId". */
export type SelectionKind = "building" | "place" | "room" | "report" | "stop";

/** One selected thing: what kind it is and its id inside that kind's data. */
export interface Selection {
  kind: SelectionKind;
  id: string;
}

type Action = { type: "select"; selection: Selection } | { type: "clear" };

function reducer(_state: Selection | null, action: Action): Selection | null {
  return action.type === "select" ? action.selection : null;
}

/** What useSelection() returns. */
export interface SelectionApi {
  selection: Selection | null;
  /** Select something, or pass null to clear. */
  select: (selection: Selection | null) => void;
}

const SelectionContext = createContext<SelectionApi | null>(null);

/** Provides the selection to the whole app. Mount once, in App. */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selection, dispatch] = useReducer(reducer, null);
  const api = useMemo<SelectionApi>(
    () => ({
      selection,
      select: (s) => dispatch(s ? { type: "select", selection: s } : { type: "clear" }),
    }),
    [selection],
  );
  return <SelectionContext.Provider value={api}>{children}</SelectionContext.Provider>;
}

/** Read and change the current selection from any component. */
export function useSelection(): SelectionApi {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used inside <SelectionProvider>");
  return ctx;
}
