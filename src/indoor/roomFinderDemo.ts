/** @file Loads the Kendeda room finder demo seed (F-11/T-24) and indexes it by selection id. */
import kendedaDemo from "../data/mocks/kendeda-room-finder-demo.json";
import type { AmenitiesById, DemoSlotPattern } from "./availability";
import type { RoomAmenities } from "./types";

interface RoomFinderDemoFile { demo: true; amenities: RoomAmenities[]; slots: DemoSlotPattern[] }

const demo = kendedaDemo as unknown as RoomFinderDemoFile;

/** Demo amenities (capacity, features, booking) keyed by room selection id. Always fictional. */
export const roomAmenitiesById: AmenitiesById = new Map(demo.amenities.map((item) => [item.room, item]));

/** Fictional weekly busy patterns to expand per day with `expandDemoSlots`. */
export const demoSlotPatterns: DemoSlotPattern[] = demo.slots;
