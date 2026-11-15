/** @file Demo storage for stories: metadata and media blobs in this browser's IndexedDB, expired stories purged on read. */
import type { Session } from "../auth/types";
import type { Capture, Story, StoriesAdapter } from "./types";

const DB_NAME = "cims-stories";
const STORE = "stories";
/** Stories live 24 hours, like Instagram. */
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

type Row = Omit<Story, "mediaUrl"> & { blob: Blob };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Stories stored on this device only (demo); swap for a backend adapter without touching the UI. */
export const localAdapter: StoriesAdapter = {
  async list() {
    try {
      const db = await open();
      const rows = await run<Row[]>(db, "readonly", (s) => s.getAll());
      const now = Date.now();
      for (const row of rows) if (row.expiresAt <= now) void run(db, "readwrite", (s) => s.delete(row.id));
      return rows.filter((r) => r.expiresAt > now).map(({ blob, ...rest }) => ({ ...rest, mediaUrl: URL.createObjectURL(blob) }));
    } catch {
      return []; // storage blocked (private mode): stories just do not persist
    }
  },
  async add(author: Session, capture: Capture, caption) {
    const row: Row = {
      id: `s-${capture.capturedAt}-${Math.random().toString(36).slice(2, 8)}`,
      accountId: author.accountId,
      authorName: author.displayName,
      kind: capture.kind,
      createdAt: capture.capturedAt,
      expiresAt: capture.capturedAt + STORY_TTL_MS,
      lat: capture.lat,
      lng: capture.lng,
      accuracy: capture.accuracy,
      caption: caption?.trim() || undefined,
      blob: capture.blob,
    };
    try {
      await run(await open(), "readwrite", (s) => s.put(row));
    } catch {
      /* storage blocked: the story still shows this session */
    }
    const { blob, ...rest } = row;
    return { ...rest, mediaUrl: URL.createObjectURL(blob) };
  },
};
