/** @file App shell: demo auth, selection and layer filters around the sidebar and map. */
import SignInDialog from "./panels/account/SignInDialog";
import { AuthProvider } from "./state/auth";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import { LayerFiltersProvider } from "./state/layerFilters";
import { SelectionProvider } from "./state/selection";

/** Root component. */
export default function App() {
  return (
    <AuthProvider>
      <SelectionProvider>
        <LayerFiltersProvider>
          <div className="app cims">
            <SignInDialog />
            <Sidebar />
            <MapView />
          </div>
        </LayerFiltersProvider>
      </SelectionProvider>
    </AuthProvider>
  );
}
