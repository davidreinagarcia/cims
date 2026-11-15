#!/usr/bin/env node
/** @file Dependency-free checks of the room-finder engine (T-24): boundaries, filters, DST and demo-seed coverage. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

// Native Node type stripping supports the TS source; resolve its bundler-style local imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
const { isRoomFree, findFreeRooms, freeUntil, nowWindow, expandDemoSlots, campusTimeToday } =
  await import("../src/indoor/availability.ts");

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const kendeda = readJson("../src/data/indoor/kendeda.json");
const demo = readJson("../src/data/mocks/kendeda-room-finder-demo.json");
const date = (value) => new Date(value);
const window = (start, end) => ({ start: date(start), end: date(end) });

// ---------- demo seed matches the real Kendeda building (no invented room ids) ----------
assert.equal(demo.demo, true);
assert.match(demo._note, /FICTIONAL demo data/);
const buildingId = kendeda.building_id;
const spaceById = new Map();
for (const level of kendeda.levels) {
  if (!level.available) continue;
  for (const space of level.spaces) spaceById.set(space.id, { level, space });
}
assert.ok(demo.amenities.length > 0);
for (const amenities of demo.amenities) {
  const [bId, spaceId] = amenities.room.split(":");
  assert.equal(bId, buildingId, `amenities room id uses the real Kendeda building id (${amenities.room})`);
  assert.ok(spaceById.has(spaceId), `amenities references an existing Kendeda space (${amenities.room})`);
  assert.equal(amenities.bookable, true, "every seeded amenities entry is bookable (non-bookable rooms have no entry)");
}
const amenitiesById = new Map(demo.amenities.map((item) => [item.room, item]));
for (const pattern of demo.slots) {
  assert.ok(amenitiesById.has(pattern.room), "seed references an existing bookable demo room");
  assert.match(pattern.weekday, /^(mon|tue|wed|thu|fri|sat|sun)$/);
  assert.match(pattern.start, /^([01]\d|2[0-3]):[0-5]\d$/);
  assert.match(pattern.end, /^([01]\d|2[0-3]):[0-5]\d$/);
  assert.ok(pattern.end > pattern.start, `slot end after start (${pattern.room} ${pattern.weekday})`);
}

// Minimal IndoorRoomEntry-shaped fixtures for the four seeded rooms, built from the real schematic
// (not duplicated by hand), so findFreeRooms is exercised against the actual building + demo seed.
const building = { building_id: buildingId, title: kendeda.title };
const rooms = demo.amenities.map(({ room }) => {
  const spaceId = room.slice(buildingId.length + 1);
  const { level, space } = spaceById.get(spaceId);
  return { id: room, building, level: { id: level.id, name: level.name, label: level.label }, space };
});
const [classroom1, classroom2, breakoutStudy, auditorium] = [
  "classroom-1", "classroom-2", "breakout-study", "auditorium",
].map((spaceId) => `${buildingId}:${spaceId}`);

// ---------- isRoomFree: interval boundaries and malformed input ----------
const id = classroom1;
const occupied = [{ room: id, start: "2026-11-16T10:00:00-05:00", end: "2026-11-16T11:00:00-05:00" }];
const before = window("2026-11-16T09:00:00-05:00", "2026-11-16T10:00:00-05:00");
const during = window("2026-11-16T10:15:00-05:00", "2026-11-16T10:45:00-05:00");
assert.equal(isRoomFree(id, occupied, before), true, "touching start is free");
assert.equal(isRoomFree(id, occupied, window("2026-11-16T11:00:00-05:00", "2026-11-16T12:00:00-05:00")), true, "touching end is free");
assert.equal(isRoomFree(id, occupied, during), false, "contained query overlaps");
assert.equal(isRoomFree(id, occupied, window("2026-11-16T09:59:00-05:00", "2026-11-16T11:01:00-05:00")), false, "containing query overlaps");
assert.equal(isRoomFree(id, occupied, window("2026-11-16T09:59:00-05:00", "2026-11-16T10:01:00-05:00")), false, "partial overlap");
assert.equal(isRoomFree(classroom2, occupied, during), true, "slots belong to one room");
const invalid = [
  { room: id, start: "invalid", end: occupied[0].end }, { room: id, start: occupied[0].start, end: "invalid" },
  { room: id, start: occupied[0].end, end: occupied[0].start }, { room: id, start: occupied[0].start, end: occupied[0].start },
];
assert.equal(isRoomFree(id, invalid, during), true, "malformed and nonpositive slots are ignored");
assert.equal(isRoomFree(id, [...invalid, ...occupied], during), false);
for (const invalidWindow of [
  { start: during.end, end: during.start }, { start: during.start, end: during.start },
  { start: new Date(NaN), end: during.end }, { start: during.start, end: new Date(NaN) },
]) {
  assert.deepEqual(findFreeRooms(rooms, amenitiesById, [], { window: invalidWindow }), []);
  assert.equal(isRoomFree(id, [], invalidWindow), false);
}

// ---------- findFreeRooms: filters, sorting, missing metadata ----------
const saturday = window("2026-11-21T10:00:00-05:00", "2026-11-21T10:30:00-05:00"); // no seeded slot touches Saturday
assert.equal(findFreeRooms(rooms, amenitiesById, [], { window: saturday }).length, 4, "all four seeded rooms are bookable and free");
// Sort order is building title, then room name ("Auditorium" < "Breakout..." < "Classroom"), then id as a tiebreak.
assert.deepEqual(findFreeRooms(rooms, amenitiesById, [], { window: saturday, minCapacity: 10 }).map((r) => r.id), [auditorium, classroom1, classroom2]);
assert.deepEqual(findFreeRooms(rooms, amenitiesById, [], { window: saturday, features: ["whiteboard", "outlets"] }).map((r) => r.id), [breakoutStudy, classroom1, classroom2]);
assert.deepEqual(findFreeRooms(rooms, amenitiesById, [], { window: saturday, features: ["whiteboard", "quiet"] }).map((r) => r.id), [breakoutStudy]);
assert.deepEqual(findFreeRooms(rooms, amenitiesById, [], { window: saturday, features: ["accessible", "quiet"] }), [], "all requested features required");
assert.deepEqual(findFreeRooms(rooms, amenitiesById, [], { window: saturday, buildingId: "other" }), []);
assert.equal(findFreeRooms(rooms, amenitiesById, [], { window: saturday, buildingId, features: [] }).length, 4);
// Monday morning: classroom-1 is in its seeded class block, the other three stay free.
const mondayClass = window("2026-11-16T09:30:00-05:00", "2026-11-16T09:45:00-05:00");
assert.deepEqual(findFreeRooms(rooms, amenitiesById, expandDemoSlots(demo.slots, date("2026-11-16T12:00:00-05:00")), { window: mondayClass }).map((r) => r.id).sort(),
  [auditorium, breakoutStudy, classroom2].sort());
// A room with no amenities entry at all never matches, even with an empty query.
const noAmenities = { ...rooms[0], id: "other-building:other-room" };
assert.deepEqual(findFreeRooms([noAmenities], amenitiesById, [], { window: saturday }), []);
// Sorting: building title then room name, independent of input order (two rooms share the name
// "Classroom", so this also checks the sort is stable rather than just alphabetical-by-name).
const forward = findFreeRooms(rooms, amenitiesById, [], { window: saturday }).map((r) => r.id);
const reversed = findFreeRooms([...rooms].reverse(), amenitiesById, [], { window: saturday }).map((r) => r.id);
assert.deepEqual(reversed, forward, "input order does not change the result order");

// ---------- freeUntil / nowWindow: unchanged from the hand-fixture version (pure, data independent) ----------
const future = { room: id, start: "2026-11-16T13:00:00-05:00", end: "2026-11-16T14:00:00-05:00" };
assert.equal(freeUntil(id, [future, ...invalid, ...occupied], before.start)?.toISOString(), "2026-11-16T15:00:00.000Z");
assert.equal(freeUntil(id, [future, ...occupied], during.start)?.toISOString(), "2026-11-16T18:00:00.000Z", "ongoing slots excluded");
assert.equal(freeUntil(id, occupied, date(occupied[0].start)), null, "strictly after from");
assert.equal(freeUntil("other", occupied, before.start), null);
assert.equal(freeUntil(id, invalid, before.start), null);
assert.equal(freeUntil(id, occupied, new Date(NaN)), null);
const now = date("2026-03-08T06:50:00Z");
assert.equal(nowWindow(now).end.toISOString(), "2026-03-08T07:20:00.000Z", "default is 30 elapsed minutes across DST");
assert.equal(nowWindow(now, 60).end.getTime() - now.getTime(), 3_600_000);
assert.notEqual(nowWindow(now).start, now, "does not expose the input Date");
assert.deepEqual(findFreeRooms(rooms, amenitiesById, [], { window: nowWindow(now, -1) }), []);

// ---------- campusTimeToday / expandDemoSlots: DST edges ----------
assert.equal(campusTimeToday(new Date(NaN), "09:00"), null);
assert.equal(campusTimeToday(date("2026-11-16T12:00:00-05:00"), "25:00"), null);
assert.equal(campusTimeToday(date("2026-11-16T12:00:00-05:00"), "09:00")?.toISOString(), "2026-11-16T14:00:00.000Z");
const sunday = [{ room: id, weekday: "sun", start: "08:00", end: "20:00" }];
for (const [day, start, end] of [
  ["2026-03-08T05:30:00Z", "2026-03-08T12:00:00.000Z", "2026-03-09T00:00:00.000Z"],
  ["2026-11-01T04:30:00Z", "2026-11-01T13:00:00.000Z", "2026-11-02T01:00:00.000Z"],
]) {
  assert.deepEqual(expandDemoSlots(sunday, date(day)), [{ room: id, start, end }], "offset follows the booking time on DST day");
}
assert.deepEqual(expandDemoSlots([{ ...sunday[0], start: "02:15", end: "03:15" }], date("2026-03-08T12:00:00Z")), [], "spring gap skipped");
assert.equal(expandDemoSlots([{ ...sunday[0], start: "01:15", end: "01:45" }], date("2026-11-01T12:00:00Z"))[0].start, "2026-11-01T05:15:00.000Z", "fall fold uses earlier occurrence");
assert.deepEqual(expandDemoSlots(sunday, new Date(NaN)), []);
for (const [start, end] of [["25:00", "26:00"], ["8:00", "09:00"], ["20:00", "08:00"], ["08:00", "08:00"]]) {
  assert.deepEqual(expandDemoSlots([{ ...sunday[0], start, end }], date("2026-11-01T12:00:00Z")), []);
}

// ---------- purity: inputs are never mutated ----------
function freezeDeep(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === "object") freezeDeep(child);
  return value;
}
const query = { window: saturday };
const snapshot = JSON.stringify({ rooms, amenitiesById: [...amenitiesById], occupied, query });
freezeDeep(rooms); freezeDeep(occupied); freezeDeep(query);
for (const amenities of amenitiesById.values()) freezeDeep(amenities);
findFreeRooms(rooms, amenitiesById, occupied, query);
expandDemoSlots(demo.slots, now);
freeUntil(id, occupied, before.start);
nowWindow(query.window.start);
assert.equal(JSON.stringify({ rooms, amenitiesById: [...amenitiesById], occupied, query }), snapshot, "inputs stay unchanged");

console.log("Room finder self-check passed: boundaries, filters, sorting, invalid inputs, DST, demo-seed coverage and purity.");
