/** @file Tiny localStorage JSON helpers shared by the mock backend adapters (prototype persistence only; see ADR-0005). */

/** Reads JSON from localStorage; falls back when storage is blocked or the value is corrupt. */
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Writes JSON to localStorage; returns false when storage is blocked or full (caller should fall back to memory). */
export function writeLocal(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
