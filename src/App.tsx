/** @file App root: demo auth, selection and layer-filter providers around the map-first shell (src/shell/). */
import Shell from "./shell/Shell";
import { AuthProvider } from "./state/auth";
import { LayerFiltersProvider } from "./state/layerFilters";
import { SelectionProvider } from "./state/selection";

/** Root component. */
export default function App() {
  return (
    <AuthProvider>
      <SelectionProvider>
        <LayerFiltersProvider>
          <Shell />
        </LayerFiltersProvider>
      </SelectionProvider>
    </AuthProvider>
  );
}
