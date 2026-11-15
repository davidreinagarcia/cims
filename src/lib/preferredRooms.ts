/** @file Preferred ("favorite") rooms contracts (T-60) and the one place that picks the backend adapter. */
import { createLocalPreferredRoomsService } from "./preferredRooms.mock";

/** One room an account heart-favorited, for the "Preferred rooms" shortcut (T-60). */
export interface PreferredRoom {
  /** Selection id ("buildingId:spaceId"), matching `indoor/registry.ts#indoorRooms()`. */
  room: string;
  buildingId: string;
  /** Display label captured at favorite time (see `indoor/availability.ts#favoriteRoomsFrom`). */
  roomLabel: string;
  accountId: string;
  createdAt: string;
}

/** What the heart toggle submits to favorite a room. */
export interface NewPreferredRoom {
  room: string;
  buildingId: string;
  roomLabel: string;
}

/** Backend contract for favorites. Implemented by the localStorage mock today (ADR-0005 still open). */
export interface PreferredRoomsService {
  /** This account's favorited rooms, newest first. */
  list(accountId: string): Promise<PreferredRoom[]>;
  /** Favorites a room; a second call for the same room is a no-op (not a duplicate). */
  add(input: NewPreferredRoom, accountId: string): Promise<PreferredRoom>;
  /** Un-favorites a room; a no-op if it wasn't favorited. */
  remove(room: string, accountId: string): Promise<void>;
}

/** The favorites backend used by the app. Swap the adapter here (and only here) when ADR-0005 is decided. */
export const preferredRoomsService: PreferredRoomsService = createLocalPreferredRoomsService();
