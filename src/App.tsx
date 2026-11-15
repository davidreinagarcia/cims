/** @file App shell: selection, layer-filter and indoor providers plus the two-column layout (sidebar and map, with the indoor viewer over the map). */
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import IndoorViewer from "./indoor/IndoorViewer";
import { IndoorProvider } from "./indoor/state";
import { LayerFiltersProvider } from "./state/layerFilters";
import { SelectionProvider } from "./state/selection";

/** Root component. */
export default function App() {
  return (
    <SelectionProvider>
      <LayerFiltersProvider>
      <IndoorProvider>
      <div className="app cims">
        <Sidebar />
        <MapView />
        <IndoorViewer />
      </div>
      </IndoorProvider>
      </LayerFiltersProvider>
    </SelectionProvider>
  );
}
