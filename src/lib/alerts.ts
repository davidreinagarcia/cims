/** @file Campus alerts (GTPD alarms) and citizen police tips: types, geometry, and a live store on Supabase (Realtime) that falls back to this browser only if the backend is down. */
import { useSyncExternalStore } from "react";
import { readLocal, writeLocal } from "./localStore";
import { watchTable } from "./realtime";
import { BackendDown, currentAccount, publicUrl, rest, upload } from "./supabase";

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

/** Everything the app knows right now. `tips` stays empty unless a police or moderator account is signed in. */
export interface AlertsSnapshot {
  alerts: CampusAlert[];
  tips: PoliceTip[];
  /** True when the signed-in account is police or moderator (always true in local demo mode). */
  police: boolean;
}

/** Connection state shown in the police view. */
export type AlertsStatus = "connecting" | "live" | "offline";

/** The store state React and map layers read. */
export interface AlertsState extends AlertsSnapshot {
  status: AlertsStatus;
  /** "remote" is Supabase; "local" is a single-browser demo used when the backend is unreachable. */
  mode: "remote" | "local" | null;
}

/** Error from a police action; `unauthorized` means the account is not allowed. */
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

const LOCAL_KEY = "cims.alerts.local.v1";
const EMPTY: AlertsState = { alerts: [], tips: [], police: false, status: "connecting", mode: null };

let state: AlertsState = EMPTY;
const listeners = new Set<() => void>();
let stop: (() => void) | null = null;

function set(patch: Partial<AlertsState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

interface AlertRow { id: string; kind: AlertKind; title: string; message: string; lng: number; lat: number; radius_m: number; test: boolean; status: "active" | "ended"; created_at: string; ended_at: string | null }
interface TipRow { id: string; category: TipCategory; description: string; photo_path: string | null; lng: number; lat: number; accuracy_m: number | null; building_name: string | null; status: TipStatus; created_at: string }

const toAlert = (r: AlertRow): CampusAlert => ({
  id: r.id, kind: r.kind, title: r.title, message: r.message, center: [r.lng, r.lat], radiusM: r.radius_m,
  test: r.test, status: r.status, createdAt: r.created_at, endedAt: r.ended_at,
});
const toTip = (r: TipRow): PoliceTip => ({
  id: r.id, category: r.category, description: r.description, photoDataUrl: r.photo_path ? publicUrl("reports", r.photo_path) : null,
  point: [r.lng, r.lat], accuracyM: r.accuracy_m, buildingName: r.building_name, status: r.status, createdAt: r.created_at,
});

/** Whether the signed-in account may see tips and launch alarms. */
const isPoliceAccount = () => { const r = currentAccount()?.role; return r === "police" || r === "moderator"; };

/** Reads alarms (and tips, for police) from Supabase. Throws BackendDown when it is unreachable. */
let fetchSeq = 0;
async function fetchRemote(): Promise<void> {
  const seq = ++fetchSeq; // several refreshes can be in flight (one per realtime event): only the newest answer may update the state
  const police = isPoliceAccount();
  const [alerts, tips] = await Promise.all([
    rest<AlertRow[]>("alerts?select=*&order=created_at.desc&limit=100"),
    police ? rest<TipRow[]>("police_tips?select=*&order=created_at.desc&limit=200") : Promise.resolve([] as TipRow[]),
  ]);
  if (seq !== fetchSeq) return;
  set({ alerts: alerts.map(toAlert), tips: tips.map(toTip), police, status: "live" });
}

function startRemote(): () => void {
  const refresh = () => { void fetchRemote().catch(() => set({ status: "offline" })); };
  const stops = [watchTable("alerts", refresh, 15_000), watchTable("police_tips", refresh, 15_000)];
  return () => stops.forEach((f) => f());
}

/** Re-reads everything now; call after signing in or out so the police view picks up the new role. */
export function refreshAlerts(): void {
  if (state.mode === "remote") void fetchRemote().catch(() => set({ status: "offline" }));
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

/** Browser-only fallback so the feature still works without the backend (other tabs see changes through `storage`). */
function startLocal(): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === LOCAL_KEY) pushLocal(); };
  window.addEventListener("storage", onStorage);
  pushLocal();
  return () => window.removeEventListener("storage", onStorage);
}

async function chooseBackend(): Promise<void> {
  try {
    await fetchRemote();
    if (stop) return;
    set({ mode: "remote" });
    stop = startRemote();
  } catch (e) {
    if (stop) return;
    if (!(e instanceof BackendDown)) console.warn("[cims] alerts:", e);
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

/** Live alarms, tips and connection state; re-renders on every change. */
export function useAlerts(): AlertsState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

/** Subscribes plain (non-React) code, such as a map layer, to alert changes; returns the unsubscribe. */
export function subscribeAlerts(listener: (s: AlertsState) => void): () => void {
  return subscribe(() => listener(state));
}

/** Turns a Supabase rule rejection into an AlertsError the UI can show. */
function wrap(e: unknown): never {
  if (e instanceof BackendDown) throw new AlertsError("offline", "No connection to the alert server.");
  const message = e instanceof Error ? e.message : "Something went wrong.";
  throw new AlertsError(/Only GTPD/.test(message) ? "unauthorized" : /Too many/.test(message) ? "rate-limited" : "invalid", message);
}

/** Police: launches an alarm that every open page shows at once. */
export async function launchAlert(input: NewAlert): Promise<CampusAlert> {
  if (state.mode === "local") {
    const alert: CampusAlert = { ...input, id: crypto.randomUUID(), status: "active", createdAt: new Date().toISOString(), endedAt: null };
    mutateLocal((db) => { db.alerts.push(alert); });
    return alert;
  }
  try {
    const row = await rest<AlertRow>("rpc/launch_alert", { method: "POST", body: {
      p_kind: input.kind, p_title: input.title, p_message: input.message, p_lng: input.center[0], p_lat: input.center[1],
      p_radius: Math.round(input.radiusM), p_test: input.test } });
    refreshAlerts();
    return toAlert(row);
  } catch (e) { return wrap(e); }
}

/** Police: ends an alarm (everyone sees an all-clear). */
export async function endAlert(id: string): Promise<void> {
  if (state.mode === "local") {
    mutateLocal((db) => { const a = db.alerts.find((x) => x.id === id); if (a && a.status === "active") { a.status = "ended"; a.endedAt = new Date().toISOString(); } });
    return;
  }
  try { await rest("rpc/end_alert", { method: "POST", body: { p_id: id } }); refreshAlerts(); } catch (e) { wrap(e); }
}

/** Citizen: sends a police tip; returns its id for status tracking. */
export async function submitTip(input: NewPoliceTip): Promise<{ id: string; status: TipStatus; createdAt: string }> {
  if (state.mode === "local") {
    const tip: PoliceTip = { ...input, id: crypto.randomUUID(), status: "new", createdAt: new Date().toISOString() };
    mutateLocal((db) => { db.tips.push(tip); });
    return { id: tip.id, status: tip.status, createdAt: tip.createdAt };
  }
  try {
    let photo_path: string | null = null;
    if (input.photoDataUrl) photo_path = await upload("reports", await (await fetch(input.photoDataUrl)).blob(), "jpg");
    const rows = await rest<TipRow[]>("police_tips?select=id,status,created_at", { method: "POST", prefer: "return=representation", body: {
      category: input.category, description: input.description, photo_path, lng: input.point[0], lat: input.point[1],
      accuracy_m: input.accuracyM, building_name: input.buildingName } });
    return { id: rows[0].id, status: rows[0].status, createdAt: rows[0].created_at };
  } catch (e) { return wrap(e); }
}

/** Citizen: current status of a tip they sent. */
export async function tipStatus(id: string): Promise<{ id: string; status: TipStatus; createdAt: string } | null> {
  if (state.mode === "local") {
    const tip = readLocalDb().tips.find((t) => t.id === id);
    return tip ? { id, status: tip.status, createdAt: tip.createdAt } : null;
  }
  try {
    const rows = await rest<TipRow[]>(`police_tips?select=id,status,created_at&id=eq.${encodeURIComponent(id)}`);
    return rows[0] ? { id, status: rows[0].status, createdAt: rows[0].created_at } : null;
  } catch { return null; }
}

/** Police: moves a tip along the queue. */
export async function setTipStatus(id: string, status: TipStatus): Promise<void> {
  if (state.mode === "local") {
    mutateLocal((db) => { const t = db.tips.find((x) => x.id === id); if (t) t.status = status; });
    return;
  }
  try { await rest("rpc/set_tip_status", { method: "POST", body: { p_id: id, p_status: status } }); refreshAlerts(); } catch (e) { wrap(e); }
}

/** Asks the map to fly to an alarm (the banner's "Show on map"). */
export function focusAlert(alert: CampusAlert): void {
  window.dispatchEvent(new CustomEvent("cims:focus-alert", { detail: alert }));
}
