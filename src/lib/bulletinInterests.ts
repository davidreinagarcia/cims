/** @file Bulletin "Interested" marks on Supabase (shared counts, one mark per account and post); localStorage only when the backend is unreachable. */
import { readLocal, writeLocal } from "./localStore";
import { accountId, rest, withFallback } from "./supabase";

const KEY = "cims.bulletin.interests.v1";

/** This browser's marked post ids plus how many people marked each post. */
export interface InterestState { mine: Set<string>; counts: Record<string, number> }

const localMine = () => new Set(readLocal<string[]>(KEY, []).filter((id) => typeof id === "string"));

/** Loads every mark (public counts) and this account's own. */
export function loadInterests(): Promise<InterestState> {
  return withFallback(async () => {
    const [uid, rows] = await Promise.all([accountId(), rest<{ post_id: string; account_id: string }[]>("bulletin_interests?select=post_id,account_id")]);
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    for (const r of rows) { counts[r.post_id] = (counts[r.post_id] ?? 0) + 1; if (r.account_id === uid) mine.add(r.post_id); }
    return { mine, counts };
  }, async () => ({ mine: localMine(), counts: {} }));
}

/** Marks or unmarks one post as interesting for this account. */
export function setInterest(postId: string, on: boolean): Promise<void> {
  return withFallback(async () => {
    if (on) await rest("bulletin_interests?on_conflict=post_id,account_id", { method: "POST", prefer: "resolution=ignore-duplicates,return=minimal", body: { post_id: postId } });
    else await rest(`bulletin_interests?post_id=eq.${encodeURIComponent(postId)}&account_id=eq.${await accountId()}`, { method: "DELETE", prefer: "return=minimal" });
  }, async () => {
    const next = localMine();
    if (on) next.add(postId); else next.delete(postId);
    writeLocal(KEY, [...next]);
  });
}
