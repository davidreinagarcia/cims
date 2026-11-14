/** @file Layer panel state (which categories and sub-types are on), remembered on this device. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LayerFilters } from "../map/types";

const KEY = "cims.layers.v1";
const EMPTY: LayerFilters = { visible: {}, hiddenSubtypes: {} };

function load(): LayerFilters {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && typeof raw.visible === "object" && typeof raw.hiddenSubtypes === "object") return raw;
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return EMPTY;
}

/** What useLayerFilters() returns. */
export interface LayerFiltersApi {
  filters: LayerFilters;
  /** Is this category switched on? */
  isOn: (category: string) => boolean;
  /** Is this sub-type switched on? */
  isSubtypeOn: (category: string, subtype: string) => boolean;
  toggleCategory: (category: string) => void;
  toggleSubtype: (category: string, subtype: string) => void;
}

const Ctx = createContext<LayerFiltersApi | null>(null);

/** Provides the layer filters to the app. Mount once, in App. */
export function LayerFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<LayerFilters>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(filters));
    } catch {
      /* ignore: persistence is a convenience */
    }
  }, [filters]);

  const toggleCategory = useCallback(
    (cat: string) => setFilters((f) => ({ ...f, visible: { ...f.visible, [cat]: f.visible[cat] === false } })),
    [],
  );
  const toggleSubtype = useCallback(
    (cat: string, sub: string) =>
      setFilters((f) => {
        const hidden = f.hiddenSubtypes[cat] ?? [];
        const next = hidden.includes(sub) ? hidden.filter((s) => s !== sub) : [...hidden, sub];
        return { ...f, hiddenSubtypes: { ...f.hiddenSubtypes, [cat]: next } };
      }),
    [],
  );

  const api = useMemo<LayerFiltersApi>(
    () => ({
      filters,
      isOn: (cat) => filters.visible[cat] !== false,
      isSubtypeOn: (cat, sub) => !(filters.hiddenSubtypes[cat] ?? []).includes(sub),
      toggleCategory,
      toggleSubtype,
    }),
    [filters, toggleCategory, toggleSubtype],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** Read and change the layer panel state from any component. */
export function useLayerFilters(): LayerFiltersApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLayerFilters must be used inside <LayerFiltersProvider>");
  return ctx;
}
