/** @file App shell: selection and layer-filter providers plus the two-column layout (sidebar and map). */
import MapView from "./components/MapView";
import OfflineBanner from "./components/OfflineBanner";
import Sidebar from "./components/Sidebar";
import { LayerFiltersProvider } from "./state/layerFilters";
import { SelectionProvider } from "./state/selection";

/** Root component. */
export default function App() {
  return (
    <SelectionProvider>
      <LayerFiltersProvider>
      <div className="app cims">
        <Sidebar />
        <MapView />
        <OfflineBanner />
      </div>
      </LayerFiltersProvider>
    </SelectionProvider>
  );
}
