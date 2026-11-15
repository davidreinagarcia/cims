/** @file Campus alerts (GTPD alarms) and citizen police tips: types, geometry, and a live store that talks to the real-time server or falls back to this browser only. */
import { useSyncExternalStore } from "react";
import { readLocal, writeLocal } from "./localStore";

/** What kind of danger an alarm announces (drives the label and default wording). */
export type AlertKind = "armed-person" | "shelter-in-place" | "evacuate" | "fire" | "hazard" | "other";

/** Alarm kinds in the order the police form lists them. */
export const ALERT_KINDS: { id: AlertKind; label: string; message: string }[] = [
  { id: "armed-person", label: "Armed person", message: "Avoid the area. Shelter in a locked room and call 911 if you are in danger." },
  { id: "shelter-in-place", label: "Shelter in place", message: "Go indoors, lock or barricade doors and stay away from windows until the all clear." },
  { id: "evacuate", label: "Evacuate", message: "Leave the marked area now and follow instructions from officers." },
  { id: "fire", label: "Fire", message: "Leave nearby buildings and keep clear of the marked area." },
  { id: "hazard", label: "Hazard", message: "Stay away from the marked area." },
  { id: "other", label: "Other incident", message: "Avoid the marked area until further notice." },
];

/** A police alarm drawn as a circle on the map. */
export interface CampusAlert {
  id: string;
  kind: AlertKind;
  title: string;
  message: string;
  /** Circle center as [lng, lat]. */
  center: [number, number];
  radiusM: number;
  /** True for a drill: shown with a TEST label and a different color. */
  test: boolean;
  status: "active" | "ended";
  createdAt: string;
  endedAt: string | null;
}

/** What GTPD submits to launch an alarm. */
export interface NewAlert {
  kind: AlertKind;
  title: string;
  message: string;
  center: [number, number];
  radiusM: number;
  test: boolean;
}

/** Categories a citizen can pick when notifying police. */
export type TipCategory = "suspicious-person" | "theft" | "harassment" | "fire-smoke" | "medical" | "other";

/** Citizen police-tip categories in display order. */
export const TIP_CATEGORIES: { id: TipCategory; label: string; hint?: string }[] = [
  { id: "suspicious-person", label: "Suspicious person or activity" },
  { id: "theft", label: "Theft or break-in" },
  { id: "harassment", label: "Harassment or threat" },
  { id: "fire-smoke", label: "Fire or smoke" },
  { id: "medical", label: "Medical emergency" },
  { id: "other", label: "Something else" },
];

/** Where a tip sits in the police queue. */
export type TipStatus = "new" | "acknowledged" | "resolved";

/** A citizen's notice to GTPD. */
export interface PoliceTip {
  id: string;
  category: TipCategory;
  description: string;
  photoDataUrl: string | null;
  point: [number, number];
  /** GPS accuracy radius in meters; null when the location was picked by hand. */
  accuracyM: number | null;
  buildingName: string | null;
  status: TipStatus;
  createdAt: string;
}

/** What the citizen form submits. */
export type NewPoliceTip = Pick<PoliceTip, "category" | "description" | "photoDataUrl" | "point" | "accuracyM" | "buildingName">;

/** Everything the app knows right now. `tips` stays empty unless the police access code was accepted. */
export interface AlertsSnapshot {
  alerts: CampusAlert[];
  tips: PoliceTip[];
  /** True once the server accepted the police access code (always true in local demo mode). */
  police: boolean;
}

/** Connection state shown in the police view. */
export type AlertsStatus = "connecting" | "live" | "offline";

/** The store state React and map layers read. */
export interface AlertsState extends AlertsSnapshot {
  status: AlertsStatus;
  /** "remote" talks to the server; "local" is a single-browser demo used when no server answers. */
  mode: "remote" | "local" | null;
  /** The saved access code was rejected by the server. */
  keyRejected: boolean;
}

/** Error from a police action; `unauthorized` means the access code is wrong or missing. */
export class AlertsError extends Error {
  constructor(public reason: "unauthorized" | "rate-limited" | "invalid" | "offline", message: string) {
    super(message);
    this.name = "AlertsError";
  }
}

/** Points of a circle on the ground as a closed GeoJSON ring ([lng, lat]), accurate at campus scale. */
export function circleRing(center: [number, number], radiusM: number, steps = 96): [number, number][] {
  const [lng, lat] = center;
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return ring;
}

/** Whether a [lng, lat] point lies inside an alarm circle. */
export function insideAlert(alert: CampusAlert, point: [number, number]): boolean {
  const dx = (point[0] - alert.center[0]) * 111_320 * Math.cos((alert.center[1] * Math.PI) / 180);
  const dy = (point[1] - alert.center[1]) * 111_320;
  return Math.hypot(dx, dy) <= alert.radiusM;
}

/** Label for an alarm kind. */
export function alertKindLabel(kind: AlertKind): string {
  return ALERT_KINDS.find((k) => k.id === kind)?.label ?? "Alert";
}

// ---------------------------------------------------------------- store

const POLICE_KEY_STORAGE = "cims.police.key.v1";
const LOCAL_KEY = "cims.alerts.local.v1";
const API = "/api";
const EMPTY: AlertsState = { alerts: [], tips: [], police: false, status: "connecting", mode: null, keyRejected: false };

let state: AlertsState = EMPTY;
const listeners = new Set<() => void>();
let stop: (() => void) | null = null;
let policeKey: string | null = null;
try { policeKey = sessionStorage.getItem(POLICE_KEY_STORAGE); } catch { /* memory only */ }

function set(patch: Partial<AlertsState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function readSnapshotEvent(raw: string): AlertsSnapshot | null {
  try {
    const data = JSON.parse(raw) as AlertsSnapshot;
    return Array.isArray(data.alerts) ? { alerts: data.alerts, tips: data.tips ?? [], police: !!data.police } : null;
  } catch { return null; }
}

/** Opens the live stream (fetch based so the access code travels in a header, not the URL). Returns a stopper. */
function startRemote(): () => void {
  const ctrl = new AbortController();
  let retry = 1000;
  (async () => {
    while (!ctrl.signal.aborted) {
      try {
        const res = await fetch(`${API}/stream`, { headers: policeKey ? { "x-police-key": policeKey } : {}, signal: ctrl.signal });
        if (res.status === 401) {
          forgetKey();
          set({ keyRejected: true });
          continue;
        }
        if (!res.ok || !res.body) throw new Error(String(res.status));
        retry = 1000;
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let end: number;
          while ((end = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const data = block.split("\n").filter((l) => l.startsWith("data: ")).map((l) => l.slice(6)).join("\n");
            const snap = data ? readSnapshotEvent(data) : null;
            if (snap) set({ ...snap, status: "live", keyRejected: snap.police ? false : state.keyRejected });
          }
        }
      } catch {
        if (ctrl.signal.aborted) return;
      }
      set({ status: "offline" });
      await new Promise((r) => setTimeout(r, retry));
      retry = Math.min(retry * 2, 10_000);
    }
  })();
  return () => ctrl.abort();
}

interface LocalDb { alerts: CampusAlert[]; tips: PoliceTip[] }
const readLocalDb = () => readLocal<LocalDb>(LOCAL_KEY, { alerts: [], tips: [] });
function pushLocal() {
  const db = readLocalDb();
  set({ alerts: db.alerts, tips: db.tips, police: true, status: "live" });
}
function mutateLocal(change: (db: LocalDb) => void) {
  const db = readLocalDb();
  change(db);
  writeLocal(LOCAL_KEY, db);
  pushLocal();
}

/** Browser-only fallback so the feature still works without the server (other tabs see changes through `storage`). */
function startLocal(): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === LOCAL_KEY) pushLocal(); };
  window.addEventListener("storage", onStorage);
  pushLocal();
  return () => window.removeEventListener("storage", onStorage);
}

async function chooseBackend(): Promise<void> {
  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000), cache: "no-store" });
    const ok = res.ok && (await res.json()).ok === true;
    if (!ok) throw new Error("no server");
    if (stop) return;
    set({ mode: "remote" });
    stop = startRemote();
  } catch {
    if (stop) return;
    set({ mode: "local" });
    stop = startLocal();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && !stop) void chooseBackend().then(() => { if (listeners.size === 0) { stop?.(); stop = null; } });
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) { stop?.(); stop = null; state = EMPTY; }
  };
}

/** Live alarms, tips and connection state; re-renders on every server push. */
export function useAlerts(): AlertsState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

/** Subscribes plain (non-React) code, such as a map layer, to alert changes; returns the unsubscribe. */
export function subscribeAlerts(listener: (s: AlertsState) => void): () => void {
  return subscribe(() => listener(state));
}

function forgetKey() {
  policeKey = null;
  try { sessionStorage.removeItem(POLICE_KEY_STORAGE); } catch { /* ignore */ }
}

/** Saves the police access code for this tab and reconnects with it; the server answers with tips when it is right. */
export function setPoliceKey(key: string | null): void {
  policeKey = key?.trim() || null;
  try {
    if (policeKey) sessionStorage.setItem(POLICE_KEY_STORAGE, policeKey);
    else sessionStorage.removeItem(POLICE_KEY_STORAGE);
  } catch { /* memory only */ }
  set({ keyRejected: false, police: state.mode === "local" });
  if (state.mode === "remote") { stop?.(); stop = startRemote(); }
}

/** The code currently in use (null when none). */
export function currentPoliceKey(): string | null {
  return policeKey;
}

async function call<T>(path: string, init: RequestInit & { police?: boolean }): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.police && policeKey) headers["x-police-key"] = policeKey;
  let res: Response;
  try { res = await fetch(`${API}${path}`, { ...init, headers }); } catch { throw new AlertsError("offline", "No connection to the alert server."); }
  const body = await res.json().catch(() => ({}));
  if (res.ok) return body as T;
  const message = typeof body?.error === "string" ? body.error : "Something went wrong.";
  if (res.status === 401) throw new AlertsError("unauthorized", message);
  if (res.status === 429) throw new AlertsError("rate-limited", message);
  throw new AlertsError("invalid", message);
}

/** Police: launches an alarm that every open page shows at once. */
export async function launchAlert(input: NewAlert): Promise<CampusAlert> {
  if (state.mode === "local") {
    const alert: CampusAlert = { ...input, id: crypto.randomUUID(), status: "active", createdAt: new Date().toISOString(), endedAt: null };
    mutateLocal((db) => { db.alerts.push(alert); });
    return alert;
  }
  return call<CampusAlert>("/alerts", { method: "POST", body: JSON.stringify(input), police: true });
}

/** Police: ends an alarm (everyone sees an all-clear). */
export async function endAlert(id: string): Promise<void> {
  if (state.mode === "local") {
    mutateLocal((db) => { const a = db.alerts.find((x) => x.id === id); if (a && a.status === "active") { a.status = "ended"; a.endedAt = new Date().toISOString(); } });
    return;
  }
  await call(`/alerts/${id}/end`, { method: "POST", body: "{}", police: true });
}

/** Citizen: sends a police tip; returns its id for status tracking. */
export async function submitTip(input: NewPoliceTip): Promise<{ id: string; status: TipStatus; createdAt: string }> {
  if (state.mode === "local") {
    const tip: PoliceTip = { ...input, id: crypto.randomUUID(), status: "new", createdAt: new Date().toISOString() };
    mutateLocal((db) => { db.tips.push(tip); });
    return { id: tip.id, status: tip.status, createdAt: tip.createdAt };
  }
  return call("/tips", { method: "POST", body: JSON.stringify(input) });
}

/** Citizen: current status of a tip they sent. */
export async function tipStatus(id: string): Promise<{ id: string; status: TipStatus; createdAt: string } | null> {
  if (state.mode === "local") {
    const tip = readLocalDb().tips.find((t) => t.id === id);
    return tip ? { id, status: tip.status, createdAt: tip.createdAt } : null;
  }
  try { return await call(`/tips/${id}`, {}); } catch { return null; }
}

/** Police: moves a tip along the queue. */
export async function setTipStatus(id: string, status: TipStatus): Promise<void> {
  if (state.mode === "local") {
    mutateLocal((db) => { const t = db.tips.find((x) => x.id === id); if (t) t.status = status; });
    return;
  }
  await call(`/tips/${id}`, { method: "PATCH", body: JSON.stringify({ status }), police: true });
}

/** Asks the map to fly to an alarm (the banner's "Show on map"). */
export function focusAlert(alert: CampusAlert): void {
  window.dispatchEvent(new CustomEvent("cims:focus-alert", { detail: alert }));
}
