/** @file Culture mode state (never saved): is the sticky-note layer on, which note is open in the reader, is the reader shown, and is the West vs East guide open. A tiny external store like src/stories/store.ts. */
import { useSyncExternalStore } from "react";

interface State { on: boolean; guide: boolean; note: string | null; reader: boolean }

let state: State = { on: false, guide: false, note: null, reader: false };
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

/** Turn the culture layer on or off. On means every other layer hides and the welcome letter opens; off closes everything. */
export function setCulture(on: boolean) {
  set(on ? { on, note: null, reader: true } : { on, note: null, reader: false, guide: false });
}

/** Open a note in the reader (null shows the welcome letter). */
export function setNote(id: string | null) {
  set({ note: id, reader: true });
}

/** Show or hide the reader card without leaving culture mode. */
export function setReader(open: boolean) {
  set({ reader: open });
}

/** Open or close the West vs East guide. */
export function setGuide(open: boolean) {
  set({ guide: open });
}

/** React hook for the culture state. */
export function useCulture(): State {
  return useSyncExternalStore(subscribeCulture, getCulture, getCulture);
}
