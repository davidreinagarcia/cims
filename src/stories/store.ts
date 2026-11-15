/** @file Stories state without a provider: a tiny external store (list, viewer subset, map-focus requests) shared by the Stories tab, the heat layer and the shell. */
import { useSyncExternalStore } from "react";
import type { Session } from "../auth/types";
import { demoStories } from "./demoStories";
import { localAdapter } from "./localAdapter";
import type { Capture, Story, StoriesAdapter } from "./types";

/** A request to look at one place on the map; `nonce` makes repeats of the same spot count as new requests. */
export interface MapFocus { lat: number; lng: number; nonce: number }
/** A subset of stories to show in the viewer (set when the user clicks the heat map). */
export interface ViewerRequest { ids: string[]; nonce: number }

interface State { stories: Story[]; loaded: boolean; viewer: ViewerRequest | null; focus: MapFocus | null; heat: boolean }

const HEAT_KEY = "cims.stories.heat.v1";
function loadHeat(): boolean {
  try { return localStorage.getItem(HEAT_KEY) !== "off"; } catch { return true; }
}

let adapter: StoriesAdapter = localAdapter;
let state: State = { stories: [], loaded: false, viewer: null, focus: null, heat: loadHeat() };
let starting: Promise<void> | null = null;
let nonce = 0;
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Subscribe to any change (for non-React consumers such as the map layer). Returns the unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current snapshot, newest story first among live ones. */
export function getState(): State {
  return state;
}

/** Loads real + demo stories once (safe to call repeatedly). */
export function ensureLoaded(): Promise<void> {
  starting ??= Promise.all([adapter.list(), demoStories()]).then(([mine, demo]) => {
    set({ stories: [...mine, ...demo], loaded: true });
  });
  return starting;
}

/** React hook over the store. */
export function useStories(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Live stories, newest first (expired ones are dropped as time passes). */
export function liveStories(stories: Story[], now = Date.now()): Story[] {
  return stories.filter((s) => s.expiresAt > now).sort((a, b) => b.createdAt - a.createdAt);
}

/** Saves a captured story for the signed-in account and shows it immediately. */
export async function postStory(author: Session, capture: Capture, caption?: string): Promise<Story> {
  const story = await adapter.add(author, capture, caption);
  set({ stories: [story, ...state.stories] });
  return story;
}

/** Show only these stories in the Stories tab (heat map click). */
export function openViewer(ids: string[]) {
  set({ viewer: { ids, nonce: ++nonce } });
}

/** Back to the full feed. */
export function closeViewer() {
  set({ viewer: null });
}

/** Ask the map to zoom to where a story was captured. */
export function focusOnMap(story: Pick<Story, "lat" | "lng">) {
  set({ focus: { lat: story.lat, lng: story.lng, nonce: ++nonce } });
}

/** Backend hook: replace the storage adapter before the first load. */
export function setAdapter(next: StoriesAdapter) {
  adapter = next;
}

/** Show or hide the heat map layer on the map (remembered on this device). */
export function setHeat(on: boolean) {
  try { localStorage.setItem(HEAT_KEY, on ? "on" : "off"); } catch { /* ignore */ }
  set({ heat: on });
}
