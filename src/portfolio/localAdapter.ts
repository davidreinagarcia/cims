/** @file Permanent local storage for BuzzPrint: one localStorage array, scoped per account, no expiry (unlike Stories). */
import type { PortfolioAdapter, PortfolioEntry, PortfolioEntrySeed, PortfolioPhotoSeed } from "./types";

const KEY = "cims.portfolio.entries.v1";
/**
 * Soft ceiling on one photo's base64 size. localStorage is typically capped around 5MB *per origin,
 * for all keys combined* — a few uncompressed phone photos can exceed that entirely. Past this size we
 * still show the photo for this session, but warn that it (or others) may not survive a reload.
 */
export const MAX_PHOTO_BYTES = 350_000;

function readAll(): PortfolioEntry[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as PortfolioEntry[]) : [];
  } catch {
    return [];
  }
}

/** Returns false (instead of throwing) when storage is blocked or the quota is exceeded. */
function writeAll(entries: PortfolioEntry[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Portfolio entries stored on this device only (prototype, like Stories' local adapter); swap for a backend adapter without touching the UI. */
export const localAdapter: PortfolioAdapter = {
  async list(accountId) {
    return readAll()
      .filter((entry) => entry.accountId === accountId)
      .sort((a, b) => b.savedAt - a.savedAt);
  },

  async add(accountId, seed: PortfolioEntrySeed) {
    const all = readAll();
    // One entry per post per account: re-marking "Interested" after un-marking it reuses the original
    // record instead of duplicating it (un-marking never deletes the entry in the first place).
    const existing = all.find((entry) => entry.accountId === accountId && entry.postId === seed.postId);
    if (existing) return existing;
    const entry: PortfolioEntry = { ...seed, accountId, id: makeId("pf"), photos: [] };
    writeAll([entry, ...all]);
    return entry;
  },

  async addPhoto(accountId, entryId, photo: PortfolioPhotoSeed) {
    const all = readAll();
    const index = all.findIndex((entry) => entry.id === entryId && entry.accountId === accountId);
    if (index < 0) return null;
    const withPhoto: PortfolioEntry = { ...all[index], photos: [...all[index].photos, { ...photo, id: makeId("ph") }] };
    const next = [...all];
    next[index] = withPhoto;
    // Persist best-effort: if the quota is exceeded the photo still shows for this session (returned below),
    // it just will not survive a reload — the same honest tradeoff Stories makes when IndexedDB is blocked.
    writeAll(next);
    return withPhoto;
  },
};
