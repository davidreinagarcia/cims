/** @file Optional PostgREST access over fetch; failures leave the local bulletin usable. */
const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();
type Table = "bulletin_posts" | "bulletin_interest" | "bulletin_interest_counts";
let warned = false;

/** Enable the remote bulletin only when both public deployment settings are present. */
export function supabaseEnabled(): boolean { return Boolean(url && anonKey); }

async function request<T>(table: Table, method: string, params: Record<string, string>, body?: unknown): Promise<T[] | null> {
  if (!supabaseEnabled()) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${url}/rest/v1/${table}?${new URLSearchParams(params)}`, {
      method,
      headers: {
        apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json",
        Prefer: method === "POST" ? "return=representation,resolution=ignore-duplicates" : "return=minimal",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("PostgREST request failed");
    if (response.status === 204) return [];
    const result: unknown = await response.json();
    if (!Array.isArray(result)) throw new Error("Unexpected PostgREST response");
    return result as T[];
  } catch {
    if (!warned) { console.warn("Bulletin sync unavailable; local interests remain available."); warned = true; }
    return null;
  } finally { window.clearTimeout(timeout); }
}

/** Select rows with PostgREST query parameters, returning null on an unavailable backend. */
export function supabaseSelect<T>(table: Table, params: Record<string, string> = {}): Promise<T[] | null> {
  return request<T>(table, "GET", { select: "*", ...params });
}

/** Insert rows idempotently and return their representation, or null on failure. */
export function supabaseInsert<T>(table: "bulletin_posts" | "bulletin_interest", row: unknown): Promise<T[] | null> {
  return request<T>(table, "POST", {}, row);
}

/** Delete an interest using explicit post and account filters, returning null on failure. */
export function supabaseDelete(postId: string, accountId: string): Promise<unknown[] | null> {
  return request("bulletin_interest", "DELETE", { post_id: `eq.${postId}`, account_id: `eq.${accountId}` });
}
