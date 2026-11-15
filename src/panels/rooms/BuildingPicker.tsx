/** @file Step 1 of reserving a room (T-60): search or quick-pick a building; only Kendeda and CULC have indoor data to book against. */
import { useState } from "react";

/** One quick-pick building: `enabled` buildings have a working reservation flow; the rest are real GT buildings shown as "Coming soon". */
interface BuildingOption { id: string; label: string; aliases: string[]; enabled: boolean }

/**
 * Real Georgia Tech building ids/names verified in `src/data/buildings.geojson` -- see that file's
 * `id`/`name`/`aliases` for "dorothy-murray-crosland-tower", "scheller-college-of-business" and
 * "lettie-pate-whithead-evans-administration-building". Only Kendeda and CULC have indoor data
 * (src/data/indoor/) to actually show availability for; the other three are deliberately disabled
 * rather than invented, so the picker doesn't imply coverage we don't have.
 */
const OPTIONS: BuildingOption[] = [
  { id: "kendeda-building-for-innovative-sustainable-design", label: "Kendeda", aliases: ["kendeda building", "kendeda building for innovative sustainable design"], enabled: true },
  { id: "g-wayne-clough-undergraduate-learning-commons", label: "CULC", aliases: ["clough", "clough undergraduate learning commons", "g. wayne clough undergraduate learning commons"], enabled: true },
  { id: "dorothy-murray-crosland-tower", label: "Crosland Tower", aliases: ["library east", "dorothy murray crosland tower"], enabled: false },
  { id: "scheller-college-of-business", label: "Scheller College of Business", aliases: ["coll. management"], enabled: false },
  { id: "lettie-pate-whithead-evans-administration-building", label: "Tech Tower", aliases: ["evans administration building", "lettie pate whithead evans administration building"], enabled: false },
];

/** Searches building name + aliases, case-insensitively. */
function matches(option: BuildingOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return option.label.toLowerCase().includes(q) || option.aliases.some((alias) => alias.includes(q));
}

/** Search bar + quick-pick chips for the two buildings with real indoor data; other GT buildings show as "Coming soon" instead of being hidden or invented. */
export default function BuildingPicker({ onPick }: { onPick: (buildingId: string) => void }) {
  const [query, setQuery] = useState("");
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const results = OPTIONS.filter((option) => matches(option, query));

  return (
    <div className="reserve-picker">
      <div className="cims-field">
        <input type="search" aria-label="Search a building to reserve a room in" placeholder="Search a building, e.g. Kendeda" value={query}
          onChange={(event) => { setQuery(event.target.value); setComingSoon(null); }} />
      </div>
      <div className="cims-chips" role="group" aria-label="Quick-pick a building">
        {results.map((option) => (
          <button key={option.id} type="button" className="cims-chip reserve-picker__chip"
            aria-disabled={!option.enabled}
            title={option.enabled ? undefined : "Coming soon -- no indoor data for this building yet"}
            onClick={() => (option.enabled ? onPick(option.id) : setComingSoon(option.label))}>
            {option.label}
            {!option.enabled && <span className="cims-tag cims-tag--alert">Coming soon</span>}
          </button>
        ))}
        {!results.length && <p className="cims-muted">No building matches "{query}".</p>}
      </div>
      <p className="cims-muted" role="status" aria-live="polite">
        {comingSoon
          ? `${comingSoon} is coming soon -- only Kendeda and CULC have indoor data to reserve rooms in yet.`
          : "Only Kendeda and CULC have real indoor data today; the rest of campus is on the roadmap."}
      </p>
    </div>
  );
}
