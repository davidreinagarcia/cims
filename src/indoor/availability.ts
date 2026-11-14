/** @file Pure room availability queries and campus-local expansion of fictional weekly slots. */
import { campusDay } from "../lib/hours";
import { roomSelectionId } from "./types";
import type { AvailabilitySlot, IndoorBuilding, Room, RoomFeature } from "./types";

/** A half-open interval of instants: start is included and end is excluded. */
export interface TimeWindow { start: Date; end: Date }

/** Filters for bookable rooms available throughout a time window. */
export interface RoomQuery {
  window: TimeWindow;
  minCapacity?: number;
  features?: RoomFeature[];
  buildingId?: string;
}

/** A matching room together with its building for selection and display. */
export interface FreeRoom { building: IndoorBuilding; room: Room }

/** A fictional same-day booking recurring at campus-local HH:MM times. */
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

/** Finds free bookable rooms satisfying every filter, sorted by building name then room number. */
export function findFreeRooms(buildings: IndoorBuilding[], slots: AvailabilitySlot[], query: RoomQuery): FreeRoom[] {
  if (!validWindow(query.window)) return [];
  return buildings.flatMap((building) => {
    if (query.buildingId !== undefined && building.building_id !== query.buildingId) return [];
    return building.rooms.filter((room) => room.bookable === true
      && (query.minCapacity === undefined || (room.capacity !== undefined && room.capacity >= query.minCapacity))
      && (query.features ?? []).every((feature) => room.features?.includes(feature))
      && isRoomFree(roomSelectionId(building.building_id, room.id), slots, query.window))
      .map((room) => ({ building, room }));
  }).sort((a, b) => a.building.name.localeCompare(b.building.name)
    || a.room.number.localeCompare(b.room.number, "en", { numeric: true }));
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
