/** @file Types for the Games mockup: teams, modes, players, zones, drops and the lobby/match state. */

/** The two teams of every match. */
export type TeamId = "red" | "blue";
/** Game modes: King of the Hill zones or a race for random drops. */
export type GameMode = "zones" | "drops";
/** Where a point lives on the map. */
export interface LngLat { lng: number; lat: number }

/** Guest profile kept in localStorage (there are no accounts yet). */
export interface Profile { nickname: string; team: TeamId }

/** A match listed in the lobby. */
export interface LobbyGame { id: string; name: string; mode: GameMode; minutes: number; players: number; capacity: number; mine?: boolean }

/** A capture zone (Conquest mode). `owner` is null while neutral. */
export interface Zone extends LngLat { id: string; name: string; owner: TeamId | null }
/** A drop target (Drop Race mode). `claimedBy` is the nickname of whoever got it. */
export interface Drop extends LngLat { id: string; claimedBy: string | null; team: TeamId | null }
/** A simulated player moving on the map. */
export interface Bot extends LngLat { id: string; nickname: string; team: TeamId; target: LngLat | null; points: number }

/** A running (or finished) match. Times are in whole seconds. */
export interface ActiveGame {
  id: string; name: string; mode: GameMode; capacity: number; listedPlayers: number;
  secondsLeft: number; finished: boolean;
  zones: Zone[]; drops: Drop[]; bots: Bot[];
  scores: Record<TeamId, number>; playerPoints: number;
  /** Last few things that happened, newest first. */
  feed: string[];
}
