/** @file Contracts for indoor data (Lane B): levels, rooms, booking metadata and availability. Data files in src/data/indoor/ follow these. */

/** What a room is used for. Drives its fill on the floor plan and its group in the directory. */
export type RoomType = "classroom" | "study" | "office" | "lab" | "restroom" | "circulation" | "other";

/** Things a room offers that people filter by in the room finder (F-11). */
export type RoomFeature = "whiteboard" | "display" | "outlets" | "accessible" | "quiet";

/** One floor of a building. */
export interface Level {
  /** Stable id inside the building, e.g. "1", "2", "basement". */
  id: string;
  /** Full label, e.g. "Level 2". */
  label: string;
  /** What the level button shows, e.g. "2", "B". */
  short: string;
  /** Sort key: higher floors have higher numbers. */
  order: number;
  /** True for the level people walk in on: the viewer opens here. */
  entrance?: boolean;
}

/** How a bookable room is reserved. Only on rooms where `bookable` is true. */
export interface RoomBooking {
  /** The system that owns the room's calendar, e.g. "EMS". */
  owner_system: string;
  /** One line: who can book, for how long, how far ahead. */
  policy: string;
  /** Deep link to book it in the owning system. */
  book_url: string;
}

/** One room. Every record needs provenance; geometry is optional until a floor plan is digitized. */
export interface Room {
  /** Stable id inside the building, normally the room number in lower case. */
  id: string;
  /** Room number as posted on the door, e.g. "210". */
  number: string;
  /** Published name, e.g. "Classroom". */
  name: string;
  type: RoomType;
  /** Level id, or null when no source states the floor (never guess it from the number). */
  level: string | null;
  capacity?: number;
  features?: RoomFeature[];
  bookable?: boolean;
  booking?: RoomBooking;
  /** Outline in plan units ([x, y] pairs, y down, inside IndoorBuilding.plan). Missing = listed in the directory only. */
  polygon?: [number, number][];
  source_url: string;
  verified_at: string | null;
  verified_by: string | null;
}

/** Everything the indoor viewer needs for one building. */
export interface IndoorBuilding {
  /** Id of the building in src/data/buildings.geojson. */
  building_id: string;
  name: string;
  /** True for invented fixtures: the viewer labels them "Demo layout" everywhere. */
  demo: boolean;
  /** Size of the plan coordinate space the room polygons live in. */
  plan: { width: number; height: number };
  levels: Level[];
  rooms: Room[];
}

/** A stretch of time when a room is taken. Times are ISO 8601 with offset. */
export interface AvailabilitySlot {
  /** "<building_id>/<room id>". */
  room: string;
  start: string;
  end: string;
}

/** Selection id of a room: "<building_id>/<room id>" (Selection kind "room"). */
export function roomSelectionId(buildingId: string, roomId: string): string {
  return `${buildingId}/${roomId}`;
}
