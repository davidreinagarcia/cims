/** @file Pure room-finder queries (F-11) and campus-local expansion of fictional weekly demo slots. */
import { campusDay } from "../lib/hours";
import type { IndoorRoom } from "./registry";
import type { AvailabilitySlot, IndoorLevel, RoomAmenities, RoomFeature } from "./types";

/**
 * A routable (schematic) entry from `registry.ts#indoorRooms`, narrowed from the `IndoorRoom`
 * union. The room finder only ever matches these: its demo amenities/availability seed
 * (`roomFinderDemo.ts`) covers Kendeda's drawn spaces, not published facts without geometry
 * (e.g. CULC's `routable: false` rooms), so there is nothing to show -- or filter by capacity or
 * features -- for those. `findFreeRooms` below drops non-routable entries before touching `.space`.
 */
export type RoutableIndoorRoom = Extract<IndoorRoom, { routable: true }> & { level: IndoorLevel };

/** True for a schematic entry with a resolved level; false (including by construction) for published facts. */
function isRoutable(room: IndoorRoom): room is RoutableIndoorRoom {
  return room.routable && room.level !== undefined;
}

/** A room with bookable demo amenities (T-60 reservations), with a ready-to-render display label. */
export interface BookableRoom { id: string; buildingId: string; label: string; amenities: RoomAmenities }

/** Every bookable room in one building (its plain space/room name as the label), sorted alphabetically. */
export function bookableRoomsFor(rooms: IndoorRoom[], amenitiesById: AmenitiesById, buildingId: string): BookableRoom[] {
  return rooms
    .filter((room) => room.building.building_id === buildingId)
    .flatMap((room) => {
      const amenities = amenitiesById.get(room.id);
      return amenities?.bookable ? [{ id: room.id, buildingId, label: room.space.name, amenities }] : [];
    })
    .sort((a, b) => a.label.localeCompare(b.label, "en", { numeric: true }));
}

/** "Kendeda" / "CULC" for a compact cross-building row; falls back to the full title minus a leading "The ". */
function shortBuildingTitle(building: IndoorRoom["building"]): string {
  if (building.building_id === "kendeda-building-for-innovative-sustainable-design") return "Kendeda";
  if (building.building_id === "g-wayne-clough-undergraduate-learning-commons") return "CULC";
  return building.title.replace(/^The /, "");
}

/**
 * Bookable rooms in `roomIds` across every building, labeled "Building · Room N" using each
 * room's real published number when it has one (CULC), or its plain space name when it doesn't
 * (Kendeda's schematic has no room numbers yet, T-20) -- never an invented number. For the
 * favorites/"Preferred rooms" view (T-60), which can mix rooms from both buildings.
 */
export function favoriteRoomsFrom(rooms: IndoorRoom[], amenitiesById: AmenitiesById, roomIds: ReadonlySet<string>): BookableRoom[] {
  return rooms
    .flatMap((room) => {
      if (!roomIds.has(room.id)) return [];
      const amenities = amenitiesById.get(room.id);
      if (!amenities?.bookable) return [];
      const number = room.space.room;
      const label = `${shortBuildingTitle(room.building)} · ${number ? `Room ${number}` : room.space.name}`;
      return [{ id: room.id, buildingId: room.building.building_id, label, amenities }];
    })
    .sort((a, b) => a.label.localeCompare(b.label, "en", { numeric: true }));
}

/**
 * Every bookable room across every building, labeled "Building · Room" exactly like
 * {@link favoriteRoomsFrom} -- just unfiltered, since "Rooms near me" (T-61) sorts by distance
 * instead of by favorite status and has no room-id set to filter by.
 */
export function crossBuildingBookableRooms(rooms: IndoorRoom[], amenitiesById: AmenitiesById): BookableRoom[] {
  return favoriteRoomsFrom(rooms, amenitiesById, new Set(rooms.map((room) => room.id)));
}

/** A half-open interval of instants: start is included and end is excluded. */
export interface TimeWindow { start: Date; end: Date }

/** Filters for bookable rooms available throughout a time window. */
export interface RoomQuery {
  window: TimeWindow;
  minCapacity?: number;
  features?: RoomFeature[];
  buildingId?: string;
}

/** A matching room together with its demo amenities, ready for the results list and selection. */
export interface FreeRoom extends RoutableIndoorRoom { amenities: RoomAmenities }

/** Demo amenities keyed by room selection id, e.g. `roomFinderDemo.ts#roomAmenitiesById`. */
export type AmenitiesById = Map<string, RoomAmenities>;

/** A fictional weekly booking recurring at campus-local HH:MM times. */
export interface DemoSlotPattern {
  room: string;
  weekday: ReturnType<typeof campusDay>;
  start: string;
  end: string;
}

function validWindow(window: TimeWindow): boolean {
  return Number.isFinite(window.start.getTime()) && Number.isFinite(window.end.getTime())
    && window.end > window.start;
}

function slotTimes(slot: AvailabilitySlot): [number, number] | null {
  const start = Date.parse(slot.start);
  const end = Date.parse(slot.end);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? [start, end] : null;
}

/** Whether a room has no overlapping valid slot; invalid windows return false. */
export function isRoomFree(id: string, slots: AvailabilitySlot[], window: TimeWindow): boolean {
  if (!validWindow(window)) return false;
  return !slots.some((slot) => {
    if (slot.room !== id) return false;
    const times = slotTimes(slot);
    return times !== null && times[0] < window.end.getTime() && times[1] > window.start.getTime();
  });
}

/**
 * Finds free bookable rooms satisfying every filter, sorted by building title then room name.
 * `rooms` is normally `registry.ts#indoorRooms()`, which now also lists published room facts
 * without geometry (`routable: false`, e.g. CULC) -- those are dropped before any other check,
 * since the demo amenities/availability seed never covers them. `amenitiesById` keys demo
 * metadata by selection id; a room without an amenities entry, or with `bookable` false, never matches.
 */
export function findFreeRooms(rooms: IndoorRoom[], amenitiesById: AmenitiesById, slots: AvailabilitySlot[], query: RoomQuery): FreeRoom[] {
  if (!validWindow(query.window)) return [];
  return rooms.flatMap((entry) => {
    if (!isRoutable(entry)) return [];
    const room = entry;
    if (query.buildingId !== undefined && room.building.building_id !== query.buildingId) return [];
    const amenities = amenitiesById.get(room.id);
    if (!amenities?.bookable) return [];
    if (query.minCapacity !== undefined && (amenities.capacity === undefined || amenities.capacity < query.minCapacity)) return [];
    if (!(query.features ?? []).every((feature) => amenities.features?.includes(feature))) return [];
    return isRoomFree(room.id, slots, query.window) ? [{ ...room, amenities }] : [];
  }).sort((a, b) => a.building.title.localeCompare(b.building.title)
    || a.space.name.localeCompare(b.space.name, "en", { numeric: true })
    || a.id.localeCompare(b.id)); // final tiebreak: two spaces can share a name (e.g. two "Classroom"s)
}

/** Returns the earliest valid slot start strictly after from, ignoring ongoing slots, or null. */
export function freeUntil(id: string, slots: AvailabilitySlot[], from: Date): Date | null {
  if (!Number.isFinite(from.getTime())) return null;
  let next = Infinity;
  for (const slot of slots) {
    if (slot.room !== id) continue;
    const times = slotTimes(slot);
    if (times && times[0] > from.getTime()) next = Math.min(next, times[0]);
  }
  return Number.isFinite(next) ? new Date(next) : null;
}

/** Creates an elapsed-time availability window without changing the supplied instant. */
export function nowWindow(now: Date, minutes = 30): TimeWindow {
  return { start: new Date(now.getTime()), end: new Date(now.getTime() + minutes * 60_000) };
}

const localClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function localFields(date: Date): number[] {
  const parts = localClock.formatToParts(date);
  return ["year", "month", "day", "hour", "minute", "second"]
    .map((type) => Number(parts.find((part) => part.type === type)!.value));
}

function wallTimeToInstant(date: number[], time: string): Date | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(date[0], date[1] - 1, date[2], hour, minute);
  const matches: number[] = [];
  // Sample both sides of a DST transition rather than reusing the offset of `day`.
  for (const delta of [-86_400_000, 0, 86_400_000]) {
    const sample = target + delta;
    const fields = localFields(new Date(sample));
    const offset = Date.UTC(fields[0], fields[1] - 1, fields[2], fields[3], fields[4], fields[5]) - sample;
    const candidate = target - offset;
    const actual = localFields(new Date(candidate));
    if (actual[0] === date[0] && actual[1] === date[1] && actual[2] === date[2]
      && actual[3] === hour && actual[4] === minute) matches.push(candidate);
  }
  // A nonexistent spring time is skipped; an ambiguous fall time uses its first occurrence.
  return matches.length ? new Date(Math.min(...matches)) : null;
}

/** Converts a campus-local "HH:MM" time on the same campus day as `now` to an instant, or null if invalid. */
export function campusTimeToday(now: Date, time: string): Date | null {
  if (!Number.isFinite(now.getTime())) return null;
  return wallTimeToInstant(localFields(now), time);
}

/** Expands weekly patterns for one campus-local day, skipping invalid or nonexistent DST times. */
export function expandDemoSlots(pattern: DemoSlotPattern[], day: Date): AvailabilitySlot[] {
  if (!Number.isFinite(day.getTime())) return [];
  const weekday = campusDay(day);
  const date = localFields(day);
  return pattern.flatMap((slot) => {
    if (slot.weekday !== weekday) return [];
    const start = wallTimeToInstant(date, slot.start);
    const end = wallTimeToInstant(date, slot.end);
    if (!start || !end || end <= start) return [];
    return [{ room: slot.room, start: start.toISOString(), end: end.toISOString() }];
  });
}
