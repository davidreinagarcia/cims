/** @file App shell: holds the selected place and wires the sidebar to the map. */
import { useState } from "react";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";
import ReportPanelRoute from "./panels/report";

/** Root component: sidebar plus map sharing one selection. */
export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <div className="app">
      <Sidebar selectedId={selectedId} onSelect={setSelectedId} />
      <MapView selectedId={selectedId} onSelect={setSelectedId} />
      <ReportPanelRoute />
    </div>
  );
}
