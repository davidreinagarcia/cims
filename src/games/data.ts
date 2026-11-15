/** @file Static data of the Games mockup: team look, campus play area, capture zones taken from real curated places, and the pre-loaded lobby. */
import { places } from "../lib/places";
import type { LobbyGame, LngLat, TeamId, Zone } from "./types";

/** Zone and drop capture radius in meters. */
export const RADIUS_M = 25;
/** Points per second for every zone a team holds. */
export const ZONE_POINTS_PER_SECOND = 1;
/** Points for claiming one drop. */
export const DROP_POINTS = 100;
/** Drops placed per match. */
export const DROP_COUNT = 5;

/** Team names and map colors (red matches --route family, blue matches --navy family). */
export const TEAMS: Record<TeamId, { label: string; short: string; color: string }> = {
  red: { label: "Red Team", short: "Red", color: "#B42318" },
  blue: { label: "Blue Team", short: "Blue", color: "#1F5FA8" },
};
/** Fill color of an unclaimed zone. */
export const NEUTRAL = "#8A8470";

/** Where drops may spawn: the central part of campus ([west, south, east, north]), clear of the basemap edges. */
export const PLAY_AREA = { west: -84.4010, south: 33.7725, east: -84.3925, north: 33.7775 };
/** Where the guest player starts (Tech Green). */
export const START: LngLat = { lng: -84.397329, lat: 33.774662 };

/** Curated places (ids in src/data/places.json and pois/) used as capture zones. */
const ZONE_IDS = ["tech-tower", "clough", "student-center", "library", "tech-green", "bobby-dodd", "hive-makerspace", "innovation-ideation-studio"];

/** Capture zones at real campus places; ids missing from the data are skipped. */
export function zoneTemplates(): Zone[] {
  const zones: Zone[] = [];
  for (const id of ZONE_IDS) {
    const f = places.features.find((p) => p.properties.id === id);
    if (!f) continue;
    zones.push({ id, name: f.properties.name, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], owner: null });
  }
  return zones;
}

/** Pre-loaded matches shown in the lobby. */
export const SEED_LOBBY: LobbyGame[] = [
  { id: "seed-dom", name: "Campus Domination", mode: "zones", minutes: 10, players: 6, capacity: 10 },
  { id: "seed-sprint", name: "Checkpoint Sprint", mode: "drops", minutes: 5, players: 3, capacity: 8 },
  { id: "seed-night", name: "King of the Hill: Tech Green", mode: "zones", minutes: 15, players: 4, capacity: 8 },
];

/** Display name of a game mode. */
export const MODE_LABEL = { zones: "Zone Conquest", drops: "Drop Race" } as const;

/** Names for simulated players. */
export const BOT_NAMES = ["Buzz_Runner", "Ramblin_Rita", "NorthAve_Nico", "Yellow_Jacket", "Hive_Hannah", "Clough_Carl"];

/** One-line pitch of each mode, shown on the create screen. */
export const MODE_BLURB = { zones: "Capture campus zones and hold them: each one earns points every second.", drops: "Reach each drop before the other team: +100 when you claim it." } as const;
