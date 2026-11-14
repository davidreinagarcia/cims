/** @file Dependency-free checks of room availability, fictional seed coverage and campus-local DST expansion. */
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
const { isRoomFree, findFreeRooms, freeUntil, nowWindow, expandDemoSlots } =
  await import("../src/indoor/availability.ts");
const { roomSelectionId } = await import("../src/indoor/types.ts");
const readFixture = (name) => JSON.parse(readFileSync(new URL(`../src/data/mocks/${name}.json`, import.meta.url), "utf8"));
const demo = readFixture("indoor-demo");
const seed = readFixture("availability-demo");
const date = (value) => new Date(value);
const window = (start, end) => ({ start: date(start), end: date(end) });
const id = roomSelectionId(demo.building_id, "d103");
const slot = (start, end, room = id) => ({ room, start, end });
const occupied = [slot("2026-11-16T10:00:00-05:00", "2026-11-16T11:00:00-05:00")];
const before = window("2026-11-16T09:00:00-05:00", "2026-11-16T10:00:00-05:00");
const during = window("2026-11-16T10:15:00-05:00", "2026-11-16T10:45:00-05:00");
assert.equal(isRoomFree(id, occupied, before), true, "touching start is free");
assert.equal(isRoomFree(id, occupied, window("2026-11-16T11:00:00-05:00", "2026-11-16T12:00:00-05:00")), true, "touching end is free");
assert.equal(isRoomFree(id, occupied, during), false, "contained query overlaps");
assert.equal(isRoomFree(id, occupied, window("2026-11-16T09:59:00-05:00", "2026-11-16T11:01:00-05:00")), false, "containing query overlaps");
assert.equal(isRoomFree(id, occupied, window("2026-11-16T09:59:00-05:00", "2026-11-16T10:01:00-05:00")), false, "partial overlap");
assert.equal(isRoomFree("demo-hall/d104", occupied, during), true, "slots belong to one room");
const invalid = [slot("invalid", occupied[0].end), slot(occupied[0].start, "invalid"),
  slot(occupied[0].end, occupied[0].start), slot(occupied[0].start, occupied[0].start)];
assert.equal(isRoomFree(id, invalid, during), true, "malformed and nonpositive slots are ignored");
assert.equal(isRoomFree(id, [...invalid, ...occupied], during), false);
for (const invalidWindow of [
  { start: during.end, end: during.start }, { start: during.start, end: during.start },
  { start: new Date(NaN), end: during.end }, { start: during.start, end: new Date(NaN) },
]) {
  assert.deepEqual(findFreeRooms([demo], [], { window: invalidWindow }), []);
  assert.equal(isRoomFree(id, [], invalidWindow), false);
}

const query = { window: during };
assert.equal(findFreeRooms([demo], [], query).length, 6, "only study rooms are bookable");
assert.equal(findFreeRooms([demo], occupied, query).length, 5);
assert.deepEqual(findFreeRooms([demo], [], { ...query, minCapacity: 7 }).map(({ room }) => room.id), ["d104", "d204"]);
assert.deepEqual(findFreeRooms([demo], [], { ...query, features: ["quiet", "outlets"] }).map(({ room }) => room.id), ["d103", "d203"], "all requested features required");
assert.deepEqual(findFreeRooms([demo], [], { ...query, features: ["quiet", "display"] }), []);
assert.deepEqual(findFreeRooms([demo], [], { ...query, buildingId: "other" }), []);
assert.equal(findFreeRooms([demo], [], { ...query, buildingId: demo.building_id, features: [] }).length, 6);

// Deliberately incomplete fictional room tests optional metadata without changing the fixture.
const missing = { ...demo.rooms.find((room) => room.id === "d103"), capacity: undefined, features: undefined };
assert.equal(findFreeRooms([{ ...demo, rooms: [missing] }], [], query).length, 1);
assert.deepEqual(findFreeRooms([{ ...demo, rooms: [missing] }], [], { ...query, minCapacity: 0 }), []);
assert.deepEqual(findFreeRooms([{ ...demo, rooms: [missing] }], [], { ...query, features: ["quiet"] }), []);
const sortedBuildings = [
  { ...demo, name: "Z Demo", rooms: [...demo.rooms].reverse() },
  { ...demo, building_id: "demo-a", name: "A Demo", rooms: [...demo.rooms].reverse() },
];
const sorted = findFreeRooms(sortedBuildings, [], query);
assert.deepEqual(sorted.map(({ building, room }) => `${building.name}/${room.number}`),
  ["A Demo", "Z Demo"].flatMap((name) => ["D103", "D104", "D109", "D203", "D204", "D209"].map((number) => `${name}/${number}`)));

const future = slot("2026-11-16T13:00:00-05:00", "2026-11-16T14:00:00-05:00");
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
assert.deepEqual(findFreeRooms([demo], [], { window: nowWindow(now, -1) }), []);

const sunday = [{ room: id, weekday: "sun", start: "08:00", end: "20:00" }];
for (const [day, start, end] of [
  ["2026-03-08T05:30:00Z", "2026-03-08T12:00:00.000Z", "2026-03-09T00:00:00.000Z"],
  ["2026-11-01T04:30:00Z", "2026-11-01T13:00:00.000Z", "2026-11-02T01:00:00.000Z"],
]) {
  assert.deepEqual(expandDemoSlots(sunday, date(day)), [{ room: id, start, end }], "offset follows the booking time on DST day");
}
assert.deepEqual(expandDemoSlots([{ ...sunday[0], start: "02:15", end: "03:15" }], date("2026-03-08T12:00:00Z")), [], "spring gap skipped");
assert.equal(expandDemoSlots([{ ...sunday[0], start: "01:15", end: "01:45" }], date("2026-11-01T12:00:00Z"))[0].start, "2026-11-01T05:15:00.000Z", "fall fold uses earlier occurrence");
assert.deepEqual(expandDemoSlots(sunday, date("2026-11-02T02:00:00Z")), [{ room: id, start: "2026-11-01T13:00:00.000Z", end: "2026-11-02T01:00:00.000Z" }], "campus date can differ from UTC date");
assert.deepEqual(expandDemoSlots(sunday, new Date(NaN)), []);
for (const [start, end] of [["25:00", "26:00"], ["8:00", "09:00"], ["20:00", "08:00"], ["08:00", "08:00"]]) {
  assert.deepEqual(expandDemoSlots([{ ...sunday[0], start, end }], date("2026-11-01T12:00:00Z")), []);
}

assert.equal(seed.demo, true);
assert.match(seed._note, /FICTIONAL demo data/);
const bookableIds = new Set(demo.rooms.filter((room) => room.bookable).map((room) => roomSelectionId(demo.building_id, room.id)));
for (const pattern of seed.slots) {
  assert.ok(bookableIds.has(pattern.room), "seed references an existing bookable demo room");
  assert.match(pattern.weekday, /^(mon|tue|wed|thu|fri|sat|sun)$/);
  assert.match(pattern.start, /^([01]\d|2[0-3]):[0-5]\d$/);
  assert.match(pattern.end, /^([01]\d|2[0-3]):[0-5]\d$/);
  assert.ok(pattern.end > pattern.start);
}
// Check every minute, including windows crossing the shorter bookings' boundaries.
for (const [month, offset, monday] of [["01", "-05:00", 5], ["07", "-04:00", 6]]) {
  for (let day = monday; day < monday + 5; day++) {
    const dayText = `2026-${month}-${String(day).padStart(2, "0")}`;
    const slots = expandDemoSlots(seed.slots, date(`${dayText}T12:00:00${offset}`));
    assert.ok(slots.length > 0);
    for (let minute = 8 * 60; minute < 20 * 60; minute++) {
      const start = date(`${dayText}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00${offset}`);
      const free = findFreeRooms([demo], slots, { window: nowWindow(start) });
      assert.ok(free.length > 0 && free.length < bookableIds.size, `both states at ${start.toISOString()}`);
    }
  }
}

function freezeDeep(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if (child && typeof child === "object") freezeDeep(child);
  return value;
}
const snapshot = JSON.stringify({ demo, seed, occupied, query });
freezeDeep(demo);
freezeDeep(seed);
freezeDeep(occupied);
freezeDeep(query);
findFreeRooms([demo], occupied, query);
expandDemoSlots(seed.slots, now);
freeUntil(id, occupied, before.start);
nowWindow(query.window.start);
assert.equal(JSON.stringify({ demo, seed, occupied, query }), snapshot, "inputs stay unchanged");
console.log("Availability self-check passed: boundaries, filters, sorting, invalid inputs, DST, seed coverage and purity.");
