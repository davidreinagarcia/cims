/** @file App shell: demo auth, selection and layer filters around the sidebar, the map and the offline notice. */
import SignInDialog from "./panels/account/SignInDialog";
import { AuthProvider } from "./state/auth";
import MapView from "./components/MapView";
import OfflineBanner from "./components/OfflineBanner";
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
            <OfflineBanner />
          </div>
        </LayerFiltersProvider>
      </SelectionProvider>
    </AuthProvider>
  );
}
