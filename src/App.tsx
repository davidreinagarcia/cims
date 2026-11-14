/** @file App shell: selection provider plus the two-column layout (sidebar and map). */
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import { SelectionProvider } from "./state/selection";

/** Root component. */
export default function App() {
  return (
    <SelectionProvider>
      <div className="app cims">
        <Sidebar />
        <MapView />
      </div>
    </SelectionProvider>
  );
}
