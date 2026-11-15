/** @file Buildings a reservation flow can target (T-60/T-62): the single source of truth for the room board's building chips. Only Kendeda and CULC have indoor data to show availability for. */

/** One quick-pick building: `enabled` buildings have a working reservation flow; the rest are real GT buildings shown as "Coming soon". */
export interface BuildingOption { id: string; label: string; aliases: string[]; enabled: boolean }

/**
 * Real Georgia Tech building ids/names verified in `src/data/buildings.geojson` -- see that file's
 * `id`/`name`/`aliases` for "dorothy-murray-crosland-tower", "scheller-college-of-business" and
 * "lettie-pate-whithead-evans-administration-building". Only Kendeda and CULC have indoor data
 * (src/data/indoor/) to actually show availability for; the other three are deliberately disabled
 * rather than invented, so the room board's building chips don't imply coverage we don't have.
 * `RoomsBoard.tsx` renders one chip per entry (enabled chips switch to that building's grid; disabled
 * chips show a "Coming soon" notice) -- the single list, reused everywhere a building needs picking.
 */
export const BUILDING_OPTIONS: BuildingOption[] = [
  { id: "kendeda-building-for-innovative-sustainable-design", label: "Kendeda", aliases: ["kendeda building", "kendeda building for innovative sustainable design"], enabled: true },
  { id: "g-wayne-clough-undergraduate-learning-commons", label: "CULC", aliases: ["clough", "clough undergraduate learning commons", "g. wayne clough undergraduate learning commons"], enabled: true },
  { id: "dorothy-murray-crosland-tower", label: "Crosland Tower", aliases: ["library east", "dorothy murray crosland tower"], enabled: false },
  { id: "scheller-college-of-business", label: "Scheller College of Business", aliases: ["coll. management"], enabled: false },
  { id: "lettie-pate-whithead-evans-administration-building", label: "Tech Tower", aliases: ["evans administration building", "lettie pate whithead evans administration building"], enabled: false },
];
