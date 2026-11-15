/** @file Culture mode state (never saved): is the sticky-note layer on, and is the West vs East guide open. A tiny external store like src/stories/store.ts. */
import { useSyncExternalStore } from "react";

interface State { on: boolean; guide: boolean }

let state: State = { on: false, guide: false };
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Current culture state (for non-React code such as map layers). */
export function getCulture(): State {
  return state;
}

/** Listen for culture state changes; returns the unsubscribe function. */
export function subscribeCulture(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Turn the culture layer on or off. On means every other layer hides; off brings the user's own layers back. */
export function setCulture(on: boolean) {
  set({ on });
}

/** Open or close the West vs East guide. */
export function setGuide(open: boolean) {
  set({ guide: open });
}

/** React hook for the culture state. */
export function useCulture(): State {
  return useSyncExternalStore(subscribeCulture, getCulture, getCulture);
}
