/** @file Stories adapter on Supabase: media in the public `stories` bucket, metadata in `stories`; falls back to the local adapter if the backend is down. */
import type { Session } from "../auth/types";
import { publicUrl, rest, upload } from "../lib/supabase";
import { localAdapter } from "./localAdapter";
import type { Capture, Story, StoriesAdapter } from "./types";

interface Row {
  id: string; account_id: string; author_name: string; kind: "photo" | "video"; media_path: string;
  lat: number; lng: number; accuracy: number; caption: string | null; created_at: string; expires_at: string;
}

const toStory = (r: Row): Story => ({
  id: r.id, accountId: r.account_id, authorName: r.author_name, kind: r.kind,
  mediaUrl: publicUrl("stories", r.media_path),
  createdAt: Date.parse(r.created_at), expiresAt: Date.parse(r.expires_at),
  lat: r.lat, lng: r.lng, accuracy: r.accuracy, caption: r.caption ?? undefined,
});

/** Shared stories via Supabase; the server sets timestamps, geofences the point and rate-limits (see supabase/migrations). */
export const supabaseStoriesAdapter: StoriesAdapter = {
  async list() {
    try {
      const rows = await rest<Row[]>(`stories?select=*&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc`);
      return rows.map(toStory);
    } catch (e) {
      console.warn("[cims] backend unavailable, using local stories:", e);
      return localAdapter.list();
    }
  },
  async add(author: Session, capture: Capture, caption) {
    try {
      const ext = capture.blob.type.includes("webm") ? "webm" : capture.blob.type.includes("mp4") ? "mp4" : capture.blob.type.includes("png") ? "png" : "jpg";
      const media_path = await upload("stories", capture.blob, ext);
      const rows = await rest<Row[]>("stories?select=*", {
        method: "POST", prefer: "return=representation",
        body: {
          author_name: author.displayName, kind: capture.kind, media_path,
          lat: capture.lat, lng: capture.lng, accuracy: Math.min(capture.accuracy, 200), caption: caption?.trim() || null,
        },
      });
      return toStory(rows[0]);
    } catch (e) {
      console.warn("[cims] backend unavailable, story kept on this device:", e);
      return localAdapter.add(author, capture, caption);
    }
  },
};
