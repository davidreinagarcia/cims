/** @file App shell: demo auth, selection and layer filters around the sidebar, the map and the offline notice. */
import SignInDialog from "./panels/account/SignInDialog";
import { AuthProvider } from "./state/auth";
import BuildingView from "./indoor/BuildingView";
import MapView from "./components/MapView";
import OfflineBanner from "./components/OfflineBanner";
import Sidebar from "./components/Sidebar";
import ReportPanelRoute from "./panels/report";
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
            <div className="stage">
              <MapView />
              <BuildingView />
            </div>
            <OfflineBanner />
            <ReportPanelRoute />
          </div>
        </LayerFiltersProvider>
      </SelectionProvider>
    </AuthProvider>
  );
}
