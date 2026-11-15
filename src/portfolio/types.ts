/** @file BuzzPrint (portfolio) contracts: a permanent record of a Bulletin post you were interested in, plus photos you add later. */
import type { PostType } from "../lib/bulletin";

/** One photo attached to a portfolio entry, kept as a data URL so it survives a page reload without a backend. */
export interface PortfolioPhoto {
  id: string;
  /** Base64 data URL. Never an object URL (blob:) — those are revoked and do not survive a reload. */
  dataUrl: string;
  addedAt: number;
}

/** What the UI hands the adapter to attach one photo; the adapter assigns the id. */
export type PortfolioPhotoSeed = Omit<PortfolioPhoto, "id">;

/**
 * One activity in a signed-in account's BuzzPrint: a frozen snapshot of a Bulletin post, taken the moment
 * "Interested" was first clicked on it. Later edits to (or removal of) the source post never change this
 * record — it is a history of what you engaged with, not a live mirror of the post or of your current
 * interest list (un-marking "Interested" does not delete it).
 */
export interface PortfolioEntry {
  id: string;
  accountId: string;
  /** The source post's id, title and type, as they were at save time — never a live reference. */
  postId: string;
  postTitle: string;
  postType: PostType;
  org?: string;
  /** Event start/end in epoch ms, snapshotted from the post; used to render day + time and to group entries. */
  startAt?: number;
  endAt?: number;
  /** The post's already-formatted `when` label at save time, kept as a fallback if start/end are ever missing. */
  when: string;
  /** Where: the post's place name at save time. */
  placeName?: string;
  /** When this entry was recorded (epoch ms) — i.e. when "Interested" was first clicked. */
  savedAt: number;
  photos: PortfolioPhoto[];
}

/** What the Bulletin hook hands the adapter to create one entry; the adapter assigns id/accountId/photos. */
export type PortfolioEntrySeed = Omit<PortfolioEntry, "id" | "accountId" | "photos">;

/** Storage boundary. The local adapter keeps entries in this browser; a Supabase adapter would sit behind the same three calls. */
export interface PortfolioAdapter {
  /** Every entry saved by this account, newest first. */
  list(accountId: string): Promise<PortfolioEntry[]>;
  /** Create (or, if this post was already saved by this account, return) the entry for this post. */
  add(accountId: string, seed: PortfolioEntrySeed): Promise<PortfolioEntry>;
  /** Attach a photo to an existing entry; null if no such entry exists for this account. */
  addPhoto(accountId: string, entryId: string, photo: PortfolioPhotoSeed): Promise<PortfolioEntry | null>;
}
