/** @file Story contracts: what a story is, and the adapter boundary a real backend (ADR-0005) will implement. */
import type { Session } from "../auth/types";

/** A story is either a photo or a short clip, always captured live in the app. */
export type StoryKind = "photo" | "video";

/** One story, already resolved to something an <img>/<video> can show. */
export interface Story {
  id: string;
  accountId: string;
  authorName: string;
  kind: StoryKind;
  /** Object URL (local adapter), data URL (demo seeds) or CDN URL (future backend). */
  mediaUrl: string;
  /** Epoch ms when it was captured. */
  createdAt: number;
  /** Epoch ms after which it is gone (24 h after capture). */
  expiresAt: number;
  lat: number;
  lng: number;
  /** GPS accuracy radius in meters reported by the device at capture time. */
  accuracy: number;
  caption?: string;
  /** True for the fictional seed stories that make the heat map and viewer demo-able. */
  demo?: boolean;
}

/** What the camera hands over: the media, captured moments ago, plus the GPS fix taken at that instant. */
export interface Capture {
  blob: Blob;
  kind: StoryKind;
  capturedAt: number;
  lat: number;
  lng: number;
  accuracy: number;
}

/** Storage boundary. The local adapter keeps stories in this browser; a Supabase adapter would sit behind the same two calls. */
export interface StoriesAdapter {
  /** Every live (unexpired) story. */
  list(): Promise<Story[]>;
  /** Persist a story for a signed-in account and return it. */
  add(author: Session, capture: Capture, caption?: string): Promise<Story>;
}
