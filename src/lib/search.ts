/** @file Ranked building, room and place search with accent folding and original-text match ranges. */
import type { Building } from "./buildings";
import { indoorRooms } from "../indoor/registry";
import type { PlaceFeature } from "./places";

/** A half-open character range in the original field, suitable for String.slice. */
export type MatchRange = [start: number, end: number];

/** A matching name, alias or category and its highlight ranges. */
export interface SearchMatch {
  field: "name" | "alias" | "category";
  text: string;
  ranges: MatchRange[];
}

/** A ranked place with an extensible group label and matches in displayable fields. */
export interface SearchResult {
  group: string;
  place: PlaceFeature;
  matches: SearchMatch[];
}

type Folded = { text: string; starts: number[]; ends: number[] };
type Hit = { rank: number; ranges: MatchRange[] };

function fold(value: string): Folded {
  const result: Folded = { text: "", starts: [], ends: [] };
  let offset = 0;
  for (const char of value) {
    const text = char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    for (let i = 0; i < text.length; i++) {
      result.starts.push(offset);
      result.ends.push(offset + char.length);
    }
    if (!text && result.ends.length) result.ends[result.ends.length - 1] = offset + char.length;
    result.text += text;
    offset += char.length;
  }
  return result;
}

function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  const merged: MatchRange[] = [];
  for (const [start, end] of ranges.sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

// Linear one-edit check, including an adjacent transposition, without a distance matrix.
function oneTypo(query: string, word: string): boolean {
  if (Math.abs(query.length - word.length) > 1) return false;
  let i = 0;
  while (i < query.length && query[i] === word[i]) i++;
  if (i === query.length) return true;
  if (query.length === word.length) {
    return query.slice(i + 1) === word.slice(i + 1)
      || (query[i] === word[i + 1] && query[i + 1] === word[i]
        && query.slice(i + 2) === word.slice(i + 2));
  }
  return query.length > word.length
    ? query.slice(i + 1) === word.slice(i)
    : query.slice(i) === word.slice(i + 1);
}

function matchField(query: string, target: Folded): Hit | null {
  const direct = target.text.indexOf(query);
  if (direct >= 0) {
    const rank = direct === 0 ? 0 : /[^\p{L}\p{N}]/u.test(target.text[direct - 1]) ? 1 : 2;
    return { rank, ranges: [[target.starts[direct], target.ends[direct + query.length - 1]]] };
  }
  const words = Array.from(target.text.matchAll(/[\p{L}\p{N}]+/gu));
  const tokens = query.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (!tokens.length) return null;
  let rank = 1;
  const ranges: MatchRange[] = [];
  for (const token of tokens) {
    let best: Hit | null = null;
    for (const word of words) {
      const text = word[0];
      const offset = word.index!;
      const index = text.indexOf(token);
      let hit: Hit | null = null;
      if (index >= 0) {
        hit = { rank: index === 0 ? 1 : 2, ranges: [[offset + index, offset + index + token.length]] };
      } else if (token.length >= 4) {
        const positions: MatchRange[] = [];
        let cursor = 0;
        for (const char of token) {
          cursor = text.indexOf(char, cursor);
          if (cursor < 0) break;
          positions.push([offset + cursor, offset + cursor + 1]);
          cursor++;
        }
        if (positions.length === token.length) hit = { rank: 3, ranges: positions };
        else if (oneTypo(token, text)) hit = { rank: 3, ranges: [[offset, offset + text.length]] };
      }
      if (hit && (!best || hit.rank < best.rank)) best = hit;
    }
    if (!best) return null;
    rank = Math.max(rank, best.rank);
    ranges.push(...best.ranges);
  }
  return {
    rank,
    ranges: mergeRanges(ranges.map(([start, end]) => [target.starts[start], target.ends[end - 1]])),
  };
}

/** Searches name, aliases and category; queries under two characters preserve the full input order. */
export function searchPlaces(query: string, items: readonly PlaceFeature[]): SearchResult[] {
  const q = fold(query.trim()).text.replace(/\s+/g, " ");
  if (q.length < 2) return items.map((place) => ({ group: "Places", place, matches: [] }));
  const results: { result: SearchResult; rank: number; index: number }[] = [];
  items.forEach((place, index) => {
    const { name, aliases = [], category } = place.properties;
    const fields: [SearchMatch["field"], string][] = [
      ["name", name], ...aliases.map((alias): ["alias", string] => ["alias", alias]), ["category", category],
    ];
    const matches: SearchMatch[] = [];
    let rank = Infinity;
    for (const [field, text] of fields) {
      const hit = matchField(q, fold(text));
      if (!hit) continue;
      // Category matches follow name/alias matches within each ranking tier.
      rank = Math.min(rank, hit.rank * 2 + (field === "category" ? 1 : 0));
      matches.push({ field, text, ranges: hit.ranges });
    }
    if (matches.length) results.push({ result: { group: "Places", place, matches }, rank, index });
  });
  return results.sort((a, b) => a.rank - b.rank || a.index - b.index).map(({ result }) => result);
}

/** A campus result selects its building, room or place directly. */
export interface CampusSearchResult {
  kind: "building" | "room" | "place";
  id: string;
  group: "Buildings" | "Rooms" | "Places";
  name: string;
  meta: string;
  matches: SearchMatch[];
}

/** Searches footprints and routable rooms alongside places, including building aliases in room queries. */
export function searchCampus(query: string, items: readonly PlaceFeature[], buildings: readonly Building[]): CampusSearchResult[] {
  const q = fold(query.trim()).text.replace(/\s+/g, " ");
  const candidates: (CampusSearchResult & { aliases: string[] })[] = [
    ...buildings.map((building) => ({ kind: "building" as const, id: building.id, group: "Buildings" as const,
      name: building.name ?? "Unnamed building", meta: building.aliases.join(", "), aliases: building.aliases, matches: [] })),
    ...indoorRooms().map(({ id, building, level, space }) => {
      const footprint = buildings.find((item) => item.id === building.building_id);
      return { kind: "room" as const, id, group: "Rooms" as const, name: space.name,
        meta: `${footprint?.aliases.find((alias) => alias.endsWith(" Building")) ?? footprint?.aliases[0] ?? building.title}, ${level.name}`,
        aliases: [building.title, footprint?.name ?? "", ...(footprint?.aliases ?? [])], matches: [] };
    }),
  ];
  const ranked = candidates.flatMap((candidate, index) => {
    const hit = q.length < 2 ? { rank: 0, ranges: [] } : matchField(q, fold([candidate.name, ...candidate.aliases].join(" ")));
    if (!hit) return [];
    const matches: SearchMatch[] = q.length < 2 ? [] : ([ ["name", candidate.name], ["category", candidate.meta] ] as const).map(([field, text]) => ({
      field, text, ranges: mergeRanges((q.match(/[\p{L}\p{N}]+/gu) ?? []).flatMap((token) => matchField(token, fold(text))?.ranges ?? [])),
    }));
    return [{ result: { ...candidate, matches }, rank: hit.rank, index }];
  }).sort((a, b) => a.rank - b.rank || a.index - b.index);
  return [
    ...ranked.filter(({ result }) => result.kind === "building").map(({ result }) => result),
    ...ranked.filter(({ result }) => result.kind === "room").map(({ result }) => result),
    ...searchPlaces(query, items).map(({ place, matches }) => ({ kind: "place" as const, id: place.properties.id,
      group: "Places" as const, name: place.properties.name, meta: place.properties.category, matches })),
  ];
}
