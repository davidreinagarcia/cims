/** @file Alarm layer: shows live GTPD alarms (danger circle, ripple, beacon) on the main map and flies to new ones. */
import type { MapLayer } from "../types";
import { addAlertsOverlay } from "../alertsOverlay";

const alerts: MapLayer = {
  id: "alerts",
  order: 90, // above everything else: a danger zone must never be hidden by pins
  addTo(map) {
    const remove = addAlertsOverlay(map, { fly: true });
    return { remove };
  },
};

export default alerts;
