/** @file Layer panel state (which categories and sub-types are on), remembered on this device. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCulture, setCulture, useCulture } from "../culture/store";
import { LAYER_CATALOG } from "../lib/layerCatalog";
import { places } from "../lib/places";
import type { LayerFilters } from "../map/types";

const KEY = "cims.layers.v1";
const EMPTY: LayerFilters = { visible: {}, hiddenSubtypes: {} };

function load(): LayerFilters {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    const isMap = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v); // typeof null is "object"
    if (raw && isMap(raw.visible) && isMap(raw.hiddenSubtypes)) return raw;
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
  const [saved, setFilters] = useState<LayerFilters>(load);
  const culture = useCulture().on;
  // Culture mode hides every place layer without touching the user's own choices; the alerts overlay stays (safety).
  const filters = useMemo<LayerFilters>(() => {
    if (!culture) return saved;
    const visible: Record<string, boolean> = { ...saved.visible };
    for (const c of LAYER_CATALOG) visible[c.id] = false;
    for (const f of places.features) visible[f.properties.category] = false; // also landmarks and any category without a chip
    return { ...saved, visible };
  }, [saved, culture]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* ignore: persistence is a convenience */
    }
  }, [saved]);

  const toggleCategory = useCallback(
    (cat: string) => {
      if (cat === "culture") { setCulture(!getCulture().on); return; }
      if (getCulture().on) { // picking a normal layer leaves culture mode and makes sure that layer shows
        setCulture(false);
        setFilters((f) => ({ ...f, visible: { ...f.visible, [cat]: true } }));
        return;
      }
      setFilters((f) => ({ ...f, visible: { ...f.visible, [cat]: f.visible[cat] === false } }));
    },
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
      isOn: (cat) => (cat === "culture" ? culture : filters.visible[cat] !== false),
      isSubtypeOn: (cat, sub) => !(filters.hiddenSubtypes[cat] ?? []).includes(sub),
      toggleCategory,
      toggleSubtype,
    }),
    [filters, culture, toggleCategory, toggleSubtype],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** Read and change the layer panel state from any component. */
export function useLayerFilters(): LayerFiltersApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLayerFilters must be used inside <LayerFiltersProvider>");
  return ctx;
}
