/** @file Instant local interests with optional account sync, offline retries and public counts. */
import { useEffect, useRef, useState } from "react";
import { supabaseDelete, supabaseEnabled, supabaseInsert, supabaseSelect } from "../../lib/supabase";

const LOCAL_KEY = "cims.bulletin.interests.v1";
type Mirror = { key: string; selected: Set<string>; pending: Record<string, boolean> };

function readMirror(key: string): Mirror {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? "[]");
    const ids: unknown = Array.isArray(data) ? data : data.selected;
    const pending = Object.fromEntries(Object.entries(data.pending ?? {}).filter(([, value]) => typeof value === "boolean")) as Record<string, boolean>;
    return { key, selected: new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []), pending };
  } catch { return { key, selected: new Set(), pending: {} }; }
}

/** Keep interests usable locally and sync only when an optional demo account is present. */
export function useBulletinInterest(accountId?: string) {
  const enabled = supabaseEnabled();
  const key = enabled && accountId ? `${LOCAL_KEY}.account.${accountId}` : LOCAL_KEY;
  const [mirror, setMirror] = useState(() => readMirror(key));
  const current = useRef(mirror);
  const sync = useRef(() => {});
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [notice, setNotice] = useState("");

  const save = (next: Mirror) => {
    current.current = next;
    setMirror(next);
    try {
      localStorage.setItem(next.key, JSON.stringify(next.key === LOCAL_KEY ? [...next.selected]
        : { selected: [...next.selected], pending: next.pending }));
    } catch { setNotice("Interests are available for this visit. This browser could not save them on this device."); }
  };

  useEffect(() => {
    let active = true, busy = false, ready = !accountId;
    current.current = readMirror(key);
    setMirror(current.current);
    setNotice("");

    const refreshCounts = async () => {
      if (!enabled) return;
      const rows = await supabaseSelect<{ post_id: string; count: number }>("bulletin_interest_counts");
      if (active && rows) setCounts(Object.fromEntries(rows.map((row) => [row.post_id, Number(row.count)])));
    };
    const flush = async () => {
      if (!enabled || !accountId || busy || !ready || !active) return;
      busy = true;
      let failed = false;
      try {
        while (active) {
          const entry = Object.entries(current.current.pending)[0];
          if (!entry) break;
          const [postId, interested] = entry;
          const result = interested
            ? await supabaseInsert("bulletin_interest", { post_id: postId, account_id: accountId })
            : await supabaseDelete(postId, accountId);
          if (!active || result === null) { failed = true; break; }
          const latest = current.current;
          if (latest.pending[postId] === interested) {
            const pending = { ...latest.pending };
            delete pending[postId];
            save({ ...latest, pending });
          }
        }
        await refreshCounts();
      } finally {
        busy = false;
        if (active && !failed && Object.keys(current.current.pending).length) void flush();
      }
    };
    sync.current = () => { void flush(); };
    const reconnect = () => { void refreshCounts(); void flush(); };
    window.addEventListener("online", reconnect);
    void refreshCounts();
    if (enabled && accountId) void (async () => {
      const rows = await supabaseSelect<{ post_id: string }>("bulletin_interest", {
        select: "post_id", account_id: `eq.${accountId}`,
      });
      if (!active) return;
      if (rows) {
        const latest = current.current;
        const selected = new Set(rows.map((row) => row.post_id));
        for (const [id, value] of Object.entries(latest.pending)) {
          if (value) selected.add(id); else selected.delete(id);
        }
        save({ ...latest, selected });
      }
      ready = true;
      void flush();
    })();
    return () => { active = false; window.removeEventListener("online", reconnect); };
  }, [key, accountId, enabled]);

  const toggle = (id: string) => {
    const latest = current.current.key === key ? current.current : readMirror(key);
    const selected = new Set(latest.selected);
    const interested = !selected.has(id);
    if (interested) selected.add(id); else selected.delete(id);
    save({ key, selected, pending: enabled && accountId ? { ...latest.pending, [id]: interested } : {} });
    sync.current();
  };
  return { interests: mirror.key === key ? mirror.selected : readMirror(key).selected, toggle, counts, notice };
}
