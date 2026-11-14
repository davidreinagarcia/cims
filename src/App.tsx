import { useState } from "react";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <div className="app">
      <Sidebar selectedId={selectedId} onSelect={setSelectedId} />
      <MapView selectedId={selectedId} onSelect={setSelectedId} />
    </div>
  );
}
