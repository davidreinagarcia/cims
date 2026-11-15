/** @file Alarm layer: shows live GTPD alarms (danger circle, ripple, beacon) on the main map, flies to new ones, and obeys the "Police alerts" toggle in Layers. */
import type { MapLayer } from "../types";
import { addAlertsOverlay } from "../alertsOverlay";
import { isVisible } from "../layerFilters";

const alerts: MapLayer = {
  id: "alerts",
  order: 90, // above everything else: a danger zone must never be hidden by pins
  addTo(map) {
    const overlay = addAlertsOverlay(map, { fly: true });
    return { setFilters: (filters) => overlay.setVisible(isVisible(filters, "alerts")), remove: overlay.remove };
  },
};

export default alerts;
