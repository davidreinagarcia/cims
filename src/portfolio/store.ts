/** @file BuzzPrint state without a provider: entries for the signed-in account, kept separate from the ephemeral Stories store. */
import { useSyncExternalStore } from "react";
import type { BulletinPost } from "../lib/bulletin";
import type { Session } from "../auth/types";
import { localAdapter } from "./localAdapter";
import type { PortfolioAdapter, PortfolioEntry, PortfolioPhotoSeed } from "./types";

interface State { entries: PortfolioEntry[]; loaded: boolean; accountId: string | null }

let adapter: PortfolioAdapter = localAdapter;
let state: State = { entries: [], loaded: false, accountId: null };
let starting: Promise<void> | null = null;
let startedFor: string | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

/** Subscribe to any change. Returns the unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current snapshot. */
export function getState(): State {
  return state;
}

/** Loads (once per account) the signed-in account's entries. A null accountId clears the list (signed out). */
export function ensureLoaded(accountId: string | null): Promise<void> {
  if (!accountId) {
    starting = null;
    startedFor = null;
    set({ entries: [], loaded: true, accountId: null });
    return Promise.resolve();
  }
  if (startedFor === accountId && starting) return starting;
  startedFor = accountId;
  starting = adapter.list(accountId).then((entries) => set({ entries, loaded: true, accountId }));
  return starting;
}

/** React hook over the store. */
export function usePortfolio(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

/**
 * Records a BuzzPrint entry from a Bulletin post, snapshotting the fields BulletinPost already has
 * (never inventing new ones) at the moment "Interested" is first clicked. Called only when the toggle
 * turns ON — un-marking "Interested" later does not delete this entry (see src/portfolio/types.ts).
 */
export async function recordPortfolioEntry(session: Session, post: BulletinPost): Promise<void> {
  const entry = await adapter.add(session.accountId, {
    postId: post.id,
    postTitle: post.title,
    postType: post.type,
    org: post.org,
    startAt: post.start?.getTime(),
    endAt: post.end?.getTime(),
    when: post.when,
    placeName: post.placeName,
    placeId: post.placeId,
    placeKind: post.placeKind,
    posterUrl: post.poster,
    savedAt: Date.now(),
  });
  if (state.accountId === session.accountId && !state.entries.some((item) => item.id === entry.id)) {
    set({ entries: [entry, ...state.entries] });
  }
}

/** Attaches a photo to one of this account's entries and shows it immediately. */
export async function addPortfolioPhoto(accountId: string, entryId: string, photo: PortfolioPhotoSeed): Promise<void> {
  const updated = await adapter.addPhoto(accountId, entryId, photo);
  if (!updated) return;
  set({ entries: state.entries.map((entry) => (entry.id === entryId ? updated : entry)) });
}

/** Backend hook: replace the storage adapter before the first load. */
export function setAdapter(next: PortfolioAdapter): void {
  adapter = next;
}
