/** @file Tiny Supabase client (REST + anonymous auth + Storage over fetch, no SDK) shared by the reports and stories adapters. */
/// <reference types="vite/client" />

/** Project URL. Public by design: Row Level Security, not secrecy, protects the data. */
const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://gcafbtzzkzagooxkinvw.supabase.co";
/** Anon (public) key. Never put the service-role key in the front end. */
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjYWZidHp6a3phZ29veGtpbnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3MTY3ODksImV4cCI6MjExMDI5Mjc4OX0.u9W6Zu6_9vAc_UnDSlL10tlrHNvgQ1IF_yTeZrmpAsc";

/** Project URL and anon key for the Realtime socket (same public values as above). */
export const SUPABASE_REALTIME = { url: URL_, anon: ANON };

/** The backend could not be reached (network, 5xx, sign-in failure): callers fall back to local mocks. */
export class BackendDown extends Error {}

/** Runs `run` on Supabase; only when the backend is unreachable does it serve `local` instead (rule rejections like "room already booked" still reach the user). */
export async function withFallback<T>(run: () => Promise<T>, local: () => Promise<T>): Promise<T> {
  try { return await run(); } catch (e) {
    if (!(e instanceof BackendDown)) throw e;
    console.warn("[cims] backend unavailable, using local data:", e.message);
    return local();
  }
}

const AUTH_KEY = "cims.supabase.auth.v1";
interface Auth { access_token: string; refresh_token: string; expires_at: number; user: { id: string; is_anonymous?: boolean; email?: string; app_metadata?: { role?: string } }; password?: string }

let auth: Auth | null = null;
let signing: Promise<Auth> | null = null;

function loadAuth(): Auth | null {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) ?? "null"); } catch { return null; }
}
function saveAuth(a: Auth) {
  auth = a;
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(a)); } catch { /* memory only */ }
}

async function authCall(path: string, body: unknown): Promise<Auth> {
  const res = await fetch(`${URL_}/auth/v1/${path}`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(body),
  }).catch((e) => { throw new BackendDown(String(e)); });
  if (!res.ok) throw new BackendDown(`auth ${res.status}`);
  const a = await res.json();
  saveAuth({ ...a, expires_at: a.expires_at ?? Math.floor(Date.now() / 1000) + (a.expires_in ?? 3600), password: auth?.password });
  return auth as Auth;
}

/** Signs in as one of the pre-created demo accounts (replaces the anonymous guest session in this browser). */
export async function signInWithPassword(email: string, password: string): Promise<Auth> {
  const a = await authCall("token?grant_type=password", { email, password });
  saveAuth({ ...a, password });
  return auth as Auth;
}

/** Forgets the chosen account; the next call creates a fresh anonymous guest session. */
export function signOutSupabase(): void {
  auth = null; signing = null;
  try { localStorage.removeItem(AUTH_KEY); } catch { /* nothing stored */ }
}

/** The account currently signed in (null for guests), read from the stored session without a network call. */
export function currentAccount(): { id: string; email: string; role: string } | null {
  const a = auth ?? loadAuth();
  if (!a || a.user.is_anonymous || !a.user.email) return null;
  return { id: a.user.id, email: a.user.email, role: a.user.app_metadata?.role ?? "student" };
}

/** Signed-in anonymous session for this browser (created once, refreshed when it is about to expire). */
export function session(): Promise<Auth> {
  signing ??= (async () => {
    auth ??= loadAuth();
    const now = Date.now() / 1000;
    if (auth && auth.expires_at - 60 > now) return auth;
    if (auth?.refresh_token) {
      try { return await authCall("token?grant_type=refresh_token", { refresh_token: auth.refresh_token }); } catch { /* sign in again */ }
    }
    if (auth?.user.email && auth.password) return signInWithPassword(auth.user.email, auth.password); // keep the chosen account
    return authCall("signup", {});
  })().finally(() => { signing = null; });
  return signing;
}

/** This browser's account id (auth.uid()). */
export async function accountId(): Promise<string> { return (await session()).user.id; }

/** PostgREST call. `path` starts with the table or `rpc/<fn>`; returns parsed JSON (or null for empty). */
export async function rest<T>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  const s = await session();
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: ANON, Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  }).catch((e) => { throw new BackendDown(String(e)); });
  if (!res.ok) {
    const text = await res.text();
    if (res.status >= 500 || res.status === 401) throw new BackendDown(`${res.status} ${text.slice(0, 120)}`);
    let message = text.slice(0, 200);
    try { message = JSON.parse(text).message ?? message; } catch { /* plain text */ }
    throw new Error(message); // a rule the server enforces (rate limit, double booking...): show it, do not fall back
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Uploads a blob under `<uid>/<uuid>.<ext>` in a public bucket and returns the object path. */
export async function upload(bucket: "stories" | "reports", blob: Blob, ext: string): Promise<string> {
  const s = await session();
  const path = `${s.user.id}/${crypto.randomUUID()}.${ext}`;
  const res = await fetch(`${URL_}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${s.access_token}`, "Content-Type": blob.type || "application/octet-stream" },
    body: blob,
  }).catch((e) => { throw new BackendDown(String(e)); });
  if (!res.ok) throw new BackendDown(`storage ${res.status}`);
  return path;
}

/** Public URL of an uploaded object. */
export function publicUrl(bucket: "stories" | "reports", path: string): string {
  return `${URL_}/storage/v1/object/public/${bucket}/${path}`;
}
