/** @file Which indoor building screen is open: picking a building shows a preview card first, this opens its full screen. */
import { useSyncExternalStore } from "react";

let opened: string | null = null;
const listeners = new Set<() => void>();
const set = (id: string | null) => { if (opened !== id) { opened = id; listeners.forEach((listener) => listener()); } };

/** Opens the full indoor screen of a building. */
export function openIndoor(buildingId: string): void { set(buildingId); }
/** Back to the preview card (or the map) without clearing the selection. */
export function closeIndoor(): void { set(null); }
/** The building whose full indoor screen is open, if any. */
export function useOpenIndoor(): string | null {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => opened);
}
