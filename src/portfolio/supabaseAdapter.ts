/** @file BuzzPrint adapter on Supabase: entries in `portfolio_entries`, photos in the `portfolio` bucket; falls back to this browser's storage if the backend is down. */
import { publicUrl, rest, upload, withFallback } from "../lib/supabase";
import type { PostType } from "../lib/bulletin";
import { localAdapter } from "./localAdapter";
import type { PortfolioAdapter, PortfolioEntry } from "./types";

interface PhotoRow { id: string; media_path: string; added_at: string }
interface Row {
  id: string; account_id: string; post_id: string; post_title: string; post_type: string; org: string | null;
  start_at: string | null; end_at: string | null; when_label: string; poster_data: string | null;
  place_id: string | null; place_kind: "place" | "building" | "room" | null; place_name: string | null;
  saved_at: string; portfolio_photos?: PhotoRow[];
}

const SELECT = "portfolio_entries?select=*,portfolio_photos(id,media_path,added_at)";
const ms = (iso: string | null) => (iso ? Date.parse(iso) : undefined);

const toEntry = (r: Row): PortfolioEntry => ({
  id: r.id, accountId: r.account_id, postId: r.post_id, postTitle: r.post_title, postType: r.post_type as PostType,
  org: r.org ?? undefined, startAt: ms(r.start_at), endAt: ms(r.end_at), when: r.when_label,
  posterUrl: r.poster_data ?? undefined, placeId: r.place_id ?? undefined, placeKind: r.place_kind ?? undefined,
  placeName: r.place_name ?? undefined, savedAt: Date.parse(r.saved_at),
  // `dataUrl` holds the public URL of the stored file here; the UI only ever uses it as an <img> src.
  photos: (r.portfolio_photos ?? []).map((p) => ({ id: p.id, dataUrl: publicUrl("portfolio", p.media_path), addedAt: Date.parse(p.added_at) }))
    .sort((a, b) => a.addedAt - b.addedAt),
});

/** BuzzPrint on Supabase: private per account (RLS), one entry per post, photos as files instead of base64 in localStorage. */
export const supabasePortfolioAdapter: PortfolioAdapter = {
  async list(accountId) {
    return withFallback(async () => {
      const rows = await rest<Row[]>(`${SELECT}&order=saved_at.desc`);
      return rows.map(toEntry);
    }, () => localAdapter.list(accountId));
  },
  async add(accountId, seed) {
    return withFallback(async () => {
      const rows = await rest<Row[]>(`${SELECT}&post_id=eq.${encodeURIComponent(seed.postId)}`);
      if (rows[0]) return toEntry(rows[0]); // already saved: keep the original snapshot
      const created = await rest<Row[]>(SELECT, {
        method: "POST", prefer: "return=representation",
        body: {
          post_id: seed.postId, post_title: seed.postTitle, post_type: seed.postType, org: seed.org ?? null,
          start_at: seed.startAt ? new Date(seed.startAt).toISOString() : null, end_at: seed.endAt ? new Date(seed.endAt).toISOString() : null,
          when_label: seed.when, poster_data: seed.posterUrl?.startsWith("data:image/") ? seed.posterUrl : null,
          place_id: seed.placeId ?? null, place_kind: seed.placeKind ?? null, place_name: seed.placeName ?? null,
        },
      });
      return toEntry(created[0]);
    }, () => localAdapter.add(accountId, seed));
  },
  async addPhoto(accountId, entryId, photo) {
    return withFallback(async () => {
      const blob = await (await fetch(photo.dataUrl)).blob();
      const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      const media_path = await upload("portfolio", blob, ext);
      await rest("portfolio_photos", { method: "POST", body: { entry_id: entryId, media_path } });
      const rows = await rest<Row[]>(`${SELECT}&id=eq.${encodeURIComponent(entryId)}`);
      return rows[0] ? toEntry(rows[0]) : null;
    }, () => localAdapter.addPhoto(accountId, entryId, photo));
  },
};
