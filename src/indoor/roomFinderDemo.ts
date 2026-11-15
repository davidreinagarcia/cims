/** @file Loads the Kendeda + CULC room finder/reservation demo seeds (F-11/F-20, T-24/T-60) and indexes them by selection id. */
import culcDemo from "../data/mocks/culc-room-reservation-demo.json";
import kendedaDemo from "../data/mocks/kendeda-room-finder-demo.json";
import type { AmenitiesById, DemoSlotPattern } from "./availability";
import type { RoomAmenities } from "./types";

interface RoomFinderDemoFile { demo: true; amenities: RoomAmenities[]; slots: DemoSlotPattern[] }

const files = [kendedaDemo, culcDemo] as unknown as RoomFinderDemoFile[];

/** Demo amenities (capacity, features, booking) keyed by room selection id. Always fictional (capacity is real for CULC; see the seed files' notes). */
export const roomAmenitiesById: AmenitiesById = new Map(files.flatMap((file) => file.amenities).map((item) => [item.room, item]));

/** Fictional weekly busy patterns, both buildings combined, to expand per day with `expandDemoSlots`. */
export const demoSlotPatterns: DemoSlotPattern[] = files.flatMap((file) => file.slots);
